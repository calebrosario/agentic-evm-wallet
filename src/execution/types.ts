import type { TransactionRequest, Chain, Address } from "viem";

export interface ValidatedTransactionRequest extends Omit<TransactionRequest, "to"> {
  to: Address;
}

export interface ExecuteTransactionParams {
  transaction: TransactionRequest;
  chainId: number;
  keyId: string;
}

export interface ExecutionOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  confirmations?: number;
  confirmationTimeoutMs?: number;
}

export enum TransactionStatus {
  Pending = "pending",
  Signed = "signed",
  Broadcasted = "broadcasted",
  Confirmed = "confirmed",
  Failed = "failed"
}

export interface TransactionEvent {
  hash: `0x${string}`;
  status: TransactionStatus;
  timestamp: number;
  error?: string;
}

export interface ExecutionResult {
  hash: `0x${string}`;
  status: TransactionStatus;
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  error?: string;
  retries: number;
}

export interface ExecutorOptions {
  defaultExecutionOptions?: ExecutionOptions;
  enableEvents?: boolean;
  chains?: Map<number, Chain>;
  rpcUrls?: Record<number, string>;
}

export interface RetryPolicy {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

export type ErrorDetails =
  | { retries: number }
  | { keyId: string }
  | { chainId: number }
  | { validationError: string }
  | Record<string, unknown>;

export class TransactionExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: ErrorDetails
  ) {
    super(message);
    this.name = "TransactionExecutionError";
  }
}

export enum ErrorCode {
  SigningFailed = "SIGNING_FAILED",
  BroadcastingFailed = "BROADCASTING_FAILED",
  ConfirmationFailed = "CONFIRMATION_FAILED",
  ValidationFailed = "VALIDATION_FAILED",
  RetryLimitExceeded = "RETRY_LIMIT_EXCEEDED",
  Timeout = "TIMEOUT",
  InvalidKey = "INVALID_KEY",
  InvalidTransaction = "INVALID_TRANSACTION"
}
