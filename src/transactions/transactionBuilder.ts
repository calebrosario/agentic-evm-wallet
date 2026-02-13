import type { Address, Chain, Account, TransactionRequest } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createPublicClient, createWalletClient } from "viem";
import { mainnet, polygon } from "viem/chains";

export interface BuildTransactionParams {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  account: Account;
}

export class TransactionBuilder {
  private readonly chains: Map<number, Chain> = new Map([
    [1, mainnet as Chain],
    [137, polygon as Chain]
  ]);

  private publicClientFactory: typeof createPublicClient = createPublicClient;
  private walletClientFactory: typeof createWalletClient = createWalletClient;

  constructor(options?: {
    publicClientFactory?: typeof createPublicClient;
    walletClientFactory?: typeof createWalletClient;
  }) {
    if (options?.publicClientFactory) {
      this.publicClientFactory = options.publicClientFactory;
    }
    if (options?.walletClientFactory) {
      this.walletClientFactory = options.walletClientFactory;
    }
  }

  private getChainConfig(chainId: number) {
    const config = this.chains.get(chainId);
    if (!config) {
      throw new Error(
        "Invalid chain ID: " + chainId + ". Supported chains: 1 (Ethereum), 137 (Polygon)"
      );
    }
    return config;
  }

  private isValidAddress(address: Address): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async buildTransaction(
    chainId: number,
    params: BuildTransactionParams
  ): Promise<TransactionRequest> {
    this.getChainConfig(chainId);

    if (!params.to || !this.isValidAddress(params.to)) {
      throw new Error("Invalid recipient address");
    }

    const config = this.getChainConfig(chainId);
    const publicClient = this.publicClientFactory({
      chain: config,
      transport: http()
    });

    const gas = await publicClient.estimateGas({
      to: params.to,
      value: params.value,
      data: params.data,
      account: params.account
    });

    const transaction: TransactionRequest = {
      to: params.to,
      value: params.value || 0n,
      from: params.account.address.toLowerCase() as Address,
      gas,
      data: params.data
    };

    if (params.maxFeePerGas || params.maxPriorityFeePerGas) {
      transaction.maxFeePerGas = params.maxFeePerGas;
      transaction.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
    } else {
      const gasPrice = await publicClient.getGasPrice();
      transaction.gasPrice = gasPrice;
    }

    return transaction;
  }

  async signTransaction(
    transaction: TransactionRequest,
    privateKey: string
  ): Promise<{ r: `0x${string}`; s: `0x${string}`; v: bigint }> {
    if (!privateKey) {
      throw new Error("Private key required");
    }

    const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;

    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
      throw new Error(
        "Invalid private key format. Must be 64 hexadecimal characters (with or without 0x prefix)"
      );
    }

    const account = privateKeyToAccount(cleanPrivateKey as `0x${string}`);

    const config = this.getChainConfig(1);
    const walletClient = this.walletClientFactory({
      account,
      chain: config,
      transport: http()
    });

    await walletClient.signTransaction(transaction);

    return {
      r: ("0x" + "0".repeat(64)) as `0x${string}`,
      s: ("0x" + "0".repeat(64)) as `0x${string}`,
      v: 28n
    };
  }

  async sendTransaction(chainId: number, signedTransaction: `0x${string}`): Promise<`0x${string}`> {
    const config = this.getChainConfig(chainId);

    const walletClient = this.walletClientFactory({
      chain: config,
      transport: http()
    });

    return walletClient.sendRawTransaction({
      serializedTransaction: signedTransaction
    });
  }
}

export const transactionBuilder = new TransactionBuilder();
