import type { KeyStoreEntry } from "../key/keyManager";
import { TransactionExecutor } from "../execution/transactionExecutor";
import type {
  ExecuteTransactionParams,
  ExecutionOptions,
  ExecutionResult
} from "../execution/types";
import type { AgentConfig, AgentInfo, Task, TaskPayload, TaskResult } from "./types";
import { TaskStatus, AgentStatus, AgentErrorCode, AgentManagerError } from "./types";

export class Agent {
  private status: AgentStatus = AgentStatus.Idle;
  private currentTasks: Map<string, Task> = new Map();
  private completedTasks: number = 0;
  private failedTasks: number = 0;
  private lastActive: number = Date.now();

  constructor(
    private config: AgentConfig,
    private keyEntry: KeyStoreEntry,
    private executor: TransactionExecutor,
    private eventHandler?: (event: {
      agentId: string;
      event: string;
      timestamp: number;
      data?: unknown;
    }) => void
  ) {
    this.emitEvent("agent_created", { config: this.config });
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getInfo(): AgentInfo {
    return {
      id: this.config.id,
      name: this.config.name,
      chainId: this.config.chainId,
      address: this.keyEntry.address,
      status: this.status,
      currentTasks: this.currentTasks.size,
      maxConcurrentTasks: this.config.maxConcurrentTasks || 3,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      lastActive: this.lastActive,
      capabilities: this.config.capabilities
    };
  }

  isAvailable(): boolean {
    const maxTasks = this.config.maxConcurrentTasks || 3;
    return this.status === AgentStatus.Idle && this.currentTasks.size < maxTasks;
  }

  hasCapability(capability: string): boolean {
    return this.config.capabilities.includes(capability);
  }

  canExecuteTask(task: Task): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    for (const dependency of task.dependencies) {
      if (this.currentTasks.has(dependency)) {
        return false;
      }
    }

    return true;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    if (!this.canExecuteTask(task)) {
      throw new AgentManagerError(
        "Agent cannot execute task",
        AgentErrorCode.TaskSchedulingFailed,
        {
          agentId: this.config.id,
          taskId: task.id
        }
      );
    }

    const maxTasks = this.config.maxConcurrentTasks || 3;
    if (this.currentTasks.size >= maxTasks) {
      throw new AgentManagerError(
        "Agent at maximum capacity",
        AgentErrorCode.TaskSchedulingFailed,
        {
          agentId: this.config.id,
          taskId: task.id
        }
      );
    }

    this.currentTasks.set(task.id, task);
    this.status = AgentStatus.Busy;
    this.lastActive = Date.now();

    this.emitEvent("task_assigned", { taskId: task.id, task: task.name });

    const startTime = Date.now();
    let result: unknown;
    let error: string | undefined;

    try {
      result = await this.executeTaskPayload(task.payload);

      this.completedTasks++;
      this.lastActive = Date.now();

      if (this.currentTasks.size === 0) {
        this.status = AgentStatus.Idle;
      }

      this.emitEvent("task_completed", { taskId: task.id, result });

      return {
        taskId: task.id,
        agentId: this.config.id,
        status: TaskStatus.Completed,
        result,
        retries: 0,
        startedAt: startTime,
        completedAt: Date.now()
      };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      this.failedTasks++;
      this.status = AgentStatus.Error;
      this.lastActive = Date.now();

      this.emitEvent("task_failed", { taskId: task.id, error });

      return {
        taskId: task.id,
        agentId: this.config.id,
        status: TaskStatus.Failed,
        error,
        retries: 0,
        startedAt: startTime,
        completedAt: Date.now()
      };
    } finally {
      this.currentTasks.delete(task.id);
    }
  }

  private async executeTaskPayload(payload: TaskPayload): Promise<unknown> {
    if (payload.type === "transaction") {
      return await this.executeTransaction(payload);
    }

    if (payload.type === "custom") {
      return await this.executeCustomTask(payload);
    }

    throw new AgentManagerError("Unknown task type", AgentErrorCode.TaskExecutionFailed, {
      agentId: this.config.id
    });
  }

  private async executeTransaction(payload: {
    type: "transaction";
    transaction: any;
    chainId: number;
    keyId: string;
  }): Promise<ExecutionResult> {
    const params: ExecuteTransactionParams = {
      transaction: payload.transaction,
      chainId: payload.chainId,
      keyId: payload.keyId
    };

    const options: ExecutionOptions = {};

    return await this.executor.executeTransaction(params, options);
  }

  private async executeCustomTask(payload: {
    type: "custom";
    action: string;
    params: Record<string, unknown>;
  }): Promise<unknown> {
    throw new AgentManagerError(
      "Custom tasks not yet implemented",
      AgentErrorCode.TaskExecutionFailed,
      {
        agentId: this.config.id,
        action: payload.action
      }
    );
  }

  private emitEvent(event: string, data?: unknown): void {
    if (this.eventHandler) {
      try {
        this.eventHandler({
          agentId: this.config.id,
          event,
          timestamp: Date.now(),
          data
        });
      } catch (err) {
        console.error("Error in agent event handler:", err);
      }
    }
  }
}
