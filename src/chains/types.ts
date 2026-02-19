/**
 * Chain configuration types and interfaces
 * Provides TypeScript type definitions for multi-chain support across the wallet system
 */

import type { Chain } from "viem";

/**
 * Native currency configuration for a blockchain
 */
export interface ChainNativeCurrency {
  /** Full name of the native token (e.g., "Ether", "Binance Coin") */
  name: string;

  /** Symbol/ticker of the native token (e.g., "ETH", "BNB", "POL") */
  symbol: string;

  /** Number of decimal places for the native token (typically 18 for EVM chains) */
  decimals: number;
}

/**
 * RPC endpoint configuration
 */
export interface ChainRpcUrls {
  /** Default HTTP RPC endpoints */
  default: string[];

  /** Public HTTP RPC endpoints (alternatives) */
  public: string[];

  /** WebSocket RPC endpoints (optional) */
  webSocket?: string[];
}

/**
 * Block explorer configuration
 */
export interface ChainBlockExplorers {
  /** Default block explorer URL */
  default: { name: string; url: string };

  /** Alternative block explorer URLs */
  public: Array<{ name: string; url: string }>;
}

/**
 * Complete chain configuration metadata
 * Extends Viem's Chain type with additional metadata
 */
export interface ChainConfig {
  /** Chain ID (unique identifier for the blockchain) */
  id: number;

  /** Human-readable chain name (e.g., "Ethereum", "BNB Smart Chain") */
  name: string;

  /** Native currency information */
  nativeCurrency: ChainNativeCurrency;

  /** RPC endpoint configuration */
  rpcUrls: ChainRpcUrls;

  /** Block explorer configuration */
  blockExplorers: ChainBlockExplorers;

  /** Average block time in seconds (optional) */
  blockTime?: number;

  /** Whether this is a testnet (optional) */
  testnet?: boolean;
}

/**
 * Union type of all supported chain IDs
 * Used for type-safe chain selection throughout the application
 */
export type SupportedChainId =
  | 1 // Ethereum Mainnet
  | 56 // BNB Smart Chain
  | 137 // Polygon
  | 42161 // Arbitrum One
  | 10 // Optimism
  | 43114 // Avalanche C-Chain
  | 8453 // Base
  | 324 // zkSync Era
  | 250 // Fantom
  | 100; // Gnosis

/**
 * Type guard to check if a number is a valid supported chain ID
 */
export function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return [1, 56, 137, 42161, 10, 43114, 8453, 324, 250, 100].includes(chainId as SupportedChainId);
}

/**
 * Get chain ID by name (case-insensitive)
 */
export function getChainIdByName(name: string): SupportedChainId | undefined {
  const nameMap = new Map<string, SupportedChainId>([
    ["ethereum", 1],
    ["bnb smart chain", 56],
    ["polygon", 137],
    ["arbitrum one", 42161],
    ["optimism", 10],
    ["avalanche", 43114],
    ["base", 8453],
    ["zksync era", 324],
    ["fantom", 250],
    ["gnosis", 100]
  ] as [string, SupportedChainId][]);

  return nameMap.get(name.toLowerCase());
}
