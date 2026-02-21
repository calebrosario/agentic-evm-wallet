import type { Chain } from "viem";
import type { KeyStoreEntry } from "../key/keyManager";
import { KeyManager } from "../key/keyManager";
import { TransactionExecutor } from "../execution/transactionExecutor";
import { TaskQueue } from "./taskQueue";
import { Agent } from "./agent";
import { getChain, getAllSupportedChainIds } from "@/chains/chainConfig";
import type {
  AgentConfig,
  AgentInfo,
  AgentManagerConfig,
  AgentManagerStats,
  ScheduleTaskParams,
  Task,
  TaskResult,
  TaskEvent
} from "./types";
import { AgentStatus, TaskStatus, TaskPriority, AgentErrorCode, AgentManagerError } from "./types";

const DEFAULT_MAX_CONCURRENT_AGENTS = 10;
const MANAGER_START_TIME = Date.now();
const SCHEDULER_INTERVAL_MS = 1000;

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: TaskQueue = new TaskQueue();

  private keyManager: KeyManager;
  private transactionExecutor: TransactionExecutor;

  private enableEvents: boolean;
  private eventListeners: Map<
    string,
    Set<
      (
        event: TaskEvent | { agentId: string; event: string; timestamp: number; data?: unknown }
      ) => void
    >
  > = new Map();
  private eventListenerErrors: Map<string, number> = new Map();

  private isRunning: boolean = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentManagerConfig = {}) {
    this.keyManager = new KeyManager();
    this.transactionExecutor = new TransactionExecutor({
      keyManager: this.keyManager,
      enableEvents: true
    });

    this.enableEvents = config.enableEvents !== false;

    if (this.enableEvents) {
      this.startScheduler();
    }
  }
  /** Adds a new agent to the manager */

  addAgent(agentConfig: AgentConfig): AgentInfo {
    if (this.agents.has(agentConfig.id)) {
      throw new AgentManagerError("Agent already exists", AgentErrorCode.AgentAlreadyExists, {
        agentId: agentConfig.id
      });
    }

    const keyEntry = this.keyManager.generateKey({ chainId: agentConfig.chainId });
    const keyId = `${agentConfig.chainId}:${keyEntry.address}`;

    const config: AgentConfig = {
      ...agentConfig,
      keyId,
      maxConcurrentTasks: agentConfig.maxConcurrentTasks || 3
    };

    const agent = new Agent(config, keyEntry, this.transactionExecutor, (event) =>
      this.handleAgentEvent(event)
    );

    this.agents.set(config.id, agent);

    this.handleAgentEvent({
      agentId: config.id,
      event: "agent_created",
      timestamp: Date.now(),
      data: { agent: agent.getInfo() }
    });

    return agent.getInfo();
  }
  /** Removes an agent from the manager. Returns true if agent was removed, false if not found */

  removeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    this.agents.delete(agentId);

    this.handleAgentEvent({
      agentId,
      event: "agent_removed",
      timestamp: Date.now()
    });

    return true;
  }

  /** Gets an agent by ID. Returns undefined if not found */
  getAgent(agentId: string): AgentInfo | undefined {
    const agent = this.agents.get(agentId);
    return agent?.getInfo();
  }
  /** Returns information about all registered agents */

  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map((agent) => agent.getInfo());
  }

  /** Returns all available agents */
  getAvailableAgents(): AgentInfo[] {
    return this.getAllAgents().filter((info) => info.status === AgentStatus.Idle);
  }

  /** Schedules a task for execution */
  scheduleTask(params: ScheduleTaskParams): string {
    const task = params.task;

    if (this.taskQueue.getTask(task.id)) {
      throw new AgentManagerError("Task already exists", AgentErrorCode.TaskAlreadyExists, {
        taskId: task.id
      });
    }

    this.validateDependencies(task);

    this.taskQueue.addTask(task);
    this.taskQueue.updateTaskStatus(task.id, TaskStatus.Queued);

    this.emitTaskEvent({
      taskId: task.id,
      eventType: "queued",
      timestamp: Date.now()
    });

    if (params.assignToAgent) {
      this.assignTaskToAgent(task.id, params.assignToAgent);
    }

    return task.id;
  }
  /** Cancels a task. Returns true if task was cancelled, false if not found or already completed */

  cancelTask(taskId: string): boolean {
    if (!this.taskQueue.getTask(taskId)) {
      return false;
    }

    this.taskQueue.removeTask(taskId);
    this.taskQueue.updateTaskStatus(taskId, TaskStatus.Cancelled);

    this.emitTaskEvent({
      taskId,
      eventType: "cancelled",
      timestamp: Date.now()
    });

    return true;
  }
  /** Gets a task by ID. Returns undefined if not found */

  getTask(taskId: string): Task | undefined {
    return this.taskQueue.getTask(taskId);
  }

  /** Returns all tasks in the queue */
  getAllTasks(): Task[] {
    return this.taskQueue.getAllTasks();
  }

  /** Returns tasks by status */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.taskQueue.getTasksByStatus(status);
  }

  /** Returns tasks by priority */
  getTasksByPriority(priority: TaskPriority): Task[] {
    return this.taskQueue.getTasksByPriority(priority);
  }
  /** Returns manager statistics */

  getStats(): AgentManagerStats {
    const agents = this.getAllAgents();
    const tasks = this.taskQueue.getAllTasks();

    const agentStats = {
      total: agents.length,
      idle: agents.filter((a) => a.status === AgentStatus.Idle).length,
      busy: agents.filter((a) => a.status === AgentStatus.Busy).length,
      offline: agents.filter((a) => a.status === AgentStatus.Offline).length,
      error: agents.filter((a) => a.status === AgentStatus.Error).length
    };

    const taskStats = this.taskQueue.getStats();

    return {
      agents: agentStats,
      tasks: {
        pending: taskStats[TaskStatus.Pending] || 0,
        queued: taskStats[TaskStatus.Queued] || 0,
        running: taskStats[TaskStatus.Running] || 0,
        completed: taskStats[TaskStatus.Completed] || 0,
        failed: taskStats[TaskStatus.Failed] || 0,
        cancelled: taskStats[TaskStatus.Cancelled] || 0,
        total: tasks.length
      },
      uptime: Date.now() - MANAGER_START_TIME
    };
  }

  async executeTask(taskId: string): Promise<TaskResult | undefined> {
    const task = this.taskQueue.getTask(taskId);
    if (!task) {
      throw new AgentManagerError("Task not found", AgentErrorCode.TaskNotFound, { taskId });
    }

    this.taskQueue.updateTaskStatus(taskId, TaskStatus.Running);

    const agent = this.findBestAgent(task);
    if (!agent) {
      this.taskQueue.updateTaskStatus(taskId, TaskStatus.Queued);
      throw new AgentManagerError("No available agents", AgentErrorCode.NoAvailableAgents, {
        taskId
      });
    }

    this.emitTaskEvent({
      taskId,
      agentId: agent.getId(),
      eventType: "started",
      timestamp: Date.now()
    });

    const result = await agent.executeTask(task);

    this.taskQueue.updateTaskStatus(taskId, result.status);

    return result;
  }
  /** Starts the task scheduling loop */

  startScheduler(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.schedulerInterval = setInterval(() => {
      this.scheduleNextTask();
    }, SCHEDULER_INTERVAL_MS);
  }
  /** Stops the task scheduling loop */

  stopScheduler(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private validateDependencies(task: Task): void {
    for (const dependency of task.dependencies) {
      const depTask = this.taskQueue.getTask(dependency);
      if (!depTask) {
        throw new AgentManagerError(
          "Task dependency not found",
          AgentErrorCode.InvalidTaskDependency,
          {
            taskId: task.id,
            dependency
          }
        );
      }
    }
  }

  private assignTaskToAgent(taskId: string, agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentManagerError("Agent not found", AgentErrorCode.AgentNotFound, { agentId });
    }

    const task = this.taskQueue.getTask(taskId);
    if (!task) {
      throw new AgentManagerError("Task not found", AgentErrorCode.TaskNotFound, { taskId });
    }

    if (!agent.canExecuteTask(task)) {
      throw new AgentManagerError(
        "Agent cannot execute task",
        AgentErrorCode.TaskSchedulingFailed,
        {
          agentId,
          taskId
        }
      );
    }
  }

  private findBestAgent(task: Task): Agent | undefined {
    const availableAgents = this.getAvailableAgents();

    for (const agentInfo of availableAgents) {
      const agent = this.agents.get(agentInfo.id);
      if (agent && agent.canExecuteTask(task)) {
        return agent;
      }
    }

    return undefined;
  }

  private scheduleNextTask(): void {
    const task = this.taskQueue.getNextTask();
    if (!task) {
      return;
    }

    const agent = this.findBestAgent(task);
    if (!agent) {
      return;
    }

    agent.executeTask(task).catch((err) => {
      console.error("Task execution failed:", err);
    });
  }

  private handleAgentEvent(event: {
    agentId: string;
    event: string;
    timestamp: number;
    data?: unknown;
  }): void {
    if (!this.enableEvents) {
      return;
    }

    const listeners = this.eventListeners.get("agent");
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          this.eventListenerErrors.set("agent", (this.eventListenerErrors.get("agent") || 0) + 1);
          console.error("Error in agent event listener:", err);
          if (["task_failed", "task_completed"].includes(event.event)) {
            throw err;
          }
        }
      });
    }
  }

  private emitTaskEvent(event: TaskEvent): void {
    if (!this.enableEvents) {
      return;
    }

    const listeners = this.eventListeners.get("task");
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          this.eventListenerErrors.set("task", (this.eventListenerErrors.get("task") || 0) + 1);
          console.error("Error in task event listener:", err);
          if (["failed", "completed"].includes(event.eventType)) {
            throw err;
          }
        }
      });
    }
  }

  on(
    eventType: "task" | "agent",
    listener: (
      event: TaskEvent | { agentId: string; event: string; timestamp: number; data?: unknown }
    ) => void
  ): void {
    if (!this.enableEvents) {
      return;
    }

    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  off(
    eventType: "task" | "agent",
    listener: (
      event: TaskEvent | { agentId: string; event: string; timestamp: number; data?: unknown }
    ) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  shutdown(): void {
    this.stopScheduler();
    this.agents.clear();
    this.taskQueue.clear();
    this.eventListeners.clear();
  }
}
