import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Address } from "viem";
import { z } from "zod";
import { WalletManager } from "@/wallet/walletManager";
import { GasManager } from "@/gas/gasManager";
import { KeyManager } from "@/key/keyManager";
import { TransactionExecutor } from "@/execution/transactionExecutor";
import { getAllChainInfo } from "@/chains/registry";
import { getChain, getAllSupportedChainIds, isChainSupported } from "@/chains/chainConfig";
import { AgentRateLimiter } from "@/security/rateLimiter";
import { TransactionApprovalManager } from "@/security/transactionApproval";
import {
  TOOL_NAMES,
  ChainIdSchema,
  AddressSchema,
  PrivateKeySchema,
  HexStringSchema
} from "./types";

export class WalletTools {
  private walletManager: WalletManager;
  private gasManager: GasManager;
  private keyManager: KeyManager;
  private transactionExecutor: TransactionExecutor;
  private readonly rateLimiter = new AgentRateLimiter();
  private readonly approvalManager = new TransactionApprovalManager();

  constructor() {
    this.walletManager = new WalletManager();
    this.gasManager = new GasManager();
    this.keyManager = new KeyManager();
    this.transactionExecutor = new TransactionExecutor({
      keyManager: this.keyManager,
      enableEvents: false
    });
  }

  registerAll(server: McpServer): void {
    this.registerGetSupportedChains(server);
    this.registerGetChainInfo(server);
    this.registerCreateWallet(server);
    this.registerImportWallet(server);
    this.registerGetBalance(server);
    this.registerGetAddress(server);
    this.registerEstimateGas(server);
    this.registerGetGasPrice(server);
    this.registerGetRateLimitStatus(server);
    this.registerPrepareTransaction(server);
    this.registerGetPendingTransactions(server);
    this.registerAuthorizeTransaction(server);
    this.registerExecuteTransaction(server);
  }

