import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { GasManager } from "../../../src/gas/gasManager";

describe("GasManager", () => {
  let gasManager: GasManager;

  beforeEach(() => {
    gasManager = new GasManager();
  });

  afterEach(() => {
    gasManager = undefined as any;
  });

  describe("estimateGas", () => {
    it.skip("should estimate gas for simple ETH transfer - see integration tests", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`, // Real address for faster response
        value: 1000000000000000000n
      });
      expect(gas).toBeDefined();
      expect(typeof gas).toBe("bigint");
      expect(gas).toBeGreaterThan(0n);
    }, 30000);

    it.skip("should estimate gas for contract call - see integration tests", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`, // Real address for faster response
        data: "0xabcdef" as `0x${string}`,
        value: 0n
      });
      expect(gas).toBeDefined();
      expect(typeof gas).toBe("bigint");
    }, 30000);

    it.skip("should estimate gas for EIP-1559 transaction - see integration tests", async () => {
      const gas = await gasManager.estimateGas(1, {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`, // Real address for faster response
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 100000000n
      });
      expect(gas).toBeDefined();
    }, 30000);

    it("should throw error for invalid address", async () => {
      await expect(
        gasManager.estimateGas(1, {
          to: "invalid-address" as `0x${string}`
        })
      ).rejects.toThrow(/Invalid recipient address/);
    });

    it("should throw error for unsupported chain", async () => {
      await expect(
        gasManager.estimateGas(999999, {
          to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`
        })
      ).rejects.toThrow(/Invalid chain ID/);
    });
  });

  describe("getGasPrice", () => {
    it.skip("should return gas price for Ethereum - see integration tests", async () => {
      const result = await gasManager.getGasPrice(1);
      expect(result.gasPrice).toBeDefined();
      expect(typeof result.gasPrice).toBe("bigint");
      expect(result.gasPrice).toBeGreaterThan(0n);
    }, 30000);

    it.skip("should return gas price for Polygon - see integration tests", async () => {
      const result = await gasManager.getGasPrice(137);
      expect(result.gasPrice).toBeDefined();
      expect(typeof result.gasPrice).toBe("bigint");
    });

    it("should throw error for unsupported chain", async () => {
      await expect(gasManager.getGasPrice(999999)).rejects.toThrow(/Invalid chain ID/);
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
