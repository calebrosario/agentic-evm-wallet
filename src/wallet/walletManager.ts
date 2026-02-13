import type { Address, Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createPublicClient } from "viem";
import { mainnet, polygon } from "viem/chains";
import { randomBytes } from "node:crypto";

export interface AgentWallet {
  address: Address;
  chainId: number;
  privateKey: string;
}

export class WalletManager {
  private wallets: Map<number, AgentWallet> = new Map();

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

  async createWallet(chainId: number): Promise<AgentWallet> {
    this.getChainConfig(chainId);

    const privateKey = randomBytes(32).toString("hex");
    const prefixedKey = `0x${privateKey}` as const;
    const account = privateKeyToAccount(prefixedKey);

    const wallet: AgentWallet = {
      address: account.address.toLowerCase() as Address,
      chainId,
      privateKey: prefixedKey
    };

    this.wallets.set(chainId, wallet);

    return wallet;
  }

  async importWallet(options: { privateKey: string; chainId?: number }): Promise<AgentWallet> {
    if (!options.privateKey) {
      throw new Error("Private key required");
    }

    const cleanPrivateKey = options.privateKey.startsWith("0x")
      ? options.privateKey
      : "0x" + options.privateKey;

    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
      throw new Error(
        "Invalid private key format. Must be 64 hexadecimal characters (with or without 0x prefix)"
      );
    }

    const chainId = options.chainId ?? 1;
    this.getChainConfig(chainId);

    const account = privateKeyToAccount(cleanPrivateKey as `0x${string}`);

    const wallet: AgentWallet = {
      address: account.address.toLowerCase() as Address,
      chainId,
      privateKey: cleanPrivateKey
    };

    this.wallets.set(chainId, wallet);

    return wallet;
  }

  async getBalance(chainId: number, tokenAddress?: Address): Promise<bigint> {
    const wallet = this.wallets.get(chainId);
    if (!wallet) {
      throw new Error("No wallet found for chain ID: " + chainId);
    }

    const config = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain: config,
      transport: http()
    });

    let balance: bigint;
    if (!tokenAddress) {
      balance = await publicClient.getBalance({
        address: wallet.address
      });
    } else {
      const balanceOfAbi = [
        {
          inputs: [
            {
              name: "account",
              type: "address"
            }
          ],
          name: "balanceOf",
          outputs: [
            {
              name: "balance",
              type: "uint256"
            }
          ],
          stateMutability: "view",
          type: "function"
        }
      ] as const;

      balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: balanceOfAbi,
        functionName: "balanceOf",
        args: [wallet.address]
      })) as bigint;
    }

    return balance;
  }

  async getWalletAddress(chainId: number): Promise<Address> {
    const wallet = this.wallets.get(chainId);
    if (!wallet) {
      throw new Error("No wallet found for chain ID: " + chainId);
    }

    return wallet.address.toLowerCase() as Address;
  }
}

export const walletManager = new WalletManager();
