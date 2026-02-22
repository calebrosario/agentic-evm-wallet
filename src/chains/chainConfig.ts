/**
 * Centralized chain configuration for multi-chain EVM wallet
 * Provides single source of truth for all supported EVM chains
 */

import type { Chain } from "viem";
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  avalanche,
  base,
  zkSync,
  fantom,
  gnosis
} from "viem/chains";
import type { SupportedChainId } from "./types";

/**
 * Custom Ethereum chain with PublicNode RPC
 * Free, reliable endpoint for testing
 */
const mainnetWithPublicNode: Chain = {
  ...mainnet,
  rpcUrls: {
    default: {
      http: ["https://ethereum.publicnode.com"],
      webSocket: ["wss://ethereum.publicnode.com"]
    },
    public: {
      http: ["https://ethereum.publicnode.com"],
      webSocket: ["wss://ethereum.publicnode.com"]
    }
  }
};

/**
 * Custom Polygon chain with dRPC endpoint
 * The default polygon-rpc.com is deprecated (stopped Feb 16, 2026)
 * dRPC provides free access without authentication
 */
const polygonWithDrpc: Chain = {
  ...polygon,
  rpcUrls: {
    default: {
      http: ["https://polygon.drpc.org"],
      webSocket: ["wss://polygon.drpc.org"]
    },
    public: {
      http: ["https://polygon.drpc.org"],
      webSocket: ["wss://polygon.drpc.org"]
    }
  }
};

/**
 * Centralized registry of all supported chains
 * Provides type-safe access to chain configurations across the application
 */
export const CHAINS: Map<SupportedChainId, Chain> = new Map([
  [1, mainnetWithPublicNode as Chain],
  [56, bsc as Chain],
  [137, polygonWithDrpc as Chain],
  [42161, arbitrum as Chain],
  [10, optimism as Chain],
  [43114, avalanche as Chain],
  [8453, base as Chain],
  [324, zkSync as Chain],
  [250, fantom as Chain],
  [100, gnosis as Chain]
]);

/**
 * Get chain configuration by chain ID
 * @param chainId - The chain ID to retrieve
 * @returns The Chain object for the specified chain
 * @throws Error if chain ID is not supported
 */
export function getChain(chainId: SupportedChainId): Chain {
  const chain = CHAINS.get(chainId);
  if (!chain) {
    throw new Error(
      `Invalid chain ID: ${chainId}. Supported chains: ${Array.from(CHAINS.keys()).join(", ")}`
    );
  }
  return chain;
}

/**
 * Get chain configuration by chain ID (backward compatible)
 * @param chainId - The chain ID to retrieve
 * @returns The Chain object for the specified chain, or undefined if not found
 */
export function getChainConfig(chainId: number): Chain | undefined {
  return CHAINS.get(chainId as SupportedChainId);
}

/**
 * Get all configured chains
 * @returns Map of all supported chains keyed by chain ID
 */
export function getAllChains(): Map<SupportedChainId, Chain> {
  return new Map(CHAINS);
}

/**
 * Get all supported chain IDs
 * @returns Array of all supported chain IDs
 */
export function getAllSupportedChainIds(): SupportedChainId[] {
  return Array.from(CHAINS.keys());
}

/**
 * Check if a chain ID is supported
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported, false otherwise
 */
export function isChainSupported(chainId: number): boolean {
  return CHAINS.has(chainId as SupportedChainId);
}

/**
 * Get chain by chain ID with type safety
 * @param chainId - The chain ID to retrieve
 * @returns The Chain object if supported, throws otherwise
 */
export function getChainOrThrow(chainId: number): Chain {
  return getChain(chainId as SupportedChainId);
}
