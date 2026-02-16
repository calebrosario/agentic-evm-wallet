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

  /**
   * Executes a transaction with retry logic and event emission.
   *
   * This is the main entry point for transaction execution. It handles the complete
   * transaction lifecycle: validation, signing, broadcasting, and confirmation waiting.
   * Includes exponential backoff retry logic for transient failures and emits events
   * for transaction status changes.
   *
   * @param params - Transaction execution parameters
   * @param params.keyId - Key identifier in format "chainId:address"
   * @param params.chainId - Chain ID for the transaction
   * @param params.transaction - Transaction request object (to, value, data, gas, etc.)
   * @param options - Optional execution settings to override defaults
   * @param options.maxRetries - Maximum number of retry attempts (default: 3)
   * @param options.initialBackoffMs - Initial backoff in milliseconds (default: 1000)
   * @param options.maxBackoffMs - Maximum backoff in milliseconds (default: 10000)
   * @param options.confirmations - Number of confirmations to wait for (default: 1)
   * @param options.confirmationTimeoutMs - Timeout for confirmation in ms (default: 60000)
   * @returns Promise resolving to execution result with transaction details
   * @throws {TransactionExecutionError} If transaction execution fails after all retries
   * @throws {TransactionExecutionError} If validation fails
   * @throws {TransactionExecutionError} If retry limit is exceeded
   *
   * @example
   * ```ts
   * const result = await executor.executeTransaction(
   *   {
   *     keyId: "1:0x123...",
   *     chainId: 1,
   *     transaction: {
   *       to: "0x456...",
   *       value: 1000000000000000000n
   *     }
   *   },
   *   { maxRetries: 5 }
   * );
   * console.log(result.hash); // "0xabc..."
   * ```
   */
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

  /**
   * Registers an event listener for transaction status events.
   *
   * Subscribes to transaction lifecycle events such as Pending, Signed, Broadcasted,
   * Confirmed, or Failed. Useful for monitoring transaction progress and reacting to
   * status changes in real-time.
   *
   * @param event - Event name matching TransactionStatus (e.g., "Pending", "Confirmed", "Failed")
   * @param listener - Callback function that receives TransactionEvent object
   * @param listener.hash - Transaction hash (may be "0x0" for early events)
   * @param listener.status - Current transaction status
   * @param listener.timestamp - Unix timestamp in milliseconds
   * @param listener.error - Optional error message if status is "Failed"
   *
   * @example
   * ```ts
   * executor.on("Confirmed", (event) => {
   *   console.log(`Transaction ${event.hash} confirmed at block ${event.blockNumber}`);
   * });
   *
   * executor.on("Failed", (event) => {
   *   console.error(`Transaction failed: ${event.error}`);
   * });
   * ```
   */
  on(event: string, listener: (event: TransactionEvent) => void): void {
    if (!this.enableEvents) return;

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Removes an event listener for transaction status events.
   *
   * Unsubscribes a previously registered event listener. If no listeners remain
   * for the given event, the event is automatically cleaned up. This is important
   * for preventing memory leaks in long-running applications.
   *
   * @param event - Event name matching TransactionStatus (e.g., "Pending", "Confirmed", "Failed")
   * @param listener - The same callback function that was previously registered via `on()`
   *
   * @example
   * ```ts
   * // Register listener
   * const listener = (event) => console.log(event.status);
   * executor.on("Confirmed", listener);
   *
   * // Later, unregister to prevent memory leaks
   * executor.off("Confirmed", listener);
   * ```
   */
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
