import type { Address, Chain, Hash, Transaction } from "viem";
import type { Hex } from "viem";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain, getAllSupportedChainIds } from "@/chains/chainConfig";

export interface KeyStoreEntry {
  address: Address;
  chainId: number;
  privateKey: Hex;
  createdAt: Date;
}

export interface GenerateKeyParams {
  chainId: number;
}

export interface ImportKeyParams {
  privateKey: Hex;
  chainId: number;
}

export interface ExportKeyParams {
  address: Address;
  chainId: number;
}

export interface SignTransactionParams {
  privateKey: Hex;
  chainId: number;
  transaction: Transaction;
}

export interface SignedTransaction {
  signedTransaction: `0x${string}`;
  hash: Hash;
}

export class KeyManager {
  private keyStore: Map<string, KeyStoreEntry> = new Map();

  private getChainConfig(chainId: number): Chain {
    const supportedIds = getAllSupportedChainIds();
    if (!supportedIds.includes(chainId as any)) {
      throw new Error(`Invalid chain ID: ${chainId}. Supported chains: ${supportedIds.join(", ")}`);
    }
    return getChain(chainId as any);
  }

  generateKey(params: GenerateKeyParams): KeyStoreEntry {
    this.getChainConfig(params.chainId);

    const { privateKey, address } = this.generatePrivateKey();

    const entry: KeyStoreEntry = {
      address,
      chainId: params.chainId,
      privateKey,
      createdAt: new Date()
    };

    const keyId = `${params.chainId}:${address}`;
    this.keyStore.set(keyId, entry);

    return entry;
  }

  importKey(params: ImportKeyParams): KeyStoreEntry {
    this.getChainConfig(params.chainId);
    this.validatePrivateKey(params.privateKey);

    const account = privateKeyToAccount(params.privateKey);
    const address = account.address;

    const entry: KeyStoreEntry = {
      address,
      chainId: params.chainId,
      privateKey: params.privateKey,
      createdAt: new Date()
    };

    const keyId = `${params.chainId}:${address}`;
    this.keyStore.set(keyId, entry);

    return entry;
  }

  exportKey(params: ExportKeyParams): string {
    const keyId = `${params.chainId}:${params.address}`;
    const entry = this.keyStore.get(keyId);

    if (!entry) {
      throw new Error(`Key not found for address: ${params.address} on chain: ${params.chainId}`);
    }

    return entry.privateKey as string;
  }

  async signTransaction(params: SignTransactionParams): Promise<SignedTransaction> {
    this.validatePrivateKey(params.privateKey);

    const config = this.getChainConfig(params.chainId);
    const account = privateKeyToAccount(params.privateKey);
    const walletClient = createWalletClient({
      chain: config,
      transport: http(),
      account
    });

    const signedTransaction = await walletClient.signTransaction(params.transaction);

    return {
      signedTransaction,
      hash: signedTransaction
    };
  }

  getKey(address: Address, chainId: number): KeyStoreEntry | undefined {
    const keyId = `${chainId}:${address}`;
    return this.keyStore.get(keyId);
  }

  listKeys(chainId?: number): KeyStoreEntry[] {
    if (chainId) {
      return Array.from(this.keyStore.values()).filter((entry) => entry.chainId === chainId);
    }

    return Array.from(this.keyStore.values());
  }

  deleteKey(address: Address, chainId: number): boolean {
    const keyId = `${chainId}:${address}`;
    return this.keyStore.delete(keyId);
  }

  private generatePrivateKey(): { privateKey: Hex; address: Address } {
    const privateKeyHex = this.generateSecureRandom(32);
    const account = privateKeyToAccount(privateKeyHex);
    const address = account.address;

    return {
      privateKey: privateKeyHex,
      address
    };
  }

  private validatePrivateKey(privateKey: Hex): void {
    if (!privateKey || privateKey.length === 0) {
      throw new Error("Private key cannot be empty");
    }

    try {
      const account = privateKeyToAccount(privateKey);
      if (!account.address || !/^0x[a-fA-F0-9]{40}$/.test(account.address)) {
        throw new Error("Invalid private key: cannot derive valid address");
      }
    } catch (error) {
      throw new Error("Invalid private key format");
    }
  }

  private generateSecureRandom(length: number): Hex {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `0x${hex}` as Hex;
  }
}
