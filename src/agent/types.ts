import type { Address } from "viem";
import type { TransactionRequest } from "viem";
import type { Chain } from "viem";

export interface AgentConfig {
  id: string;
  name: string;
  chainId: number;
  keyId: string;
  maxConcurrentTasks?: number;
  capabilities: string[];
}

export enum AgentStatus {
  Idle = "idle",
  Busy = "busy",
  Offline = "offline",
  Error = "error"
}

export interface AgentInfo {
  id: string;
  name: string;
  chainId: number;
  address: Address;
  status: AgentStatus;
  currentTasks: number;
  maxConcurrentTasks: number;
  completedTasks: number;
  failedTasks: number;
  eventHandlerErrors: number;
  lastActive: number;
  capabilities: string[];
}

export interface AgentEvent {
  agentId: string;
  eventType:
    | "status_change"
    | "task_assigned"
    | "task_completed"
    | "task_failed"
    | "task_timeout"
    | "task_retry"
    | "agent_created"
    | "agent_removed";
  timestamp: number;
  data?: unknown;
}

export enum TaskPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3
}

export enum TaskStatus {
  Pending = "pending",
  Queued = "queued",
  Scheduled = "scheduled",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
  Timeout = "timeout"
}

export interface TransactionTask {
  type: "transaction";
  transaction: TransactionRequest;
  chainId: number;
  keyId: string;
}

export interface CustomTask {
  type: "custom";
  action: string;
  params: Record<string, unknown>;
}

export type TaskPayload = TransactionTask | CustomTask;

/**
 * Configuration for task retry behavior.
 *
 * @example
 * ```typescript
 * const task: Task = {
 *   ...
 *   retryPolicy: {
 *     maxRetries: 3,        // Retry up to 3 times after initial failure
 *     baseDelayMs: 1000,   // Start with 1 second delay
 *     maxDelayMs: 30000,   // Cap delay at 30 seconds
 *     retryableErrors: [     // Only retry these specific errors
 *       AgentErrorCode.TaskTimeout
 *     ]
 *   }
 * };
 * ```
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts after initial failure.
   * Default: 0 (no retries)
   *
   * If task fails and retries are not exhausted, task will be retried.
   * Exponential backoff is applied: delay = baseDelayMs * 2^(attempt - 1)
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds for exponential backoff.
   * Default: 1000ms (1 second)
   *
   * Delay formula: delay = baseDelayMs * Math.pow(2, attempt - 1)
   * Delay is capped at maxDelayMs to prevent excessive waits.
   */
  baseDelayMs?: number;

  /**
   * Maximum delay cap in milliseconds.
   * Default: 30000ms (30 seconds)
   *
   * Prevents exponential backoff from producing excessively long delays.
   */
  maxDelayMs?: number;

  /**
   * List of error codes that should trigger retry.
   * Default: [AgentErrorCode.TaskTimeout]
   *
   * Only errors in this list will be retried. Other errors will fail immediately.
   */
  retryableErrors?: AgentErrorCode[];
}

export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  payload: TaskPayload;
  dependencies: string[];
  timeoutMs?: number;
  retries?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
  createdAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  result?: unknown;
  error?: string;
  retries: number;
  startedAt: number;
  completedAt: number;
}

export interface TaskEvent {
  taskId: string;
  agentId?: string;
  eventType:
    | "created"
    | "queued"
    | "scheduled"
    | "started"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  timestamp: number;
  data?: unknown;
}

export interface AgentManagerConfig {
  maxConcurrentAgents?: number;
  defaultAgentCapabilities?: string[];
  enableEvents?: boolean;
}

export interface ScheduleTaskParams {
  task: Task;
  assignToAgent?: string;
  priority?: TaskPriority;
}

export interface TaskQueueStats {
  pending: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

export interface AgentManagerStats {
  agents: {
    total: number;
    idle: number;
    busy: number;
    offline: number;
    error: number;
  };
  tasks: TaskQueueStats;
  uptime: number;
}

export type AgentErrorDetails =
  | { agentId: string }
  | { taskId: string }
  | { config: Record<string, unknown> }
  | Record<string, unknown>;

export class AgentManagerError extends Error {
  constructor(
    message: string,
    public readonly code: AgentErrorCode,
    public readonly details?: AgentErrorDetails
  ) {
    super(message);
    this.name = "AgentManagerError";
  }
}

export enum AgentErrorCode {
  AgentNotFound = "AGENT_NOT_FOUND",
  AgentAlreadyExists = "AGENT_ALREADY_EXISTS",
  InvalidAgentConfig = "INVALID_AGENT_CONFIG",
  TaskNotFound = "TASK_NOT_FOUND",
  TaskAlreadyExists = "TASK_ALREADY_EXISTS",
  TaskSchedulingFailed = "TASK_SCHEDULING_FAILED",
  TaskExecutionFailed = "TASK_EXECUTION_FAILED",
  TaskTimeout = "TASK_TIMEOUT",
  NoAvailableAgents = "NO_AVAILABLE_AGENTS",
  InvalidTaskDependency = "INVALID_TASK_DEPENDENCY",
  CircularDependency = "CIRCULAR_DEPENDENCY"
}
