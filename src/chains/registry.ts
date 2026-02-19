/**
 * Chain registry helper functions
 * Provides validation and metadata utilities for chain operations
 */

import type { SupportedChainId, ChainNativeCurrency } from "./types";
import { getChain } from "./chainConfig";

/**
 * Validate if a chain ID is supported
 * @param chainId - The chain ID to validate
 * @returns True if the chain ID is in the supported list
 */
export function validateChainId(chainId: number): boolean {
  try {
    getChain(chainId as SupportedChainId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get chain metadata by chain ID
 * @param chainId - The chain ID to retrieve
 * @returns Chain native currency information, or undefined if not supported
 */
export function getChainMetadata(chainId: number):
  | {
      name: string;
      nativeCurrency: ChainNativeCurrency;
      id: number;
    }
  | undefined {
  try {
    const chain = getChain(chainId as SupportedChainId);
    return {
      name: chain.name,
      nativeCurrency: {
        name: chain.nativeCurrency.name,
        symbol: chain.nativeCurrency.symbol,
        decimals: chain.nativeCurrency.decimals
      },
      id: chain.id
    };
  } catch {
    return undefined;
  }
}

/**
 * Format chain address with EIP-1191 checksum if applicable
 * Currently a placeholder - can be enhanced later
 * @param address - The address to format
 * @param chainId - The chain ID for checksum context
 * @returns Formatted address
 */
export function formatAddress(address: string, chainId: number): string {
  // EIP-1191 checksum validation can be added here
  // For now, return address as-is
  return address;
}

/**
 * Get block explorer URL for a chain
 * @param chainId - The chain ID to get explorer for
 * @returns The default block explorer URL, or empty string if not supported
 */
export function getBlockExplorerUrl(chainId: number): string {
  try {
    const chain = getChain(chainId as SupportedChainId);
    return chain.blockExplorers?.default?.url ?? "";
  } catch {
    return "";
  }
}

/**
 * Get transaction URL for a block explorer
 * @param chainId - The chain ID to get explorer for
 * @param txHash - The transaction hash
 * @returns The full URL to view the transaction
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  try {
    const chain = getChain(chainId as SupportedChainId);
    const baseUrl = chain.blockExplorers?.default?.url;
    return baseUrl ? `${baseUrl}/tx/${txHash}` : "";
  } catch {
    return "";
  }
}

/**
 * Get address URL for a block explorer
 * @param chainId - The chain ID to get explorer for
 * @param address - The address to view
 * @returns The full URL to view the address
 */
export function getAddressUrl(chainId: number, address: string): string {
  try {
    const chain = getChain(chainId as SupportedChainId);
    const baseUrl = chain.blockExplorers?.default?.url;
    return baseUrl ? `${baseUrl}/address/${address}` : "";
  } catch {
    return "";
  }
}

/**
 * Get all supported chain information as an array
 * Useful for UI dropdowns and chain selection
 * @returns Array of chain objects with ID and name
 */
export function getAllChainInfo(): Array<{
  id: number;
  name: string;
  nativeSymbol: string;
}> {
  const chains = [
    { id: 1, name: "Ethereum", nativeSymbol: "ETH" },
    { id: 56, name: "BNB Smart Chain", nativeSymbol: "BNB" },
    { id: 137, name: "Polygon", nativeSymbol: "POL" },
    { id: 42161, name: "Arbitrum One", nativeSymbol: "ETH" },
    { id: 10, name: "Optimism", nativeSymbol: "ETH" },
    { id: 43114, name: "Avalanche C-Chain", nativeSymbol: "AVAX" },
    { id: 8453, name: "Base", nativeSymbol: "ETH" },
    { id: 324, name: "zkSync Era", nativeSymbol: "ETH" },
    { id: 250, name: "Fantom", nativeSymbol: "FTM" },
    { id: 100, name: "Gnosis", nativeSymbol: "XDAI" }
  ];

  return chains;
}
