import type { Address, Transaction } from "viem";
import { SignableMessage } from "viem";

export interface PrivateKey {
  privateKey: string;
}

export interface PublicKey {
  address: Address;
  publicKey: string;
}

export interface KeyPair {
  privateKey: PrivateKey;
  publicKey: PublicKey;
}

export interface EncryptedKey {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  algorithm: string;
}

export interface KeyStoreConfig {
  encryptionEnabled: boolean;
  algorithm: string;
}

export interface KeyGeneratorOptions {
  derivationPath?: string;
}

export interface SignerOptions {
  chainId: number;
}

export interface SignedMessage {
  message: `0x${string}`;
  signature: `0x${string}`;
  address: Address;
}

export interface SignedTransaction {
  transaction: Transaction;
  signature: `0x${string}`;
  address: Address;
}
