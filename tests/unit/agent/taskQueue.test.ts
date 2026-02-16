import { describe, test, expect, beforeEach } from "bun:test";
import type { Address } from "viem";
import { TaskQueue } from "../../../src/agent/taskQueue";
import type { Task } from "../../../src/agent/types";
import { TaskPriority, TaskStatus } from "../../../src/agent/types";

describe("TaskQueue", () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue();
  });

  describe("addTask", () => {
    test("should add task successfully", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      expect(taskQueue.size).toBe(1);
      expect(taskQueue.getTask("task-1")).toEqual(task);
    });

    test("should throw error when adding duplicate task", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      expect(() => taskQueue.addTask(task)).toThrow("Task task-1 already exists in queue");
    });
  });

  describe("removeTask", () => {
    test("should remove task successfully", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      const removed = taskQueue.removeTask("task-1");

      expect(removed).toBe(true);
      expect(taskQueue.size).toBe(0);
      expect(taskQueue.getTask("task-1")).toBeUndefined();
    });

    test("should return false when removing non-existent task", () => {
      const removed = taskQueue.removeTask("task-1");

      expect(removed).toBe(false);
    });
  });

  describe("getNextTask", () => {
    test("should return highest priority task", () => {
      const lowPriority: Task = {
        id: "task-low",
        name: "Low Priority",
        priority: TaskPriority.Low,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      const highPriority: Task = {
        id: "task-high",
        name: "High Priority",
        priority: TaskPriority.High,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(lowPriority);
      taskQueue.addTask(highPriority);

      const nextTask = taskQueue.getNextTask();

      expect(nextTask?.id).toBe("task-high");
    });

    test("should return undefined when queue is empty", () => {
      const nextTask = taskQueue.getNextTask();

      expect(nextTask).toBeUndefined();
    });
  });

  describe("updateTaskStatus", () => {
    test("should update task status", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      taskQueue.updateTaskStatus("task-1", TaskStatus.Running);

      expect(taskQueue.getTaskStatus("task-1")).toBe(TaskStatus.Running);
    });

    test("should return false when updating non-existent task", () => {
      const updated = taskQueue.updateTaskStatus("task-1", TaskStatus.Running);

      expect(updated).toBe(false);
    });
  });

  describe("getTasksByStatus", () => {
    test("should return tasks with matching status", () => {
      const pendingTask: Task = {
        id: "task-1",
        name: "Pending",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      const runningTask: Task = {
        id: "task-2",
        name: "Running",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(pendingTask);
      taskQueue.addTask(runningTask);
      taskQueue.updateTaskStatus("task-2", TaskStatus.Running);

      const runningTasks = taskQueue.getTasksByStatus(TaskStatus.Running);

      expect(runningTasks).toHaveLength(1);
      expect(runningTasks[0].id).toBe("task-2");
    });
  });

  describe("getTasksByPriority", () => {
    test("should return tasks with matching priority", () => {
      const lowTask: Task = {
        id: "task-low",
        name: "Low",
        priority: TaskPriority.Low,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      const highTask: Task = {
        id: "task-high",
        name: "High",
        priority: TaskPriority.High,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(lowTask);
      taskQueue.addTask(highTask);

      const highPriorityTasks = taskQueue.getTasksByPriority(TaskPriority.High);

      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].id).toBe("task-high");
    });
  });

  describe("hasPendingTasks", () => {
    test("should return true when pending tasks exist", () => {
      const task: Task = {
        id: "task-1",
        name: "Test",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      expect(taskQueue.hasPendingTasks()).toBe(true);
    });

    test("should return false when no pending tasks", () => {
      expect(taskQueue.hasPendingTasks()).toBe(false);
    });
  });

  describe("getStats", () => {
    test("should return correct task statistics", () => {
      const task1: Task = {
        id: "task-1",
        name: "Task 1",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      const task2: Task = {
        id: "task-2",
        name: "Task 2",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);
      taskQueue.updateTaskStatus("task-1", TaskStatus.Running);

      const stats = taskQueue.getStats();

      expect(stats[TaskStatus.Pending]).toBe(1);
      expect(stats[TaskStatus.Running]).toBe(1);
    });
  });

  describe("clear", () => {
    test("should clear all tasks", () => {
      const task: Task = {
        id: "task-1",
        name: "Test",
        priority: TaskPriority.Normal,
        payload: { type: "custom", action: "test", params: {} },
        dependencies: [],
        createdAt: Date.now()
      };

      taskQueue.addTask(task);

      taskQueue.clear();

      expect(taskQueue.size).toBe(0);
      expect(taskQueue.isEmpty()).toBe(true);
    });
  });
});
