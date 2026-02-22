import { describe, test, expect, beforeEach } from "bun:test";
import { TransactionExecutor } from "../../src/execution/transactionExecutor";
import { KeyManager } from "../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { ErrorCode, TransactionStatus } from "../../src/execution/types";

describe("Transaction Execution - Security Tests", () => {
  let executor: TransactionExecutor;
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
    executor = new TransactionExecutor({
      keyManager,
      enableEvents: true
    });
  });

  describe("Input Validation", () => {
    test("should reject empty transaction", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const keyId = "1:" + keyEntry.address;

      await expect(
        executor.executeTransaction({
          transaction: {} as TransactionRequest,
          chainId: 1,
          keyId
        })
      ).rejects.toThrow();
    });
  });

  describe("Key Security", () => {
    test("should reject non-existent key ID", async () => {
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
  });

  describe("Chain Security", () => {
    test("should reject invalid chain ID", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const keyId = "1:" + keyEntry.address;

      const transaction: TransactionRequest = {
        to: keyEntry.address,
        value: 0n,
        gas: 21000n
      };

      await expect(
        executor.executeTransaction({
          transaction,
          chainId: 999,
          keyId
        })
      ).rejects.toThrow();
    });
  });

  describe("Event Security", () => {
    test.skip("should handle event listener errors gracefully - requires network mocking", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const keyId = "1:" + keyEntry.address;

      let listenerErrorLogged = false;
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0] === "Error in event listener:") {
          listenerErrorLogged = true;
        }
        originalConsoleError(...args);
      };

      executor.on("signed", () => {
        throw new Error("Listener error");
      });

      await expect(
        executor.executeTransaction({
          transaction: {
            to: keyEntry.address,
            value: 0n,
            gas: 21000n
          },
          chainId: 1,
          keyId
        })
      ).rejects.toThrow();

      console.error = originalConsoleError;
      expect(listenerErrorLogged).toBe(true);
    });
  });
});
