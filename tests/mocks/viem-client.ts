/**
 * Mock utilities for viem clients in tests
 *
 * This module provides mock implementations of viem's PublicClient and WalletClient
 * to enable unit testing without making actual RPC calls to the blockchain.
 */

import type { Chain, PublicClient, WalletClient, Address, TransactionRequest, Hash } from "viem";

/**
 * Mock transaction receipt for successful execution
 */
export const MOCK_TX_RECEIPT = {
  transactionHash: "0xabc123def45678901234567890123456789012345678901234567890" as Hash,
  blockHash: "0xdef123abc45678901234567890123456789012345678901234567890" as Hash,
  blockNumber: 12345678n,
  from: "0x1234567890123456789012345678901234567890" as Address,
  to: "0x9876543210987654321098765432109876543210" as Address,
  status: "success",
  contractAddress: null,
  cumulativeGasUsed: 21000n,
  gasUsed: 21000n,
  logs: [],
  transactionIndex: 0,
  logsBloom:
    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  type: "0x0",
  effectiveGasPrice: 20000000000n,
  confirmations: 1
} as const;

/**
 * Mock public client that returns predefined values without making RPC calls
 */
export class MockPublicClient implements PublicClient {
  chain: Chain;
  transport: any;
  account: any;

  constructor(chain: Chain) {
    this.chain = chain;
    this.transport = { name: "mock" };
    this.account = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request(params: any): Promise<any> {
    const method = params.method;

    // Mock getBalance - return 10 ETH balance
    if (method === "eth_getBalance") {
      return "0x8ac7230489e80000"; // 10 ETH in hex
    }

    // Mock getTransactionCount - return nonce 0
    if (method === "eth_getTransactionCount") {
      return "0x0";
    }

    // Mock estimateGas - return 21000
    if (method === "eth_estimateGas") {
      return "0x5208"; // 21000 in hex
    }

    // Mock getGasPrice - return 20 gwei
    if (method === "eth_gasPrice") {
      return "0x4a817c800"; // 20000000000 in hex (20 gwei)
    }

    // Mock getBlockByNumber - return block data
    if (method === "eth_getBlockByNumber") {
      return {
        number: "0xbc614e", // 12345678 in hex
        hash: "0xdef..." as Hash,
        parentHash: "0xabc..." as Hash,
        timestamp: "0x" + Math.floor(Date.now() / 1000).toString(16)
      };
    }

    throw new Error(`Unexpected RPC method: ${method}`);
  }

  async getBalance(address: Address, blockTag?: string): Promise<bigint> {
    // Return 10 ETH balance for all addresses
    return 10n * 10n ** 18n;
  }

  async getTransactionCount(address: Address): Promise<number> {
    // Return nonce 0 for all addresses
    return 0;
  }

  async estimateGas(request: TransactionRequest): Promise<bigint> {
    // Return 21000 gas for simple transfers
    return 21000n;
  }

  async getGasPrice(): Promise<bigint> {
    // Return 20 gwei
    return 20000000000n;
  }

  async getBlock(blockTag: string | bigint): Promise<any> {
    return {
      number: 12345678n,
      hash: "0xdef..." as Hash,
      timestamp: Date.now()
    };
  }

  async getTransactionReceipt(hash: Hash): Promise<typeof MOCK_TX_RECEIPT> {
    // Return mock receipt for any transaction hash
    return MOCK_TX_RECEIPT;
  }

  async waitForTransactionReceipt(hash: Hash): Promise<typeof MOCK_TX_RECEIPT> {
    // Return mock receipt immediately
    return MOCK_TX_RECEIPT;
  }

  // Add mock implementations for other methods
  extend(options: any): PublicClient {
    return this;
  }
}

/**
 * Mock wallet client that simulates transaction signing and broadcasting
 */
export class MockWalletClient implements WalletClient {
  chain: Chain;
  transport: any;
  account: Address;

  constructor(chain: Chain, account: Address) {
    this.chain = chain;
    this.transport = { name: "mock" };
    this.account = account;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request(params: any): Promise<any> {
    const method = params.method;

    // Mock sendTransaction - return transaction hash
    if (method === "eth_sendTransaction") {
      return "0xabc123def45678901234567890123456789012345678901234567890" as Hash;
    }

    throw new Error(`Unexpected RPC method: ${method}`);
  }

  async sendTransaction(request: TransactionRequest): Promise<Hash> {
    // Return mock transaction hash
    return "0xabc123def45678901234567890123456789012345678901234567890" as Hash;
  }

  async signTransaction(request: TransactionRequest): Promise<Hash> {
    // Return mock signature
    return "0xabc123def45678901234567890123456789012345678901234567890" as Hash;
  }

  async prepareTransactionRequest(request: TransactionRequest): Promise<TransactionRequest> {
    // Return the request as-is
    return request;
  }

  // Add mock implementations for other methods
  extend(options: any): WalletClient {
    return this;
  }
}

/**
 * Mock chain for testing
 */
export const MOCK_CHAIN = {
  id: 1,
  name: "Mock Ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
    public: { http: ["http://localhost:8545"] }
  },
  blockExplorers: {
    default: { name: "Mock Explorer", url: "http://localhost" }
  },
  contracts: {}
} as Chain;

/**
 * Helper to create mock public client
 */
export function createMockPublicClient(chain?: Chain): MockPublicClient {
  return new MockPublicClient(chain || MOCK_CHAIN);
}

/**
 * Helper to create mock wallet client
 */
export function createMockWalletClient(chain?: Chain, account?: Address): MockWalletClient {
  return new MockWalletClient(
    chain || MOCK_CHAIN,
    account || ("0x1234567890123456789012345678901234567890" as Address)
  );
}

/**
 * Spy function to track RPC calls
 */
export function createRpcSpy() {
  const calls: { method: string; params: any }[] = [];

  return {
    calls,
    trackCall: (method: string, params: any) => {
      calls.push({ method, params });
    },
    getCallCount: (method: string) => {
      return calls.filter((c) => c.method === method).length;
    },
    getLastCall: (method: string) => {
      const methodCalls = calls.filter((c) => c.method === method);
      return methodCalls[methodCalls.length - 1];
    },
    reset: () => {
      calls.length = 0;
    }
  };
}
