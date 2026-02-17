import { describe, test, expect, beforeEach } from "bun:test";
import type { Address } from "viem";
import { Agent } from "../../../src/agent/agent";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { AgentConfig, Task } from "../../../src/agent/types";
import type { KeyStoreEntry } from "../../../src/key/keyManager";
import { AgentStatus, TaskPriority, TaskStatus } from "../../../src/agent/types";

describe("Agent", () => {
  let agent: Agent;
  let keyManager: KeyManager;
  let executor: TransactionExecutor;
  let keyEntry: KeyStoreEntry;
  let config: AgentConfig;

  beforeEach(() => {
    keyManager = new KeyManager();
    executor = new TransactionExecutor({
      keyManager,
      enableEvents: false
    });

    keyEntry = keyManager.generateKey({ chainId: 1 });

    config = {
      id: "agent-1",
      name: "Test Agent",
      chainId: 1,
      keyId: `1:${keyEntry.address}`,
      maxConcurrentTasks: 2,
      capabilities: ["transaction", "custom"]
    };

    agent = new Agent(config, keyEntry, executor);
  });

  describe("getId", () => {
    test("should return agent ID", () => {
      expect(agent.getId()).toBe("agent-1");
    });
  });

  describe("getName", () => {
    test("should return agent name", () => {
      expect(agent.getName()).toBe("Test Agent");
    });
  });

  describe("getStatus", () => {
    test("should return initial idle status", () => {
      expect(agent.getStatus()).toBe(AgentStatus.Idle);
    });
  });

  describe("getInfo", () => {
    test("should return complete agent info", () => {
      const info = agent.getInfo();

      expect(info.id).toBe("agent-1");
      expect(info.name).toBe("Test Agent");
      expect(info.chainId).toBe(1);
      expect(info.address).toBe(keyEntry.address);
      expect(info.status).toBe(AgentStatus.Idle);
      expect(info.currentTasks).toBe(0);
      expect(info.maxConcurrentTasks).toBe(2);
      expect(info.completedTasks).toBe(0);
      expect(info.failedTasks).toBe(0);
      expect(info.capabilities).toEqual(["transaction", "custom"]);
      expect(info.lastActive).toBeGreaterThan(0);
    });
  });

  describe("isAvailable", () => {
    test("should be available when idle and under capacity", () => {
      expect(agent.isAvailable()).toBe(true);
    });
  });

  describe("hasCapability", () => {
    test("should return true for existing capability", () => {
      expect(agent.hasCapability("transaction")).toBe(true);
      expect(agent.hasCapability("custom")).toBe(true);
    });

    test("should return false for non-existent capability", () => {
      expect(agent.hasCapability("nonexistent")).toBe(false);
    });
  });

  describe("canExecuteTask", () => {
    test("should be able to execute task when available", () => {
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

      expect(agent.canExecuteTask(task)).toBe(true);
    });

    test("should be able to execute task with non-running dependencies", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: ["task-dep-1"],
        createdAt: Date.now()
      };

      expect(agent.canExecuteTask(task)).toBe(true);
    });
  });

  describe("executeTask", () => {
    test("should execute custom task successfully", async () => {
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

      const result = await agent.executeTask(task);

      expect(result.taskId).toBe("task-1");
      expect(result.agentId).toBe("agent-1");
      expect(result.status).toBe(TaskStatus.Failed);
      expect(result.error).toContain("not yet implemented");
    });

    test("should timeout when task exceeds timeoutMs", async () => {
      const task: Task = {
        id: "task-timeout",
        name: "Timeout Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "long-operation",
          params: { duration: 10000 }
        },
        dependencies: [],
        timeoutMs: 100,
        createdAt: Date.now()
      };

      let eventReceived = false;
      agent.setEventHandler((event: { event: string; data?: unknown }) => {
        if (event.event === "task_timeout") {
          eventReceived = true;
        }
      });

      const result = await agent.executeTask(task);

      expect(result.taskId).toBe("task-timeout");
      expect(result.agentId).toBe("agent-1");
      expect(result.status).toBe(TaskStatus.Timeout);
      expect(result.error).toContain("timed out");
      expect(eventReceived).toBe(true);
    });

    test("should execute normally when no timeout is set", async () => {
      const task: Task = {
        id: "task-no-timeout",
        name: "No Timeout Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: [],
        createdAt: Date.now()
      };

      const result = await agent.executeTask(task);

      expect(result.taskId).toBe("task-no-timeout");
      expect(result.agentId).toBe("agent-1");
      expect(result.status).toBe(TaskStatus.Failed);
      expect(result.error).toContain("not yet implemented");
    });

    test("should not timeout when timeoutMs is 0", async () => {
      const task: Task = {
        id: "task-zero-timeout",
        name: "Zero Timeout Task",
        priority: TaskPriority.Normal,
        payload: {
          type: "custom",
          action: "test",
          params: {}
        },
        dependencies: [],
        timeoutMs: 0,
        createdAt: Date.now()
      };

      const result = await agent.executeTask(task);

      expect(result.taskId).toBe("task-zero-timeout");
      expect(result.agentId).toBe("agent-1");
      expect(result.status).toBe(TaskStatus.Failed);
      expect(result.error).toContain("not yet implemented");
    });
  });
});
