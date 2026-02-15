import type { TransactionRequest, Chain } from "viem";

/**
 * Transaction execution parameters
 */
export interface ExecuteTransactionParams {
  /** Built transaction from TransactionBuilder */
  transaction: TransactionRequest;
  /** Chain ID for execution */
  chainId: number;
  /** Key ID for signing */
  keyId: string;
}

/**
 * Execution options for transaction execution
 */
export interface ExecutionOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds (default: 1000) */
  initialBackoffMs?: number;
  /** Maximum backoff delay in milliseconds (default: 10000) */
  maxBackoffMs?: number;
  /** Confirmation count required (default: 1) */
  confirmations?: number;
  /** Timeout for transaction confirmation in milliseconds (default: 60000) */
  confirmationTimeoutMs?: number;
}

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  /** Transaction is pending execution */
  Pending = "pending",
  /** Transaction has been signed */
  Signed = "signed",
  /** Transaction has been broadcasted */
  Broadcasted = "broadcasted",
  /** Transaction has been confirmed */
  Confirmed = "confirmed",
  /** Transaction failed */
  Failed = "failed"
}

/**
 * Transaction event data
 */
export interface TransactionEvent {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Current transaction status */
  status: TransactionStatus;
  /** Timestamp of event */
  timestamp: number;
  /** Error if transaction failed */
  error?: string;
}

/**
 * Transaction execution result
 */
export interface ExecutionResult {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Final transaction status */
  status: TransactionStatus;
  /** Transaction block number (if confirmed) */
  blockNumber?: bigint;
  /** Gas used by transaction (if confirmed) */
  gasUsed?: bigint;
  /** Effective gas price (if confirmed) */
  effectiveGasPrice?: bigint;
  /** Error message if transaction failed */
  error?: string;
  /** Number of retries attempted */
  retries: number;
}

/**
 * TransactionExecutor configuration options
 */
export interface ExecutorOptions {
  /** Default execution options */
  defaultExecutionOptions?: ExecutionOptions;
  /** Enable event emission (default: true) */
  enableEvents?: boolean;
}

/**
 * Retry policy for failed transactions
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial backoff delay in milliseconds */
  initialBackoffMs: number;
  /** Maximum backoff delay in milliseconds */
  maxBackoffMs: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
}

/**
 * Error types for transaction execution
 */
export class TransactionExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TransactionExecutionError";
  }
}

/**
 * Transaction execution error codes
 */
export enum ErrorCode {
  /** Transaction signing failed */
  SigningFailed = "SIGNING_FAILED",
  /** Transaction broadcasting failed */
  BroadcastingFailed = "BROADCASTING_FAILED",
  /** Transaction confirmation failed */
  ConfirmationFailed = "CONFIRMATION_FAILED",
  /** Transaction validation failed */
  ValidationFailed = "VALIDATION_FAILED",
  /** Retry limit exceeded */
  RetryLimitExceeded = "RETRY_LIMIT_EXCEEDED",
  /** Transaction timeout */
  Timeout = "TIMEOUT",
  /** Invalid key */
  InvalidKey = "INVALID_KEY",
  /** Invalid transaction */
  InvalidTransaction = "INVALID_TRANSACTION"
}
