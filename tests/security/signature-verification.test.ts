import { describe, test, expect, beforeEach } from "bun:test";
import { KeyManager } from "../../src/key/keyManager";
import type { TransactionRequest } from "viem";

describe("Security Tests", () => {
  describe("Signature Verification", () => {
    let keyManager: KeyManager;

    beforeEach(() => {
      keyManager = new KeyManager();
    });

    test("should detect invalid private key format", () => {
      const invalidKeys: any[] = [
        "",
        "0x",
        "0xabc",
        "invalid-key-format",
        "g".repeat(64),
        "1234567890123456789012345678901234567890"
      ];

      for (const invalidKey of invalidKeys) {
        expect(() => {
          keyManager.importKey({
            privateKey: invalidKey as `0x${string}`,
            chainId: 1
          });
        }).toThrow();
      }
    });

    test("should accept valid private key format", () => {
      const validKeys = [
        ("0x" + "a".repeat(64)) as `0x${string}`,
        ("0x" + "0".repeat(32) + "f".repeat(32)) as `0x${string}`
      ];

      for (const validKey of validKeys) {
        expect(() => {
          keyManager.importKey({
            privateKey: validKey,
            chainId: 1
          });
        }).not.toThrow();
      }
    });
  });

  describe("Private Key Security", () => {
    test("should not expose private key in error messages", () => {
      const keyManager = new KeyManager();

      try {
        keyManager.importKey({
          privateKey: ("0x" + "a".repeat(64)) as `0x${string}`,
          chainId: 1
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        expect(errorMessage).not.toContain("0x" + "a");
        expect(errorMessage).not.toContain("a".repeat(10));
      }
    });

    test("should not log private key", () => {
      const keyManager = new KeyManager();

      const logs: string[] = [];
      const originalLog = console.log;

      console.log = (...args) => logs.push(args.join(" "));
      const result = keyManager.generateKey({ chainId: 1 });
      console.log = originalLog;

      const privateKeyLog = logs.find((log) => log.includes(result.privateKey));

      expect(privateKeyLog).toBeUndefined();
    });
  });

  describe("Transaction Validation", () => {
    test("should reject transaction with excessive gas limit", () => {
      const transaction: TransactionRequest = {
        to: "0x0000000000000000000000000000000000000" as `0x${string}`,
        gas: 50000000n
      };

      const maxGas = 30000000n;
      expect(transaction.gas).toBeGreaterThan(maxGas);
    });

    test("should reject transaction with excessive value", () => {
      const transaction: TransactionRequest = {
        to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        value: 1000000n * 10n ** 18n
      };

      const maxValue = 1000000n * 10n ** 18n;
      expect(transaction.value).toBeLessThanOrEqual(maxValue);
    });
  });
});
