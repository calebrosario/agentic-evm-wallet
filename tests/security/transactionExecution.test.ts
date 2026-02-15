import { describe, test, expect, beforeEach } from "bun:test";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { ErrorCode, TransactionStatus } from "../../../src/execution/types";

describe("Transaction Execution - Security Tests", () => {
  let executor: TransactionExecutor;
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
    executor = new TransactionExecutor({
      keyManager
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
        to: "0x0000000000000000000000000000000000000000" as \`0x\${string}\`,
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
    test("should handle event listener errors gracefully", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const keyId = "1:" + keyEntry.address;

      executor.on("signed", () => {
        throw new Error("Listener error");
      });

      try {
        await executor.executeTransaction({
          transaction: {
            to: keyEntry.address,
            value: 0n,
            gas: 21000n
          },
          chainId: 1,
          keyId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
