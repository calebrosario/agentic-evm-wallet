import type { Chain, TransactionRequest, WalletClient, PublicClient, Address } from "viem";
import { http, createPublicClient, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, polygon } from "viem/chains";
import { KeyManager, type KeyStoreEntry } from "../key/keyManager";
import type {
  ExecuteTransactionParams,
  ExecutionOptions,
  ExecutionResult,
  ExecutorOptions,
  TransactionEvent
} from "./types";
import { TransactionStatus, ErrorCode, TransactionExecutionError } from "./types";

export class TransactionExecutor {
  private readonly keyManager: KeyManager;
  private readonly chains: Map<number, Chain> = new Map([
    [1, mainnet as Chain],
    [137, polygon as Chain]
  ]);
  private readonly defaultOptions: ExecutionOptions;
  private readonly enableEvents: boolean;
  private readonly eventListeners: Map<string, Set<(event: TransactionEvent) => void>> = new Map();

  constructor(options: {
    keyManager: KeyManager;
    defaultExecutionOptions?: ExecutionOptions;
    enableEvents?: boolean;
  }) {
    this.keyManager = options.keyManager;
    this.defaultOptions = options.defaultExecutionOptions || {};
    this.enableEvents = options.enableEvents !== false;
  }

  async executeTransaction(
    params: ExecuteTransactionParams,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const maxRetries = mergedOptions.maxRetries ?? 3;
    const initialBackoffMs = mergedOptions.initialBackoffMs ?? 1000;
    const maxBackoffMs = mergedOptions.maxBackoffMs ?? 10000;
    const confirmations = mergedOptions.confirmations ?? 1;
    const confirmationTimeoutMs = mergedOptions.confirmationTimeoutMs ?? 60000;

    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= maxRetries) {
      try {
        return await this.executeSingleAttempt(
          params,
          confirmations,
          confirmationTimeoutMs,
          retryCount
        );
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount <= maxRetries && this.shouldRetry(error as Error)) {
          const backoffMs = this.calculateBackoff(retryCount, initialBackoffMs, maxBackoffMs);
          await this.sleep(backoffMs);
          continue;
        }

        this.emitEvent({
          hash: "0x0" as `0x${string}`,
          status: TransactionStatus.Failed,
          timestamp: Date.now(),
          error: (error as Error).message
        });

        throw lastError;
      }
    }

    throw new TransactionExecutionError("Retry limit exceeded", ErrorCode.RetryLimitExceeded, {
      retries: maxRetries
    });
  }

  on(event: string, listener: (event: TransactionEvent) => void): void {
    if (!this.enableEvents) return;

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener: (event: TransactionEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private async executeSingleAttempt(
    params: ExecuteTransactionParams,
    confirmations: number,
    confirmationTimeoutMs: number,
    retryCount: number
  ): Promise<ExecutionResult> {
    this.validateTransaction(params);

    const chain = this.getChainConfig(params.chainId);
    const keyEntry = await this.getKey(params.keyId);

    this.emitEvent({
      hash: "0x0" as `0x${string}`,
      status: TransactionStatus.Pending,
      timestamp: Date.now()
    });

    this.emitEvent({
      hash: "0x0" as `0x${string}`,
      status: TransactionStatus.Signed,
      timestamp: Date.now()
    });

    const publicClient = this.createPublicClient(chain);
    const walletClient = this.createWalletClient(chain, keyEntry.privateKey);

    const { type: _, ...transactionWithoutType } = params.transaction as any;
    const hash = await walletClient.sendTransaction(transactionWithoutType);

    this.emitEvent({
      hash,
      status: TransactionStatus.Broadcasted,
      timestamp: Date.now()
    });

    const receipt = await this.waitForConfirmation(
      publicClient,
      hash,
      confirmations,
      confirmationTimeoutMs
    );

    this.emitEvent({
      hash,
      status: TransactionStatus.Confirmed,
      timestamp: Date.now()
    });

    return {
      hash,
      status: TransactionStatus.Confirmed,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      retries: retryCount
    };
  }

  private async waitForConfirmation(
    publicClient: PublicClient,
    hash: `0x${string}`,
    confirmations: number,
    timeoutMs: number
  ) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations
        });
        return receipt;
      } catch (error) {
        if (Date.now() - startTime >= timeoutMs) {
          throw new TransactionExecutionError(
            "Transaction confirmation timeout",
            ErrorCode.Timeout
          );
        }
        await this.sleep(1000);
      }
    }

    throw new TransactionExecutionError("Transaction confirmation timeout", ErrorCode.Timeout);
  }

  private validateTransaction(params: ExecuteTransactionParams): void {
    if (!params.transaction || Object.keys(params.transaction).length === 0) {
      throw new TransactionExecutionError(
        "Invalid transaction: transaction is empty",
        ErrorCode.InvalidTransaction
      );
    }

    if (!params.transaction.to) {
      throw new TransactionExecutionError(
        "Invalid transaction: missing 'to' address",
        ErrorCode.InvalidTransaction
      );
    }

    if (!this.isValidAddress(params.transaction.to)) {
      throw new TransactionExecutionError(
        "Invalid transaction: invalid 'to' address format",
        ErrorCode.InvalidTransaction
      );
    }

    if (params.transaction.gas !== undefined && params.transaction.gas <= 0n) {
      throw new TransactionExecutionError(
        "Invalid transaction: gas limit must be positive",
        ErrorCode.InvalidTransaction
      );
    }

    if (params.transaction.gasPrice !== undefined && params.transaction.gasPrice < 0n) {
      throw new TransactionExecutionError(
        "Invalid transaction: gas price cannot be negative",
        ErrorCode.InvalidTransaction
      );
    }
  }

  private async getKey(keyId: string): Promise<KeyStoreEntry> {
    const [chainId, address] = keyId.split(":");
    const key = this.keyManager.getKey(address as `0x${string}`, parseInt(chainId));
    if (!key) {
      throw new TransactionExecutionError("Key not found", ErrorCode.InvalidKey, { keyId });
    }
    return key;
  }

  private getChainConfig(chainId: number): Chain {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new TransactionExecutionError(
        "Invalid chain ID: " + chainId + ". Supported chains: 1 (Ethereum), 137 (Polygon)",
        ErrorCode.InvalidKey,
        { chainId }
      );
    }
    return chain;
  }

  private createPublicClient(chain: Chain): PublicClient {
    return createPublicClient({
      chain,
      transport: http()
    });
  }

  private createWalletClient(chain: Chain, privateKey: `0x${string}`): WalletClient {
    return createWalletClient({
      chain,
      account: privateKeyToAccount(privateKey),
      transport: http()
    });
  }

  private isValidAddress(address: Address): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private shouldRetry(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection")
    );
  }

  private calculateBackoff(
    retryCount: number,
    initialBackoffMs: number,
    maxBackoffMs: number
  ): number {
    const backoffMs = initialBackoffMs * Math.pow(2, retryCount - 1);
    return Math.min(backoffMs, maxBackoffMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private emitEvent(event: TransactionEvent): void {
    if (!this.enableEvents) return;

    const listeners = this.eventListeners.get(event.status);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      });
    }
  }
}
