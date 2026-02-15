import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TransactionBuilder } from "../../../src/transactions/transactionBuilder";

describe("TransactionBuilder", () => {
  let transactionBuilder: TransactionBuilder;

  beforeEach(() => {
    transactionBuilder = new TransactionBuilder();
  });

  afterEach(() => {
    transactionBuilder = undefined as any;
  });

  describe("buildTransaction", () => {
    it("should validate chain ID", async () => {
      await expect(
        transactionBuilder.buildTransaction(999999, {
          to: "0x1234567890123456789012345678901234567890" as any,
          value: 1000000000000000000n,
          account: {} as any
        })
      ).rejects.toThrow("Invalid chain ID: 999999");
    });

    it("should validate recipient address", async () => {
      await expect(
        transactionBuilder.buildTransaction(1, {
          to: "invalid-address" as any,
          value: 1000000000000000000n,
          account: {} as any
        })
      ).rejects.toThrow("Invalid recipient address");
    });
  });

  describe("signTransaction", () => {
    it("should throw error for invalid private key", async () => {
      await expect(
        transactionBuilder.signTransaction({} as any, "invalid-key")
      ).rejects.toThrow("Invalid private key format");
    });

    it("should throw error for empty private key", async () => {
      await expect(
        transactionBuilder.signTransaction({} as any, "")
      ).rejects.toThrow("Private key required");
    });
  });
});
