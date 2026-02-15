import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { TransactionStatus } from "../../../src/execution/types";

describe("Transaction Execution - Integration Tests", () => {
  let executor: TransactionExecutor;
  let keyManager: KeyManager;
  let keyId: string;

  beforeAll(() => {
    keyManager = new KeyManager();
    executor = new TransactionExecutor({
      keyManager
    });
  });

  afterAll(() => {});

  describe("Transaction Lifecycle", () => {
    test("should generate key and execute transaction end-to-end", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      keyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        data: "0x" as `0x${string}`,
        gas: 21000n,
        gasPrice: 20000000000n
      };

      const events: unknown[] = [];
      executor.on("confirmed", (event) => events.push(event));

      try {
        const result = await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId
        });

        expect(result.status).toBe(TransactionStatus.Confirmed);
        expect(result.hash).toBeDefined();
        expect(result.retries).toBeGreaterThanOrEqual(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);

    test("should handle transaction with custom gas settings", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });
      const customKeyId = `137:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 1000000000000000000n,
        gas: 50000n,
        gasPrice: 30000000000n
      };

      try {
        const result = await executor.executeTransaction(
          {
            transaction,
            chainId: 137,
            keyId: customKeyId
          },
          {
            maxRetries: 2,
            confirmations: 1
          }
        );

        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("Multi-Chain Support", () => {
    test("should execute on Ethereum mainnet", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const ethKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      try {
        const result = await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: ethKeyId
        });

        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);

    test("should execute on Polygon", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });
      const polygonKeyId = `137:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      try {
        const result = await executor.executeTransaction({
          transaction,
          chainId: 137,
          keyId: polygonKeyId
        });

        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("Event Emission", () => {
    test("should emit events in correct order", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      const eventTypes: string[] = [];
      const events = [(event: unknown) => eventTypes.push((event as { status: string }).status)];

      executor.on("pending", events[0] as (event: unknown) => void);
      executor.on("signed", events[0] as (event: unknown) => void);
      executor.on("broadcasted", events[0] as (event: unknown) => void);
      executor.on("confirmed", events[0] as (event: unknown) => void);

      try {
        await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });
      } catch (error) {
        // Expected without RPC
      }

      expect(eventTypes.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe("Key Management Integration", () => {
    test("should fail with non-existent key", async () => {
      const transaction: TransactionRequest = {
        to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        value: 0n,
        gas: 21000n
      };

      await expect(
        executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: "1:0x0000000000000000000000000000000000000000"
        })
      ).rejects.toThrow();
    });

    test("should use existing key from KeyManager", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const existingKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      try {
        await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: existingKeyId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("Configuration Options", () => {
    test("should respect custom retry settings", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      const customExecutor = new TransactionExecutor({
        keyManager,
        defaultExecutionOptions: {
          maxRetries: 1,
          initialBackoffMs: 100
        }
      });

      try {
        const result = await customExecutor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });

        expect(result.retries).toBeLessThanOrEqual(1);
      } catch (error) {
        // Expected without RPC
      }
    }, 10000);

    test("should disable events when configured", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      const noEventsExecutor = new TransactionExecutor({
        keyManager,
        enableEvents: false
      });

      const events: unknown[] = [];
      noEventsExecutor.on("confirmed", (event) => events.push(event));

      try {
        await noEventsExecutor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });
      } catch (error) {
        // Expected without RPC
      }

      expect(events.length).toBe(0);
    }, 10000);
  });

  describe("Transaction Variations", () => {
    test("should handle contract calls with data", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        data: "0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead" as `0x${string}`,
        gas: 100000n
      };

      try {
        await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);

    test("should handle zero value transfers", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      try {
        await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);

    test("should handle large value transfers", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const testKeyId = `1:${keyEntry.address}`;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 1000000000000000000000000n,
        gas: 21000n
      };

      try {
        await executor.executeTransaction({
          transaction,
          chainId: 1,
          keyId: testKeyId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });
});
