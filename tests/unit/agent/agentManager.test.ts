import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AgentManager } from "../../../src/agent/agentManager";
import type { AgentConfig, Task } from "../../../src/agent/types";
import { TaskPriority, TaskStatus, AgentStatus, AgentErrorCode } from "../../../src/agent/types";

describe("AgentManager", () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager({
      enableEvents: false
    });
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe("addAgent", () => {
    test("should add agent successfully", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      const agentInfo = manager.addAgent(config);

      expect(agentInfo.id).toBe("agent-1");
      expect(agentInfo.name).toBe("Test Agent");
      expect(agentInfo.status).toBe(AgentStatus.Idle);
    });

    test("should throw error when adding duplicate agent", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      expect(() => manager.addAgent(config)).toThrow("Agent already exists");
    });
  });

  describe("removeAgent", () => {
    test("should remove agent successfully", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const removed = manager.removeAgent("agent-1");

      expect(removed).toBe(true);
      expect(manager.getAgent("agent-1")).toBeUndefined();
    });

    test("should return false when removing non-existent agent", () => {
      const removed = manager.removeAgent("agent-1");

      expect(removed).toBe(false);
    });
  });

  describe("getAgent", () => {
    test("should return agent info", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const agentInfo = manager.getAgent("agent-1");

      expect(agentInfo).toBeDefined();
      expect(agentInfo?.id).toBe("agent-1");
    });

    test("should return undefined for non-existent agent", () => {
      const agentInfo = manager.getAgent("agent-1");

      expect(agentInfo).toBeUndefined();
    });
  });

  describe("getAllAgents", () => {
    test("should return all agents", () => {
      const config1: AgentConfig = {
        id: "agent-1",
        name: "Agent 1",
        chainId: 1,
        keyId: "1:key1",
        capabilities: ["transaction"]
      };

      const config2: AgentConfig = {
        id: "agent-2",
        name: "Agent 2",
        chainId: 1,
        keyId: "1:key2",
        capabilities: ["transaction"]
      };

      manager.addAgent(config1);
      manager.addAgent(config2);

      const agents = manager.getAllAgents();

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toBe("agent-1");
      expect(agents[1].id).toBe("agent-2");
    });
  });

  describe("getAvailableAgents", () => {
    test("should return idle agents", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const availableAgents = manager.getAvailableAgents();

      expect(availableAgents).toHaveLength(1);
      expect(availableAgents[0].status).toBe(AgentStatus.Idle);
    });
  });

  describe("scheduleTask", () => {
    test("should schedule task successfully", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

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

      const taskId = manager.scheduleTask({ task });

      expect(taskId).toBe("task-1");
      expect(manager.getTask("task-1")).toBeDefined();
    });

    test("should throw error when scheduling duplicate task", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

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

      manager.scheduleTask({ task });

      expect(() => manager.scheduleTask({ task })).toThrow("Task already exists");
    });
  });

  describe("cancelTask", () => {
    test("should cancel task successfully", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

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

      manager.scheduleTask({ task });

      const cancelled = manager.cancelTask("task-1");

      expect(cancelled).toBe(true);
      expect(manager.getTask("task-1")).toBeUndefined();
    });

    test("should return false when cancelling non-existent task", () => {
      const cancelled = manager.cancelTask("task-1");

      expect(cancelled).toBe(false);
    });
  });

  describe("getStats", () => {
    test("should return manager statistics", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

      const stats = manager.getStats();

      expect(stats.agents.total).toBe(1);
      expect(stats.agents.idle).toBe(1);
      expect(stats.agents.busy).toBe(0);
      expect(stats.tasks.total).toBe(0);
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe("shutdown", () => {
    test("should shutdown manager gracefully", () => {
      const config: AgentConfig = {
        id: "agent-1",
        name: "Test Agent",
        chainId: 1,
        keyId: "1:test-key",
        capabilities: ["transaction"]
      };

      manager.addAgent(config);

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

      manager.scheduleTask({ task });

      manager.shutdown();

      expect(manager.getAllAgents()).toHaveLength(0);
      expect(manager.getAllTasks()).toHaveLength(0);
    });
  });
});
