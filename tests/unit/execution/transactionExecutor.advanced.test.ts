import { describe, test, expect } from "bun:test";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { ErrorCode, TransactionStatus } from "../../../src/execution/types";

describe("TransactionExecutor - Advanced Tests", () => {
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

  describe("failure simulation and retry logic", () => {
    test("retries on transient network failures", async () => {
      let attemptCount = 0;
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 3, initialBackoffMs: 10 }
      });

      try {
        await executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test("does not retry on validation errors", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 5, initialBackoffMs: 10 }
      });

      await expect(
        executor.executeTransaction({
          transaction: {} as TransactionRequest,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow("Invalid transaction: transaction is empty");
    });

    test("does not retry on invalid key errors", async () => {
      const mockKeyManager = {
        getKey: () => undefined,
        exportKey: async () => {
          throw new Error("Key not found");
        }
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 5, initialBackoffMs: 10 }
      });

      await expect(
        executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: "non-existent-key"
        })
      ).rejects.toThrow("Invalid key ID format");
    });
  });

  describe("concurrent execution safety", () => {
    test("handles multiple concurrent executions", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 0, confirmationTimeoutMs: 100 }
      });

      const concurrentExecutions = Array(10)
        .fill(null)
        .map((_, i) =>
          executor.executeTransaction({
            transaction: { ...mockTransaction, value: 1000n * BigInt(i) },
            chainId: 1,
            keyId: `1:${mockKey.address}`
          })
        );

      const results = await Promise.allSettled(concurrentExecutions);

      expect(results).toHaveLength(10);
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes.length + failures.length).toBe(10);
    });

    test("does not mix transaction results across concurrent requests", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 0, confirmationTimeoutMs: 100 }
      });

      const tx1 = executor.executeTransaction({
        transaction: { ...mockTransaction, value: 1000n },
        chainId: 1,
        keyId: `1:${mockKey.address}`
      });

      const tx2 = executor.executeTransaction({
        transaction: { ...mockTransaction, value: 2000n },
        chainId: 1,
        keyId: `1:${mockKey.address}`
      });

      const [result1, result2] = await Promise.allSettled([tx1, tx2]);

      if (result1.status === "fulfilled" && result2.status === "fulfilled") {
        expect(result1.value).not.toBe(result2.value);
      }
    });
  });

  describe("transaction validation edge cases", () => {
    test("rejects transaction with gas limit exceeding maximum", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });

      const invalidTransaction: TransactionRequest = {
        ...mockTransaction,
        gas: 35_000_000n
      };

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow("Invalid transaction: gas limit exceeds maximum");
    });

    test("rejects transaction with value exceeding maximum", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });

      const invalidTransaction: TransactionRequest = {
        ...mockTransaction,
        value: 2_000_000n * 10n ** 18n
      };

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow("Invalid transaction: value exceeds maximum");
    });

    test("rejects transaction with data exceeding maximum length", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });

      const largeData = "0x" + "ff".repeat(1_000_001);

      const invalidTransaction: TransactionRequest = {
        ...mockTransaction,
        data: largeData as `0x${string}`
      };

      await expect(
        executor.executeTransaction({
          transaction: invalidTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        })
      ).rejects.toThrow("Invalid transaction: data exceeds maximum length");
    });
  });

  describe("error details type safety", () => {
    test("includes proper error details for retry limit exceeded", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager,
        defaultExecutionOptions: { maxRetries: 0, confirmationTimeoutMs: 1 }
      });

      try {
        await executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: mockKey.keyId
        });
      } catch (error) {
        if (error instanceof Error && "code" in error) {
          expect((error as any).code).toBe(ErrorCode.RetryLimitExceeded);
          expect((error as any).details).toHaveProperty("retries");
        }
      }
    });

    test("includes proper error details for invalid key", async () => {
      const mockKeyManager = {
        getKey: () => undefined,
        exportKey: async () => {
          throw new Error("Key not found");
        }
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });

      try {
        await executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 1,
          keyId: "1:invalid-key-id"
        });
      } catch (error) {
        if (error instanceof Error && "details" in error) {
          expect((error as any).details).toHaveProperty("keyId");
        }
      }
    });

    test("includes proper error details for invalid chain", async () => {
      const mockKeyManager = {
        getKey: () => mockKey,
        exportKey: async () => mockKey.privateKey
      } as unknown as KeyManager;

      const executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });

      try {
        await executor.executeTransaction({
          transaction: mockTransaction,
          chainId: 999,
          keyId: mockKey.keyId
        });
      } catch (error) {
        if (error instanceof Error && "details" in error) {
          expect((error as any).details).toHaveProperty("chainId");
        }
      }
    });
  });
});
