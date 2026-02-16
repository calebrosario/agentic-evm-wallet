import type { Chain, TransactionRequest, WalletClient, PublicClient, Address } from "viem";
import { isAddress, http, createPublicClient, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, polygon } from "viem/chains";
import { KeyManager, type KeyStoreEntry } from "../key/keyManager";
import type {
  ExecuteTransactionParams,
  ExecutionOptions,
  ExecutionResult,
  ExecutorOptions,
  TransactionEvent,
  RetryPolicy
} from "./types";
import { TransactionStatus, ErrorCode, TransactionExecutionError } from "./types";

// Default execution constants
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 10000;
const DEFAULT_CONFIRMATIONS = 1;
const DEFAULT_CONFIRMATION_TIMEOUT_MS = 60000;
const DEFAULT_SLEEP_POLL_MS = 1000;
const DUMMY_HASH = "0x0" as const;

// Transaction validation limits
const MAX_GAS_LIMIT = 30_000_000n; // 30M gas limit
const MAX_VALUE = 1_000_000n * 10n ** 18n; // 1M ETH max value
const MAX_DATA_LENGTH = 1_000_000; // 1MB max data size

// Default retry policy
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: DEFAULT_MAX_RETRIES,
  initialBackoffMs: DEFAULT_INITIAL_BACKOFF_MS,
  maxBackoffMs: DEFAULT_MAX_BACKOFF_MS,
  backoffMultiplier: 2.0
};

export class TransactionExecutor {
  private readonly keyManager: KeyManager;
  private readonly chains: Map<number, Chain>;
  private readonly rpcUrls: Record<number, string> | undefined;
  private readonly defaultOptions: ExecutionOptions;
  private readonly enableEvents: boolean;
  private readonly eventListeners: Map<string, Set<(event: TransactionEvent) => void>> = new Map();

  constructor(options: {
    keyManager: KeyManager;
    defaultExecutionOptions?: ExecutionOptions;
    enableEvents?: boolean;
    chains?: Map<number, Chain>;
    rpcUrls?: Record<number, string>;
  }) {
    this.keyManager = options.keyManager;
    this.chains =
      options.chains ||
      new Map([
        [1, mainnet as Chain],
        [137, polygon as Chain]
      ]);
    this.rpcUrls = options.rpcUrls;
    this.defaultOptions = options.defaultExecutionOptions || {};
    this.enableEvents = options.enableEvents !== false;
  }

  async executeTransaction(
    params: ExecuteTransactionParams,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const maxRetries = mergedOptions.maxRetries ?? DEFAULT_MAX_RETRIES;
    const initialBackoffMs = mergedOptions.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    const maxBackoffMs = mergedOptions.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    const confirmations = mergedOptions.confirmations ?? DEFAULT_CONFIRMATIONS;
    const confirmationTimeoutMs =
      mergedOptions.confirmationTimeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS;

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

    const { type: _type, ...transactionWithoutType } = params.transaction;

    const hash = await this.broadcastTransaction(walletClient, transactionWithoutType);

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

  private async broadcastTransaction(walletClient: any, transaction: any): Promise<`0x${string}`> {
    return await walletClient.sendTransaction(transaction);
  }

  private async waitForConfirmation(
    publicClient: PublicClient,
    hash: `0x${string}`,
    confirmations: number,
    timeoutMs: number
  ) {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new TransactionExecutionError("Transaction confirmation timeout", ErrorCode.Timeout)
        );
      }, timeoutMs);
    });

    const receiptPromise = publicClient.waitForTransactionReceipt({
      hash,
      confirmations
    });

    try {
      return await Promise.race([receiptPromise, timeoutPromise]);
    } catch (error) {
      if ((error as Error).message.includes("timeout")) {
        throw new TransactionExecutionError("Transaction confirmation timeout", ErrorCode.Timeout);
      }
      throw error;
    }
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
        "Invalid transaction: invalid 'to' address format (must be valid checksummed address)",
        ErrorCode.InvalidTransaction
      );
    }

    if (params.transaction.gas !== undefined) {
      if (params.transaction.gas <= 0n) {
        throw new TransactionExecutionError(
          "Invalid transaction: gas limit must be positive",
          ErrorCode.InvalidTransaction
        );
      }
      if (params.transaction.gas > MAX_GAS_LIMIT) {
        throw new TransactionExecutionError(
          `Invalid transaction: gas limit exceeds maximum of ${MAX_GAS_LIMIT}`,
          ErrorCode.InvalidTransaction
        );
      }
    }

    if (params.transaction.gasPrice !== undefined && params.transaction.gasPrice < 0n) {
      throw new TransactionExecutionError(
        "Invalid transaction: gas price cannot be negative",
        ErrorCode.InvalidTransaction
      );
    }

    if (params.transaction.value !== undefined && params.transaction.value > MAX_VALUE) {
      throw new TransactionExecutionError(
        `Invalid transaction: value exceeds maximum of ${MAX_VALUE}`,
        ErrorCode.InvalidTransaction
      );
    }

    if (params.transaction.data !== undefined) {
      const dataLength = (params.transaction.data as string).length / 2 - 1;
      if (dataLength > MAX_DATA_LENGTH) {
        throw new TransactionExecutionError(
          `Invalid transaction: data exceeds maximum length of ${MAX_DATA_LENGTH} bytes`,
          ErrorCode.InvalidTransaction
        );
      }
    }
  }

  private async getKey(keyId: string): Promise<KeyStoreEntry> {
    const [chainId, address] = keyId.split(":");
    if (!chainId || !address) {
      throw new TransactionExecutionError(
        "Invalid key ID format: expected 'chainId:address'",
        ErrorCode.InvalidKey,
        { keyId }
      );
    }

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
        `Invalid chain ID: ${chainId}. Configure this chain in the constructor.`,
        ErrorCode.InvalidKey,
        { chainId }
      );
    }
    return chain;
  }

  private createPublicClient(chain: Chain): PublicClient {
    const rpcUrl = this.rpcUrls?.[chain.id];
    return createPublicClient({
      chain,
      transport: rpcUrl ? http(rpcUrl) : http()
    });
  }

  private createWalletClient(chain: Chain, privateKey: `0x${string}`): WalletClient {
    const rpcUrl = this.rpcUrls?.[chain.id];
    return createWalletClient({
      chain,
      account: privateKeyToAccount(privateKey),
      transport: rpcUrl ? http(rpcUrl) : http()
    });
  }

  private isValidAddress(address: Address): boolean {
    try {
      return (isAddress as (address: string) => boolean)(address);
    } catch {
      return false;
    }
  }

  private shouldRetry(error: Error): boolean {
    if (error instanceof TransactionExecutionError) {
      const noRetryCodes = [
        ErrorCode.InvalidKey,
        ErrorCode.InvalidTransaction,
        ErrorCode.ValidationFailed
      ];
      if (noRetryCodes.includes(error.code)) {
        return false;
      }

      const retryCodes = [ErrorCode.BroadcastingFailed, ErrorCode.ConfirmationFailed];
      if (retryCodes.includes(error.code)) {
        return true;
      }
    }

    const errorMessage = error.message.toLowerCase();
    const transientIndicators = ["network", "timeout", "connection"];
    const noRetryIndicators = ["invalid signature", "nonce too low", "insufficient funds"];

    const isTransient = transientIndicators.some((indicator) => errorMessage.includes(indicator));
    const isNonRetriable = noRetryIndicators.some((indicator) => errorMessage.includes(indicator));

    return isTransient && !isNonRetriable;
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
