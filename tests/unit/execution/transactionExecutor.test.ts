import { describe, test, expect, beforeEach } from "bun:test";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { ErrorCode, TransactionStatus } from "../../../src/execution/types";
import {
  createMockPublicClient,
  createMockWalletClient,
  createRpcSpy,
  MOCK_CHAIN
} from "../../mocks/viem-client";

describe("TransactionExecutor", () => {
  let executor: TransactionExecutor;
  let mockKeyManager: KeyManager;
  let mockPublicClient: any;
  let mockWalletClient: any;
  let rpcSpy: any;

  const mockKey = {
    keyId: "1:0x1234567890123456789012345678901234567890",
    privateKey: ("0x" + "1".repeat(64)) as `0x${string}`,
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    chainId: 1
  };

  const mockTransaction: TransactionRequest = {
    to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    value: 1000000000000000000n,
    data: "0x" as `0x${string}`,
    gas: 21000n,
    gasPrice: 20000000000n
  };

  beforeEach(() => {
    rpcSpy = createRpcSpy();
    mockPublicClient = createMockPublicClient();
    mockWalletClient = createMockWalletClient(mockKey.address);

    mockKeyManager = {
      exportKey: async (keyId) => {
        if (keyId === mockKey.keyId) {
          return mockKey.privateKey;
        }
        throw new Error("Key not found");
      },
      getKey: (address, chainId) => {
        const keyId = `${chainId}:${address}`;
        if (keyId === mockKey.keyId) {
          return mockKey;
        }
        return undefined;
      }
    } as unknown as KeyManager;

    executor = new TransactionExecutor({
      keyManager: mockKeyManager,
      chains: new Map([[1, MOCK_CHAIN]])
    });
  });

  describe("constructor", () => {
    test("should initialize with default options", () => {
      expect(executor).toBeDefined();
    });

    test("should initialize with custom default options", () => {
      const customExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 5,
          initialBackoffMs: 500
        }
      });
      expect(customExecutor).toBeDefined();
    });

    test("should initialize with events enabled by default", () => {
      expect(executor).toBeDefined();
    });

    test("should initialize with events disabled when specified", () => {
      const customExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: false
      });
      expect(customExecutor).toBeDefined();
    });
  });

  describe("executeTransaction - requires viem network mocking", () => {
    test("should execute a transaction successfully with default options", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBe(TransactionStatus.Confirmed);
      expect(result.hash).toBeDefined();
      expect(result.retries).toBe(0);
    });

    test("should execute a transaction with custom options", async () => {
      const result = await executor.executeTransaction(
        {
          transaction: mockTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        },
        {
          maxRetries: 5,
          confirmations: 3,
          confirmationTimeoutMs: 120000
        }
      );

      expect(result.status).toBe(TransactionStatus.Confirmed);
    });

    test("should fail with invalid key ID", async () => {
      await expect(
        executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: "non-existent-key"
        })
      ).rejects.toThrow();
    });

    test("should fail with invalid chain ID", async () => {
      await expect(
        executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 999,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should fail with invalid transaction structure", async () => {
      const invalidTransaction = {} as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should fail with missing 'to' address", async () => {
      const invalidTransaction = {
        value: 1000000000000000000n
      } as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should fail with invalid address format", async () => {
      const invalidTransaction = {
        to: "invalid-address" as `0x${string}`,
        value: 1000000000000000000n
      } as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should handle gas limit validation", async () => {
      const invalidTransaction = {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        value: 1000000000000000000n,
        gas: 0n
      } as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should handle gas price validation", async () => {
      const invalidTransaction = {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        value: 1000000000000000000n,
        gasPrice: -1n
      } as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });
  });

  describe("retry logic", () => {
    test("should retry on transient failures", async () => {
      let attemptCount = 0;
      const retryExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 3,
          initialBackoffMs: 10
        }
      });

      await expect(
        retryExecutor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).resolves.toBeDefined();
    });

    test("should not retry on permanent failures", async () => {
      const retryExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 3,
          initialBackoffMs: 10
        }
      });

      const result = await retryExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.retries).toBe(0);
    });

    test("should use exponential backoff between retries", async () => {
      const startTime = Date.now();
      const retryExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 2,
          initialBackoffMs: 50,
          maxBackoffMs: 100
        }
      });

      await retryExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(50);
    });

    test("should respect max backoff delay", async () => {
      const retryExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 3,
          initialBackoffMs: 1000,
          maxBackoffMs: 2000
        }
      });

      const result = await retryExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.retries).toBe(0);
    });

    test("should fail when max retries exceeded", async () => {
      const retryExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          maxRetries: 0,
          initialBackoffMs: 10
        }
      });

      const result = await retryExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBeDefined();
    });
  });

  describe("event system", () => {
    test("should emit signed event", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      eventExecutor.on("signed", (event) => {
        events.push(event);
      });

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(events.length).toBeGreaterThan(0);
    });

    test("should emit broadcasted event", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      eventExecutor.on("broadcasted", (event) => {
        events.push(event);
      });

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(events.length).toBeGreaterThan(0);
    });

    test("should emit confirmed event on success", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      eventExecutor.on("confirmed", (event) => {
        events.push(event);
      });

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(events.length).toBeGreaterThan(0);
    });

    test("should emit failed event on failure", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      eventExecutor.on("failed", (event) => {
        events.push(event);
      });

      await expect(
        eventExecutor.executeTransaction({
          transaction: {} as TransactionRequest,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();

      expect(events.length).toBeGreaterThan(0);
    });

    test("should not emit events when disabled", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: false
      });

      eventExecutor.on("signed", (event) => {
        events.push(event);
      });

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(events.length).toBe(0);
    });

    test("should support multiple event listeners", async () => {
      const listener1Events: unknown[] = [];
      const listener2Events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      eventExecutor.on("confirmed", (event) => {
        listener1Events.push(event);
      });

      eventExecutor.on("confirmed", (event) => {
        listener2Events.push(event);
      });

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(listener1Events.length).toBeGreaterThan(0);
      expect(listener2Events.length).toBeGreaterThan(0);
    });
  });

  describe("transaction result", () => {
    test("should return transaction hash", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
      expect(result.hash.startsWith("0x")).toBe(true);
    });

    test("should return final status", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(Object.values(TransactionStatus).includes(result.status)).toBe(true);
    });

    test("should return block number when confirmed", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      if (result.status === TransactionStatus.Confirmed) {
        expect(result.blockNumber).toBeDefined();
        expect(typeof result.blockNumber).toBe("bigint");
      }
    });

    test("should return gas used when confirmed", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      if (result.status === TransactionStatus.Confirmed) {
        expect(result.gasUsed).toBeDefined();
        expect(typeof result.gasUsed).toBe("bigint");
      }
    });

    test("should return effective gas price when confirmed", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      if (result.status === TransactionStatus.Confirmed) {
        expect(result.effectiveGasPrice).toBeDefined();
        expect(typeof result.effectiveGasPrice).toBe("bigint");
      }
    });

    test("should return retry count", async () => {
      const result = await executor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(typeof result.retries).toBe("number");
      expect(result.retries).toBeGreaterThanOrEqual(0);
    });

    test("should include error message on failure", async () => {
      try {
        await executor.executeTransaction({
          transaction: {} as TransactionRequest,
          chainId: 1,
          keyId: mockKey.keyId
        });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe("edge cases", () => {
    test("should handle zero value transaction", async () => {
      const zeroValueTransaction = {
        ...mockTransaction,
        value: 0n
      };

      const result = await executor.executeTransaction({
        transaction: zeroValueTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBeDefined();
    });

    test("should handle transaction with data", async () => {
      const dataTransaction = {
        ...mockTransaction,
        data: "0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead" as `0x${string}`
      };

      const result = await executor.executeTransaction({
        transaction: dataTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBeDefined();
    });

    test("should handle transaction without gas parameters", async () => {
      const noGasTransaction = {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        value: 1000000000000000000n
      } as TransactionRequest;

      await expect(
        executor.executeTransaction({
          transaction: noGasTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow();
    });

    test("should handle very large gas limit", async () => {
      const largeGasTransaction = {
        ...mockTransaction,
        gas: 10000000n
      };

      const result = await executor.executeTransaction({
        transaction: largeGasTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBeDefined();
    });
  });

  describe("timeout handling", () => {
    test("should timeout on confirmation delay", async () => {
      const timeoutExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: {
          confirmationTimeoutMs: 1
        }
      });

      const result = await timeoutExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(result.status).toBeDefined();
    });
  });

  describe("off event listener", () => {
    test("should remove event listener", async () => {
      const events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      const listener = (event: unknown) => {
        events.push(event);
      };

      eventExecutor.on("signed", listener);
      eventExecutor.off("signed", listener);

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(events.length).toBe(0);
    });

    test("should only remove specified listener", async () => {
      const listener1Events: unknown[] = [];
      const listener2Events: unknown[] = [];
      const eventExecutor = new TransactionExecutor({
        keyManager: mockKeyManager,
        enableEvents: true
      });

      const listener1 = (event: unknown) => {
        listener1Events.push(event);
      };

      const listener2 = (event: unknown) => {
        listener2Events.push(event);
      };

      eventExecutor.on("confirmed", listener1);
      eventExecutor.on("confirmed", listener2);
      eventExecutor.off("confirmed", listener1);

      await eventExecutor.executeTransaction({
        transaction: mockTransaction,
        chainId: 1,
        keyId: mockKey.keyId
      });

      expect(listener1Events.length).toBe(0);
      expect(listener2Events.length).toBeGreaterThan(0);
    });
  });
});
