import { describe, test, expect } from "bun:test";
import {
  ChainIdSchema,
  AddressSchema,
  PrivateKeySchema,
  HexStringSchema,
  TOOL_NAMES
} from "@/mcp/types";

describe("MCP Types and Schemas", () => {
  describe("ChainIdSchema", () => {
    test("should validate valid chain IDs", () => {
      expect(ChainIdSchema.safeParse(1).success).toBe(true);
      expect(ChainIdSchema.safeParse(137).success).toBe(true);
      expect(ChainIdSchema.safeParse(56).success).toBe(true);
      expect(ChainIdSchema.safeParse(42161).success).toBe(true);
    });

    test("should reject invalid chain IDs", () => {
      expect(ChainIdSchema.safeParse(0).success).toBe(false);
      expect(ChainIdSchema.safeParse(-1).success).toBe(false);
      expect(ChainIdSchema.safeParse(1.5).success).toBe(false);
      expect(ChainIdSchema.safeParse("1").success).toBe(false);
    });
  });

  describe("AddressSchema", () => {
    test("should validate valid Ethereum addresses", () => {
      expect(AddressSchema.safeParse("0x0000000000000000000000000000000000000000").success).toBe(
        true
      );
      expect(AddressSchema.safeParse("0x1234567890123456789012345678901234567890").success).toBe(
        true
      );
      expect(AddressSchema.safeParse("0xABCDEFabcdef0123456789012345678901234567").success).toBe(
        true
      );
    });

    test("should reject invalid addresses", () => {
      expect(AddressSchema.safeParse("0x123").success).toBe(false);
      expect(AddressSchema.safeParse("1234567890123456789012345678901234567890").success).toBe(
        false
      );
      expect(AddressSchema.safeParse("0xGHIJKLabcdef012345678901234567890123456").success).toBe(
        false
      );
      expect(AddressSchema.safeParse("").success).toBe(false);
    });
  });

  describe("PrivateKeySchema", () => {
    test("should validate valid private keys", () => {
      const validKey = "a".repeat(64);
      expect(PrivateKeySchema.safeParse(validKey).success).toBe(true);
      expect(PrivateKeySchema.safeParse("0x" + validKey).success).toBe(true);
    });

    test("should reject invalid private keys", () => {
      expect(PrivateKeySchema.safeParse("abc").success).toBe(false);
      expect(PrivateKeySchema.safeParse("0x" + "g".repeat(64)).success).toBe(false);
      expect(PrivateKeySchema.safeParse("").success).toBe(false);
    });
  });

  describe("HexStringSchema", () => {
    test("should validate valid hex strings", () => {
      expect(HexStringSchema.safeParse("0x").success).toBe(true);
      expect(HexStringSchema.safeParse("0x1234").success).toBe(true);
      expect(HexStringSchema.safeParse("0xabcdef").success).toBe(true);
      expect(HexStringSchema.safeParse("0xABCDEF").success).toBe(true);
    });

    test("should reject invalid hex strings", () => {
      expect(HexStringSchema.safeParse("1234").success).toBe(false);
      expect(HexStringSchema.safeParse("0xGHIJ").success).toBe(false);
      expect(HexStringSchema.safeParse("").success).toBe(false);
    });
  });

  describe("TOOL_NAMES", () => {
    test("should have all expected tool names", () => {
      expect(TOOL_NAMES.GET_SUPPORTED_CHAINS).toBe("get_supported_chains");
      expect(TOOL_NAMES.GET_CHAIN_INFO).toBe("get_chain_info");
      expect(TOOL_NAMES.CREATE_WALLET).toBe("create_wallet");
      expect(TOOL_NAMES.IMPORT_WALLET).toBe("import_wallet");
      expect(TOOL_NAMES.GET_BALANCE).toBe("get_balance");
      expect(TOOL_NAMES.GET_ADDRESS).toBe("get_address");
      expect(TOOL_NAMES.ESTIMATE_GAS).toBe("estimate_gas");
      expect(TOOL_NAMES.GET_GAS_PRICE).toBe("get_gas_price");
      expect(TOOL_NAMES.GET_RATE_LIMIT_STATUS).toBe("get_rate_limit_status");
      expect(TOOL_NAMES.PREPARE_TRANSACTION).toBe("prepare_transaction");
      expect(TOOL_NAMES.GET_PENDING_TRANSACTIONS).toBe("get_pending_transactions");
      expect(TOOL_NAMES.AUTHORIZE_TRANSACTION).toBe("authorize_transaction");
      expect(TOOL_NAMES.EXECUTE_TRANSACTION).toBe("execute_transaction");
    });

    test("should have 13 tool names", () => {
      expect(Object.keys(TOOL_NAMES).length).toBe(13);
    });
  });
});
