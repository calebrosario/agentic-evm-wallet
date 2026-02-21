// Wallet Management
export { WalletManager } from "./wallet/walletManager";
export type { AgentWallet } from "./wallet/walletManager";

// Key Management (Security-Critical)
export { KeyManager } from "./key/keyManager";
export type {
  KeyStoreEntry,
  GenerateKeyParams,
  ImportKeyParams,
  ExportKeyParams,
  SignTransactionParams,
  SignedTransaction
} from "./key/keyManager";

// Chain Configuration (Top 10 EVM chains)
export {
  getChain,
  getChainConfig,
  getAllChains,
  getAllSupportedChainIds,
  isChainSupported,
  getChainOrThrow
} from "./chains/chainConfig";
export {
  validateChainId,
  getChainMetadata,
  formatAddress,
  getBlockExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
  getAllChainInfo
} from "./chains/registry";
export type { ChainNativeCurrency, ChainConfig, SupportedChainId } from "./chains/types";

// Transaction Execution with Retry & Exponential Backoff
export { TransactionExecutor } from "./execution/transactionExecutor";
export type {
  ValidatedTransactionRequest,
  ExecuteTransactionParams,
  ExecutionOptions,
  TransactionStatus,
  TransactionEvent,
  ExecutionResult,
  ExecutorOptions,
  RetryPolicy,
  ErrorDetails
} from "./execution/types";
export { TransactionExecutionError, ErrorCode } from "./execution/types";

// Gas Estimation & Optimization
export { GasManager } from "./gas/gasManager";
export type { GasEstimateParams, GasPriceResult, OperationType } from "./gas/gasManager";

// Transaction Building & Validation
export { TransactionBuilder, transactionBuilder } from "./transactions/transactionBuilder";
export type { BuildTransactionParams } from "./transactions/transactionBuilder";

// Agent Orchestration
export { Agent } from "./agent/agent";
export { AgentManager } from "./agent/agentManager";
export { TaskQueue } from "./agent/taskQueue";
export type {
  AgentConfig,
  AgentInfo,
  AgentEvent,
  AgentStatus,
  TaskPriority,
  TaskStatus,
  TransactionTask,
  CustomTask,
  TaskPayload,
  Task,
  TaskResult,
  TaskEvent,
  RetryPolicy as AgentRetryPolicy,
  AgentManagerConfig,
  ScheduleTaskParams,
  TaskQueueStats,
  AgentManagerStats,
  AgentErrorDetails,
  AgentErrorCode,
  AgentManagerError
} from "./agent/types";

// MCP (Model Context Protocol) Server - Zod schemas
export {
  ChainIdSchema,
  AddressSchema,
  PrivateKeySchema,
  HexStringSchema,
  TOOL_NAMES
} from "./mcp/types";
export type { ToolName } from "./mcp/types";
export { WalletTools } from "./mcp/tools";

// Re-export commonly used Viem types
export type {
  Address,
  Chain,
  Hash,
  BlockNumber,
  BlockTag,
  Transaction,
  TransactionRequest,
  TransactionReceipt,
  Hex
} from "viem";
