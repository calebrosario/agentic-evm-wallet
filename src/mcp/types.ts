import { z } from "zod";

export const ChainIdSchema = z
  .number()
  .int()
  .positive()
  .describe(
    "EVM Chain ID (1=Ethereum, 137=Polygon, 56=BSC, 42161=Arbitrum, 10=Optimism, 43114=Avalanche, 8453=Base, 324=zkSync, 250=Fantom, 100=Gnosis)"
  );

export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .describe("EVM address (0x prefix, 40 hex chars)");

export const PrivateKeySchema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/)
  .describe("Private key (64 hex chars)");

export const HexStringSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/)
  .describe("Hex string with 0x prefix");

export const TOOL_NAMES = {
  GET_SUPPORTED_CHAINS: "get_supported_chains",
  GET_CHAIN_INFO: "get_chain_info",
  CREATE_WALLET: "create_wallet",
  IMPORT_WALLET: "import_wallet",
  GET_BALANCE: "get_balance",
  GET_ADDRESS: "get_address",
  ESTIMATE_GAS: "estimate_gas",
  GET_GAS_PRICE: "get_gas_price",
  GET_RATE_LIMIT_STATUS: "get_rate_limit_status",
  PREPARE_TRANSACTION: "prepare_transaction",
  GET_PENDING_TRANSACTIONS: "get_pending_transactions",
  AUTHORIZE_TRANSACTION: "authorize_transaction",
  EXECUTE_TRANSACTION: "execute_transaction"
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
