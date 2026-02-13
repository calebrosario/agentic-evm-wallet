import type { Address, Chain } from "viem";
import { http, createPublicClient } from "viem";
import { mainnet, polygon } from "viem/chains";

export interface GasEstimateParams {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  gasLimit?: bigint;
}

export interface GasPriceResult {
  gasPrice: bigint;
}

export type OperationType = "transfer" | "contract" | "complex";

export class GasManager {
  private readonly chains: Map<number, Chain> = new Map([
    [1, mainnet as Chain],
    [137, polygon as Chain]
  ]);

  private getChainConfig(chainId: number) {
    const config = this.chains.get(chainId);
    if (!config) {
      throw new Error(
        "Invalid chain ID: " + chainId + ". Supported chains: 1 (Ethereum), 137 (Polygon)"
      );
    }
    return config;
  }

  async estimateGas(chainId: number, params: GasEstimateParams): Promise<bigint> {
    this.getChainConfig(chainId);

    if (!params.to || !this.isValidAddress(params.to)) {
      throw new Error("Invalid recipient address");
    }

    const config = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain: config,
      transport: http()
    });

    const gasEstimate = await publicClient.estimateGas({
      to: params.to,
      value: params.value,
      data: params.data,
      maxFeePerGas: params.maxFeePerGas,
      maxPriorityFeePerGas: params.maxPriorityFeePerGas,
      gas: params.gasLimit
    });

    return gasEstimate;
  }

  async getGasPrice(chainId: number): Promise<GasPriceResult> {
    const config = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain: config,
      transport: http()
    });

    const gasPrice = await publicClient.getGasPrice();

    return {
      gasPrice: gasPrice
    };
  }

  async suggestGasLimit(operationType: OperationType): Promise<bigint> {
    const gasLimits: Record<OperationType, bigint> = {
      transfer: 21000n,
      contract: 100000n,
      complex: 500000n
    };

    return gasLimits[operationType];
  }

  private isValidAddress(address: Address): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
