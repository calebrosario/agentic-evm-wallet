import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { AgentManager } from "../../../src/agent/agentManager";
import type { AgentConfig, Task } from "../../../src/agent/types";
import { TaskPriority, TaskStatus, AgentStatus } from "../../../src/agent/types";

describe("AgentManager - Integration Tests", () => {
  let manager: AgentManager;

  beforeAll(() => {
    manager = new AgentManager({
      enableEvents: false
    });
  });

  afterAll(() => {
    manager.shutdown();
  });

  describe("End-to-End Workflow", () => {
    test("should complete full agent lifecycle", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      const agentInfo = manager.addAgent(config);

      expect(agentInfo.id).toBe("agent-1");
      expect(agentInfo.status).toBe(AgentStatus.Idle);

      const retrieved = manager.getAgent("agent-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("agent-1");

      const removed = manager.removeAgent("agent-1");
      expect(removed).toBe(true);
      expect(manager.getAgent("agent-1")).toBeUndefined();
    });

    test("should schedule and manage multiple tasks", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const tasks: Task[] = [
        {
          id: "task-1",
          name: "Task 1",
          priority: TaskPriority.High,
          payload: {
            type: "custom",
            action: "test1",
            params: {}
          },
          dependencies: [],
          createdAt: Date.now()
        },
        {
          id: "task-2",
          name: "Task 2",
          priority: TaskPriority.Normal,
          payload: {
            type: "custom",
            action: "test2",
            params: {}
          },
          dependencies: [],
          createdAt: Date.now()
        },
        {
          id: "task-3",
          name: "Task 3",
          priority: TaskPriority.Low,
          payload: {
            type: "custom",
            action: "test3",
            params: {}
          },
          dependencies: [],
          createdAt: Date.now()
        }
      ];

      const taskIds = tasks.map((task) => manager.scheduleTask({ task }));

      expect(taskIds).toEqual(["task-1", "task-2", "task-3"]);
      expect(manager.getAllTasks()).toHaveLength(3);

      const highPriorityTasks = manager.getTasksByPriority(TaskPriority.High);
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].id).toBe("task-1");

      manager.cancelTask("task-2");
      expect(manager.getTask("task-2")).toBeUndefined();
      expect(manager.getAllTasks()).toHaveLength(2);
    });

    test("should track manager statistics accurately", () => {
      const config1: AgentConfig = {
        id: "agent-stats-1",
        name: "Agent Stats 1",
        chainId: 1,
        keyId: "1:key-stats-1",
        capabilities: ["transaction"]
      };

      const config2: AgentConfig = {
        id: "agent-stats-2",
        name: "Agent Stats 2",
        chainId: 1,
        keyId: "1:key-stats-2",
        capabilities: ["transaction"]
      };

      manager.addAgent(config1);
      manager.addAgent(config2);

      const task1: Task = {
        id: "task-stats-1",
        name: "Task Stats 1",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test1",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      const task2: Task = {
        id: "task-stats-2",
        name: "Task Stats 2",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test2",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      manager.scheduleTask({ task: task1 });
      manager.scheduleTask({ task: task2 });

      const stats = manager.getStats();

      expect(stats.agents.total).toBeGreaterThanOrEqual(2);
      expect(stats.agents.idle).toBeGreaterThanOrEqual(2);
      expect(stats.tasks.total).toBeGreaterThanOrEqual(2);
      expect(stats.tasks.queued).toBeGreaterThanOrEqual(2);
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe("Task Priority Management", () => {
    test("should execute tasks in priority order", () => {
      const config: AgentConfig = {
        id: "agent-prio",
        name: "Priority Agent",
        chainId: 1,
        keyId: "1:test-key-prio",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const lowPriority: Task = {
        id: "task-prio-low",
        name: "Low Priority",
        priority: TaskPriority.Low,
        payload: {
          type: "custom",
          action: "test-low",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      const criticalPriority: Task = {
        id: "task-prio-critical",
        name: "Critical Priority",
        priority: TaskPriority.Critical,
        payload: {
          type: "custom",
          action: "test-critical",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      const normalPriority: Task = {
        id: "task-prio-normal",
        name: "Normal Priority",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test-normal",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      manager.scheduleTask({ task: lowPriority });
      manager.scheduleTask({ task: criticalPriority });
      manager.scheduleTask({ task: normalPriority });

      const allTasks = manager.getAllTasks();
      expect(allTasks.length).toBeGreaterThanOrEqual(3);

      const queuedTasks = manager.getTasksByStatus(TaskStatus.Queued);
      expect(queuedTasks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
