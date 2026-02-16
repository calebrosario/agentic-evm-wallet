import type { Task, TaskPriority } from "./types";
import { TaskStatus } from "./types";

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private priorityQueues: Map<TaskPriority, string[]> = new Map([
    [3, []],
    [2, []],
    [1, []],
    [0, []]
  ]);

  private taskStatus: Map<string, TaskStatus> = new Map();

  addTask(task: Task): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} already exists in queue`);
    }

    this.tasks.set(task.id, task);
    this.taskStatus.set(task.id, TaskStatus.Pending);

    const queue = this.priorityQueues.get(task.priority);
    if (queue) {
      queue.push(task.id);
    }
  }

  removeTask(taskId: string): boolean {
    if (!this.tasks.has(taskId)) {
      return false;
    }

    const task = this.tasks.get(taskId);
    this.tasks.delete(taskId);
    this.taskStatus.delete(taskId);

    if (task) {
      const queue = this.priorityQueues.get(task.priority);
      if (queue) {
        const index = queue.indexOf(taskId);
        if (index > -1) {
          queue.splice(index, 1);
        }
      }
    }

    return true;
  }

  getNextTask(): Task | undefined {
    for (const [priority, queue] of this.priorityQueues) {
      for (const taskId of queue) {
        const task = this.tasks.get(taskId);
        if (task) {
          const status = this.taskStatus.get(taskId);
          if (status === TaskStatus.Pending || status === TaskStatus.Queued) {
            this.taskStatus.set(taskId, TaskStatus.Scheduled);
            return task;
          }
        }
      }
    }
    return undefined;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): boolean {
    if (!this.tasks.has(taskId)) {
      return false;
    }

    const oldStatus = this.taskStatus.get(taskId);
    this.taskStatus.set(taskId, status);

    if (oldStatus === TaskStatus.Scheduled && status === TaskStatus.Running) {
      return true;
    }

    return true;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.taskStatus.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    const results: Task[] = [];
    for (const [taskId, taskStatus] of this.taskStatus) {
      if (taskStatus === status) {
        const task = this.tasks.get(taskId);
        if (task) {
          results.push(task);
        }
      }
    }
    return results;
  }

  getTasksByPriority(priority: TaskPriority): Task[] {
    const queue = this.priorityQueues.get(priority);
    if (!queue) {
      return [];
    }

    const tasks: Task[] = [];
    for (const taskId of queue) {
      const task = this.tasks.get(taskId);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  get size(): number {
    return this.tasks.size;
  }

  isEmpty(): boolean {
    return this.tasks.size === 0;
  }

  hasPendingTasks(): boolean {
    for (const [taskId, status] of this.taskStatus) {
      if (status === TaskStatus.Pending || status === TaskStatus.Queued) {
        return true;
      }
    }
    return false;
  }

  getStats(): Record<TaskStatus, number> {
    const stats: Partial<Record<TaskStatus, number>> = {};
    for (const status of Object.values(TaskStatus)) {
      stats[status] = 0;
    }

    for (const taskStatus of this.taskStatus.values()) {
      if (stats[taskStatus] !== undefined) {
        stats[taskStatus] = (stats[taskStatus] || 0) + 1;
      }
    }

    return stats as Record<TaskStatus, number>;
  }

  clear(): void {
    this.tasks.clear();
    this.taskStatus.clear();
    for (const queue of this.priorityQueues.values()) {
      queue.length = 0;
    }
  }
}
