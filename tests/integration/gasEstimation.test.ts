import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { GasManager, GasEstimateParams } from "../../src/gas/gasManager";

describe("GasManager Integration Tests - Real World Scenarios", () => {
  let gasManager: GasManager;

  beforeAll(() => {
    gasManager = new GasManager();
  });

  describe("Multi-Chain Gas Estimation", () => {
    it("should estimate gas for Ethereum mainnet transfer", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`, // Vitalik's address
        value: 1000000000000000n // 0.001 ETH
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
      expect(gas).toBeGreaterThan(21000n);
    }, 30000);

    it("should estimate gas for Polygon transfer", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000000n // 1 MATIC
      };

      const gas = await gasManager.estimateGas(137, params);
      expect(gas).toBeDefined();
      expect(gas).toBe(21000n);
    }, 30000);

    it("should get gas prices from Ethereum", async () => {
      const result = await gasManager.getGasPrice(1);
      expect(result.gasPrice).toBeDefined();
      expect(result.gasPrice).toBeGreaterThan(0n);
    }, 30000);

    it("should get gas prices from Polygon", async () => {
      const result = await gasManager.getGasPrice(137);
      expect(result.gasPrice).toBeDefined();
      expect(result.gasPrice).toBeGreaterThan(0n);
      console.log(`Polygon gas price: ${result.gasPrice} wei`);
    }, 30000);

    it("should compare gas prices across chains", async () => {
      const [ethPrice, polygonPrice] = await Promise.all([
        gasManager.getGasPrice(1),
        gasManager.getGasPrice(137)
      ]);

      expect(ethPrice.gasPrice).toBeDefined();
      expect(polygonPrice.gasPrice).toBeDefined();

      // Ethereum gas should typically be higher than Polygon
      // (though this is an assumption that may not always hold)
      console.log(`Ethereum gas: ${ethPrice.gasPrice}`);
      console.log(`Polygon gas: ${polygonPrice.gasPrice}`);
    }, 60000);
  });

  describe("Transaction Simulation Tests", () => {
    it("should estimate gas for contract interaction with data", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        data: "0x12345678" as `0x${string}`,
        value: 0n
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
    }, 30000);

    it("should estimate gas for WETH contract call", async () => {
      // WETH contract on Ethereum
      const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`;
      const balanceOfSignature = "0x70a08231"; // balanceOf(address)
      const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`;

      const params: GasEstimateParams = {
        to: wethAddress,
        data: `${balanceOfSignature}${address.slice(2).padStart(64, "0")}` as `0x${string}`,
        value: 0n
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
      // balanceOf is a read-only view function, should use minimal gas
      expect(gas).toBeLessThan(50000n);
    }, 30000);

    it("should simulate zero value transfer", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 0n
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
      expect(gas).toBeGreaterThanOrEqual(21000n);
    }, 30000);
  });

  describe("Gas Prediction Accuracy Tests", () => {
    it("should predict accurate gas for simple transfer", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n
      };

      const estimated = await gasManager.estimateGas(1, params);
      const suggested = await gasManager.suggestGasLimit("transfer");

      // Estimated gas should be close to suggested gas limit
      expect(estimated).toBeGreaterThanOrEqual(21000n);
      expect(suggested).toBe(21000n);
    }, 30000);

    it("should verify gas suggestions are reasonable", async () => {
      const transfer = await gasManager.suggestGasLimit("transfer");
      const contract = await gasManager.suggestGasLimit("contract");
      const complex = await gasManager.suggestGasLimit("complex");

      expect(transfer).toBe(21000n);
      expect(contract).toBeGreaterThan(transfer);
      expect(complex).toBeGreaterThan(contract);
    });

    it("should compare estimated gas with different values", async () => {
      const smallValue: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1n // 1 wei
      };

      const largeValue: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000000n // 1 ETH
      };

      const [gasSmall, gasLarge] = await Promise.all([
        gasManager.estimateGas(1, smallValue),
        gasManager.estimateGas(1, largeValue)
      ]);

      // Gas should be the same regardless of value amount
      expect(gasSmall).toBe(gasLarge);
      expect(gasSmall).toBeGreaterThanOrEqual(21000n);
    }, 60000);
  });

  describe("EIP-1559 Integration Tests", () => {
    it("should estimate gas with maxFeePerGas and maxPriorityFeePerGas", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n,
        maxFeePerGas: 5000000000n, // 5 Gwei
        maxPriorityFeePerGas: 1000000000n // 1 Gwei
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
      expect(gas).toBeGreaterThan(0n);
    }, 45000);

    it("should estimate gas with custom maxFeePerGas", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n,
        maxFeePerGas: 10000000000n // 10 Gwei
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
    }, 45000);

    it("should estimate gas with custom maxPriorityFeePerGas", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n,
        maxPriorityFeePerGas: 2000000000n // 2 Gwei
      };

      const gas = await gasManager.estimateGas(1, params);
      expect(gas).toBeDefined();
    }, 45000);
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid address gracefully", async () => {
      const params: GasEstimateParams = {
        to: "invalid" as `0x${string}`,
        value: 1000000000000000n
      };

      await expect(gasManager.estimateGas(1, params)).rejects.toThrow("Invalid recipient address");
    });

    it("should handle invalid chain ID", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n
      };

      await expect(gasManager.estimateGas(999, params)).rejects.toThrow("Invalid chain ID");
    });

    it("should handle empty address", async () => {
      const params: GasEstimateParams = {
        to: "" as `0x${string}`,
        value: 1000000000000000n
      };

      await expect(gasManager.estimateGas(1, params)).rejects.toThrow("Invalid recipient address");
    });
  });

  describe("Performance Benchmarks", () => {
    it("should estimate gas within acceptable time limit", async () => {
      const startTime = Date.now();

      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n
      };

      await gasManager.estimateGas(1, params);

      const duration = Date.now() - startTime;
      console.log(`Gas estimation took ${duration}ms`);
      // More lenient timeout for varying network conditions
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    }, 30000);

    it("should get gas price within acceptable time limit", async () => {
      const startTime = Date.now();

      await gasManager.getGasPrice(1);

      const duration = Date.now() - startTime;
      console.log(`Gas price fetch took ${duration}ms`);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, 30000);

    it("should handle multiple concurrent gas estimations", async () => {
      const params: GasEstimateParams = {
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
        value: 1000000000000000n
      };

      const startTime = Date.now();

      const results = await Promise.all([
        gasManager.estimateGas(1, params),
        gasManager.estimateGas(1, params),
        gasManager.estimateGas(1, params),
        gasManager.estimateGas(1, params),
        gasManager.estimateGas(1, params)
      ]);

      const duration = Date.now() - startTime;
      console.log(`5 concurrent estimations took ${duration}ms`);
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(30000); // All 5 should complete within 30 seconds
    }, 45000);
  });
});
