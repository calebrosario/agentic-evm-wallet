import { describe, test, expect } from "bun:test";
import {
  getChain,
  getChainConfig,
  getAllChains,
  getAllSupportedChainIds,
  isChainSupported,
  getChainOrThrow,
  CHAINS
} from "@/chains/chainConfig";
import { validateChainId, getChainMetadata, getAllChainInfo } from "@/chains/registry";
import type { SupportedChainId } from "@/chains/types";

describe("Chain Configuration", () => {
  describe("getChain", () => {
    test("should return correct chain for Ethereum (1)", () => {
      const chain = getChain(1 as SupportedChainId);
      expect(chain.id).toBe(1);
      expect(chain.name).toBe("Ethereum");
    });

    test("should return correct chain for Polygon (137)", () => {
      const chain = getChain(137 as SupportedChainId);
      expect(chain.id).toBe(137);
      expect(chain.name).toBe("Polygon");
    });

    test("should return correct chain for BNB Smart Chain (56)", () => {
      const chain = getChain(56 as SupportedChainId);
      expect(chain.id).toBe(56);
      expect(chain.name).toBe("BNB Smart Chain");
    });

    test("should return correct chain for Arbitrum One (42161)", () => {
      const chain = getChain(42161 as SupportedChainId);
      expect(chain.id).toBe(42161);
      expect(chain.name).toBe("Arbitrum One");
    });

    test("should return correct chain for Optimism (10)", () => {
      const chain = getChain(10 as SupportedChainId);
      expect(chain.id).toBe(10);
      expect(chain.name).toBe("OP Mainnet");
    });

    test("should return correct chain for Avalanche (43114)", () => {
      const chain = getChain(43114 as SupportedChainId);
      expect(chain.id).toBe(43114);
      expect(chain.name).toBe("Avalanche");
    });

    test("should return correct chain for Base (8453)", () => {
      const chain = getChain(8453 as SupportedChainId);
      expect(chain.id).toBe(8453);
      expect(chain.name).toBe("Base");
    });

    test("should return correct chain for zkSync Era (324)", () => {
      const chain = getChain(324 as SupportedChainId);
      expect(chain.id).toBe(324);
      expect(chain.name).toBe("ZKsync Era");
    });

    test("should return correct chain for Fantom (250)", () => {
      const chain = getChain(250 as SupportedChainId);
      expect(chain.id).toBe(250);
      expect(chain.name).toBe("Fantom");
    });

    test("should return correct chain for Gnosis (100)", () => {
      const chain = getChain(100 as SupportedChainId);
      expect(chain.id).toBe(100);
      expect(chain.name).toBe("Gnosis");
    });

    test("should throw for invalid chain ID", () => {
      expect(() => getChain(999999 as SupportedChainId)).toThrow();
    });
  });

  describe("getChainConfig (backward compatible)", () => {
    test("should return chain for valid chain ID", () => {
      const chain = getChainConfig(1);
      expect(chain?.id).toBe(1);
    });

    test("should return undefined for invalid chain ID", () => {
      const chain = getChainConfig(999999);
      expect(chain).toBeUndefined();
    });
  });

  describe("getAllChains", () => {
    test("should return all 10 chains", () => {
      const chains = getAllChains();
      expect(chains.size).toBe(10);
    });

    test("should include Ethereum", () => {
      const chains = getAllChains();
      expect(chains.has(1 as SupportedChainId)).toBe(true);
    });

    test("should include all expected chain IDs", () => {
      const chains = getAllChains();
      const expectedIds = [1, 56, 137, 42161, 10, 43114, 8453, 324, 250, 100];
      expectedIds.forEach((id) => {
        expect(chains.has(id as SupportedChainId)).toBe(true);
      });
    });
  });

  describe("getAllSupportedChainIds", () => {
    test("should return array of 10 chain IDs", () => {
      const ids = getAllSupportedChainIds();
      expect(ids.length).toBe(10);
    });

    test("should include Ethereum (1)", () => {
      const ids = getAllSupportedChainIds();
      expect(ids.includes(1 as SupportedChainId)).toBe(true);
    });

    test("should include Polygon (137)", () => {
      const ids = getAllSupportedChainIds();
      expect(ids.includes(137 as SupportedChainId)).toBe(true);
    });
  });

  describe("isChainSupported", () => {
    test("should return true for Ethereum", () => {
      expect(isChainSupported(1)).toBe(true);
    });

    test("should return true for Polygon", () => {
      expect(isChainSupported(137)).toBe(true);
    });

    test("should return false for invalid chain ID", () => {
      expect(isChainSupported(999999)).toBe(false);
    });
  });

  describe("getChainOrThrow", () => {
    test("should return chain for valid chain ID", () => {
      const chain = getChainOrThrow(1);
      expect(chain.id).toBe(1);
    });

    test("should throw for invalid chain ID", () => {
      expect(() => getChainOrThrow(999999)).toThrow();
    });
  });

  describe("CHAINS export", () => {
    test("should be a Map with 10 entries", () => {
      expect(CHAINS instanceof Map).toBe(true);
      expect(CHAINS.size).toBe(10);
    });
  });
});

describe("Chain Registry", () => {
  describe("validateChainId", () => {
    test("should return true for valid chain IDs", () => {
      expect(validateChainId(1)).toBe(true);
      expect(validateChainId(137)).toBe(true);
      expect(validateChainId(56)).toBe(true);
    });

    test("should return false for invalid chain IDs", () => {
      expect(validateChainId(999999)).toBe(false);
      expect(validateChainId(0)).toBe(false);
    });
  });

  describe("getChainMetadata", () => {
    test("should return metadata for Ethereum", () => {
      const metadata = getChainMetadata(1);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe("Ethereum");
      expect(metadata?.nativeCurrency.symbol).toBe("ETH");
      expect(metadata?.id).toBe(1);
    });

    test("should return metadata for Polygon", () => {
      const metadata = getChainMetadata(137);
      expect(metadata).toBeDefined();
      expect(metadata?.nativeCurrency.symbol).toBe("POL");
    });

    test("should return undefined for invalid chain ID", () => {
      const metadata = getChainMetadata(999999);
      expect(metadata).toBeUndefined();
    });
  });

  describe("getAllChainInfo", () => {
    test("should return array of 10 chain info objects", () => {
      const info = getAllChainInfo();
      expect(info.length).toBe(10);
    });

    test("should include Ethereum with correct symbol", () => {
      const info = getAllChainInfo();
      const eth = info.find((c) => c.id === 1);
      expect(eth).toBeDefined();
      expect(eth?.nativeSymbol).toBe("ETH");
    });

    test("should include all expected chain IDs", () => {
      const info = getAllChainInfo();
      const ids = info.map((c) => c.id);
      expect(ids).toContain(1);
      expect(ids).toContain(56);
      expect(ids).toContain(137);
      expect(ids).toContain(42161);
      expect(ids).toContain(10);
      expect(ids).toContain(43114);
      expect(ids).toContain(8453);
      expect(ids).toContain(324);
      expect(ids).toContain(250);
      expect(ids).toContain(100);
    });
  });
});
