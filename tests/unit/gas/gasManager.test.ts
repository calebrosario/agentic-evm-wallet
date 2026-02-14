import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { GasManager } from "../../../src/gas/gasManager";

describe("GasManager", () => {
  let gasManager: GasManager;

  beforeEach(() => {
    gasManager = new GasManager();
  });

  afterEach(() => {
    gasManager = null;
  });

  describe("estimateGas", () => {
    it("should estimate gas for simple ETH transfer", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        value: 1000000000000000000n
      });
      expect(gas).toBeDefined();
      expect(typeof gas).toBe("bigint");
      expect(gas).toBeGreaterThan(0n);
    });

    it("should estimate gas for contract call", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        data: "0xabcdef" as `0x${string}`,
        value: 0n
      });
      expect(gas).toBeDefined();
      expect(typeof gas).toBe("bigint");
    });

    it("should estimate gas for EIP-1559 transaction", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 100000000n
      });
      expect(gas).toBeDefined();
    });

    it("should throw error for invalid address", async () => {
      await expect(
        gasManager.estimateGas(1, {
          to: "invalid-address" as `0x${string}`
        })
      ).rejects.toThrow("Invalid recipient address");
    });

    it("should throw error for unsupported chain", async () => {
      await expect(
        gasManager.estimateGas(999999, {
          to: "0x1234567890123456789012345678901234567890" as `0x${string}`
        })
      ).rejects.toThrow("Invalid chain ID: 999999");
    });
  });

  describe("getGasPrice", () => {
    it("should return gas price for Ethereum", async () => {
      const result = await gasManager.getGasPrice(1);
      expect(result.gasPrice).toBeDefined();
      expect(typeof result.gasPrice).toBe("bigint");
      expect(result.gasPrice).toBeGreaterThan(0n);
    });

    it("should return gas price for Polygon", async () => {
      const result = await gasManager.getGasPrice(137);
      expect(result.gasPrice).toBeDefined();
      expect(typeof result.gasPrice).toBe("bigint");
    });

    it("should throw error for unsupported chain", async () => {
      await expect(gasManager.getGasPrice(999999)).rejects.toThrow("Invalid chain ID: 999999");
    });
  });

  describe("suggestGasLimit", () => {
    it("should suggest limit for ETH transfer", async () => {
      const limit = await gasManager.suggestGasLimit("transfer");
      expect(limit).toBe(21000n);
    });

    it("should suggest limit for contract interaction", async () => {
      const limit = await gasManager.suggestGasLimit("contract");
      expect(limit).toBe(100000n);
    });

    it("should suggest higher limit for complex operations", async () => {
      const limit = await gasManager.suggestGasLimit("complex");
      expect(limit).toBe(500000n);
    });
  });
});