  private registerGetSupportedChains(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_SUPPORTED_CHAINS,
      "List all supported EVM chains with their IDs and native tokens",
      {},
      async () => {
        const chains = getAllChainInfo();
        const supportedIds = getAllSupportedChainIds();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  chains: chains.map((c) => ({
                    id: c.id,
                    name: c.name,
                    nativeSymbol: c.nativeSymbol
                  })),
                  totalSupported: supportedIds.length
                },
                null,
                2
              )
            }
          ]
        };
      }
    );
  }

  private registerGetChainInfo(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_CHAIN_INFO,
      "Get detailed information about a specific chain including native currency and block explorer",
      { chainId: ChainIdSchema },
      async ({ chainId }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        const chain = getChain(chainId as any);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: chain.id,
                  name: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  blockExplorer: chain.blockExplorers?.default?.url || null,
                  rpcUrls: chain.rpcUrls?.default?.http || []
                },
                null,
                2
              )
            }
          ]
        };
      }
    );
  }

  private registerCreateWallet(server: McpServer): void {
    server.tool(
      TOOL_NAMES.CREATE_WALLET,
      "Create a new wallet on the specified chain. Returns the wallet address and chain info.",
      { chainId: ChainIdSchema },
      async ({ chainId }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const wallet = await this.walletManager.createWallet(chainId);
          const chain = getChain(chainId as any);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    address: wallet.address,
                    chainId: wallet.chainId,
                    chainName: chain.name,
                    nativeSymbol: chain.nativeCurrency.symbol
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to create wallet: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerImportWallet(server: McpServer): void {
    server.tool(
      TOOL_NAMES.IMPORT_WALLET,
      "Import an existing wallet using a private key. Optionally specify a chain ID (defaults to Ethereum).",
      { privateKey: PrivateKeySchema, chainId: ChainIdSchema.optional().default(1) },
      async ({ privateKey, chainId }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const wallet = await this.walletManager.importWallet({ privateKey, chainId });
          const chain = getChain(chainId as any);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    address: wallet.address,
                    chainId: wallet.chainId,
                    chainName: chain.name,
                    nativeSymbol: chain.nativeCurrency.symbol
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to import wallet: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerGetBalance(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_BALANCE,
      "Get the balance of the wallet on a specific chain. Optionally specify an ERC-20 token address.",
      {
        chainId: ChainIdSchema,
        tokenAddress: AddressSchema.optional().describe("ERC-20 token address (omit for native)")
      },
      async ({ chainId, tokenAddress }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const balance = await this.walletManager.getBalance(
            chainId,
            tokenAddress as Address | undefined
          );
          const chain = getChain(chainId as any);
          const formatted = (Number(balance) / 1e18).toFixed(6);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    balance: balance.toString(),
                    formatted,
                    symbol: tokenAddress ? "ERC20" : chain.nativeCurrency.symbol,
                    chainId,
                    tokenAddress: tokenAddress || null
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to get balance: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerGetAddress(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_ADDRESS,
      "Get the wallet address for a specific chain",
      { chainId: ChainIdSchema },
      async ({ chainId }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const address = await this.walletManager.getWalletAddress(chainId);
          const chain = getChain(chainId as any);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ address, chainId, chainName: chain.name }, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to get address: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerEstimateGas(server: McpServer): void {
    server.tool(
      TOOL_NAMES.ESTIMATE_GAS,
      "Estimate the gas required for a transaction",
      {
        chainId: ChainIdSchema,
        to: AddressSchema.describe("Recipient address"),
        value: z.string().optional().describe("Value in wei"),
        data: HexStringSchema.optional().describe("Transaction data")
      },
      async ({ chainId, to, value, data }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const gasEstimate = await this.gasManager.estimateGas(chainId, {
            to: to as Address,
            value: value ? BigInt(value) : undefined,
            data: data as `0x${string}` | undefined
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ gasLimit: gasEstimate.toString(), chainId }, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to estimate gas: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerGetGasPrice(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_GAS_PRICE,
      "Get the current gas price for a specific chain",
      { chainId: ChainIdSchema },
      async ({ chainId }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }
        try {
          const { gasPrice } = await this.gasManager.getGasPrice(chainId);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    gasPrice: gasPrice.toString(),
                    gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(2),
                    chainId
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to get gas price: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerExecuteTransaction(server: McpServer): void {
    server.tool(
      TOOL_NAMES.EXECUTE_TRANSACTION,
      "Execute a transaction on the specified chain. Requires a wallet to exist for the chain.",
      {
        chainId: ChainIdSchema,
        to: AddressSchema.describe("Recipient address"),
        value: z.string().optional().describe("Value in wei"),
        data: HexStringSchema.optional().describe("Transaction data"),
        gasLimit: z.string().optional().describe("Gas limit"),
        maxFeePerGas: z.string().optional().describe("Max fee per gas (wei)"),
        maxPriorityFeePerGas: z.string().optional().describe("Max priority fee (wei)"),
        transactionId: z.string().describe("Transaction ID from prepare_transaction (required)")
      },
      async ({
        chainId,
        to,
        value,
        data,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        transactionId
      }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }

        const rateLimitCheck = await this.rateLimiter.checkTransactionLimit(chainId, to as Address);
        if (!rateLimitCheck.allowed) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Rate limit exceeded",
                  remaining: rateLimitCheck.remaining,
                  resetTime: new Date(rateLimitCheck.resetTime).toISOString()
                })
              }
            ],
            isError: true
          };
        }

        try {
          const address = await this.walletManager.getWalletAddress(chainId);
          const keyEntry = this.keyManager.generateKey({ chainId });
          const keyId = `${chainId}:${keyEntry.address}`;

          if (transactionId) {
            const pendingTx = this.approvalManager.getTransaction(transactionId);
            if (!pendingTx || pendingTx.status !== "approved") {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      error: transactionId
                        ? `Transaction ${transactionId} not found or not approved`
                        : "Transaction ID required when not using skip approval"
                    })
                  }
                ],
                isError: true
              };
            }
          }

          const result = await this.transactionExecutor.executeTransaction({
            keyId,
            chainId,
            transaction: {
              to: to as Address,
              value: value ? BigInt(value) : 0n,
              data: data as `0x${string}` | undefined,
              gas: gasLimit ? BigInt(gasLimit) : undefined,
              maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
              maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : undefined
            }
          });

          if (transactionId) {
            this.approvalManager.markExecuted(transactionId, result.hash);
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    hash: result.hash,
                    status: result.status,
                    chainId,
                    blockNumber: result.blockNumber?.toString(),
                    gasUsed: result.gasUsed?.toString()
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to execute transaction: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerGetRateLimitStatus(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_RATE_LIMIT_STATUS,
      "Check current rate limit status and remaining requests",
      {},
      async () => {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                message: "Rate limit status retrieved",
                maxRequestsPerWindow: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
                windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
                maxTransactionsPerHour: Number(process.env.MAX_TRANSACTIONS_PER_HOUR) || 10,
                maxTransactionsPerDay: Number(process.env.MAX_TRANSACTIONS_PER_DAY) || 1000
              })
            }
          ]
        };
      }
    );
  }

  private registerPrepareTransaction(server: McpServer): void {
    const valueSchema = z.string().describe("Value in wei");
    const dataSchema = HexStringSchema.optional().describe("Transaction data");

    server.tool(
      TOOL_NAMES.PREPARE_TRANSACTION,
      "Prepare a transaction for approval. Returns an approval token required for execution.",
      {
        chainId: ChainIdSchema,
        to: AddressSchema.describe("Recipient address"),
        value: valueSchema.optional(),
        data: dataSchema.optional()
      },
      async ({ chainId, to, value, data }) => {
        if (!isChainSupported(chainId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Chain ID ${chainId} is not supported`,
                  supportedChains: getAllSupportedChainIds()
                })
              }
            ],
            isError: true
          };
        }

        try {
          const address = await this.walletManager.getWalletAddress(chainId);
          const txValue = value ? BigInt(value) : 0n;

          const sizeCheck = this.approvalManager.checkTransactionSize(txValue);
          if (!sizeCheck.allowed) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: sizeCheck.message
                  })
                }
              ],
              isError: true
            };
          }

          const result = this.approvalManager.prepareTransaction({
            chainId,
            from: address,
            to: to as Address,
            value: txValue,
            data: data as `0x${string}` | undefined
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  transactionId: result.transactionId,
                  approvalToken: result.approvalToken,
                  expiresAt: new Date(result.expiresAt).toISOString(),
                  message:
                    "Transaction prepared. Use authorize_transaction with approval token to execute."
                })
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to prepare transaction: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerGetPendingTransactions(server: McpServer): void {
    server.tool(
      TOOL_NAMES.GET_PENDING_TRANSACTIONS,
      "Get all pending transactions awaiting approval",
      {},
      async () => {
        try {
          const pending = this.approvalManager.getPendingTransactions();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  transactions: pending.map((tx) => ({
                    id: tx.id,
                    chainId: tx.chainId,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value.toString(),
                    createdAt: new Date(tx.createdAt).toISOString(),
                    expiresAt: new Date(tx.expiresAt).toISOString()
                  }))
                })
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to get pending transactions: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private registerAuthorizeTransaction(server: McpServer): void {
    const tokenSchema = z.string().describe("Approval token from prepare_transaction");

    server.tool(
      TOOL_NAMES.AUTHORIZE_TRANSACTION,
      "Authorize a pending transaction for execution using approval token",
      {
        transactionId: tokenSchema,
        approvalToken: tokenSchema
      },
      async ({ transactionId, approvalToken }) => {
        try {
          const result = this.approvalManager.authorizeTransaction(transactionId, approvalToken);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: result.success,
                  transactionId: result.transactionId,
                  message: result.message
                })
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Failed to authorize transaction: ${(error as Error).message}`
                })
              }
            ],
            isError: true
          };
        }
      }
    );
  }
}
