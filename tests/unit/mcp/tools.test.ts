import { describe, test, expect, beforeEach, mock } from "bun:test";
import { WalletTools } from "@/mcp/tools";
import { TOOL_NAMES } from "@/mcp/types";

describe("WalletTools", () => {
  let walletTools: WalletTools;

  beforeEach(() => {
    walletTools = new WalletTools();
  });

  describe("constructor", () => {
    test("should initialize all managers", () => {
      expect(walletTools).toBeDefined();
    });
  });

  describe("registerAll", () => {
    test("should register all 13 tools", () => {
      const mockServer = {
        tool: mock(() => {})
      } as any;

      walletTools.registerAll(mockServer);

      expect(mockServer.tool).toHaveBeenCalledTimes(13);
    });

    test("should register tools with correct names", () => {
      const registeredNames: string[] = [];
      const mockServer = {
        tool: mock((name: string) => {
          registeredNames.push(name);
        })
      } as any;

      walletTools.registerAll(mockServer);

      expect(registeredNames).toContain(TOOL_NAMES.GET_SUPPORTED_CHAINS);
      expect(registeredNames).toContain(TOOL_NAMES.GET_CHAIN_INFO);
      expect(registeredNames).toContain(TOOL_NAMES.CREATE_WALLET);
      expect(registeredNames).toContain(TOOL_NAMES.IMPORT_WALLET);
      expect(registeredNames).toContain(TOOL_NAMES.GET_BALANCE);
      expect(registeredNames).toContain(TOOL_NAMES.GET_ADDRESS);
      expect(registeredNames).toContain(TOOL_NAMES.ESTIMATE_GAS);
      expect(registeredNames).toContain(TOOL_NAMES.GET_GAS_PRICE);
      expect(registeredNames).toContain(TOOL_NAMES.GET_RATE_LIMIT_STATUS);
      expect(registeredNames).toContain(TOOL_NAMES.PREPARE_TRANSACTION);
      expect(registeredNames).toContain(TOOL_NAMES.GET_PENDING_TRANSACTIONS);
      expect(registeredNames).toContain(TOOL_NAMES.AUTHORIZE_TRANSACTION);
      expect(registeredNames).toContain(TOOL_NAMES.EXECUTE_TRANSACTION);
    });
  });

  describe("getSupportedChains", () => {
    test("should return list of supported chains", async () => {
      const results: any[] = [];
      const mockServer = {
        tool: mock((_name: string, _desc: string, _schema: any, handler: () => Promise<any>) => {
          results.push(handler);
        })
      } as any;

      walletTools.registerAll(mockServer);
      const handler = results[0];
      const response = await handler({});

      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe("text");

      const data = JSON.parse(response.content[0].text);
      expect(data.chains).toBeDefined();
      expect(data.chains.length).toBe(10);
      expect(data.totalSupported).toBe(10);
    });
  });

  describe("getChainInfo", () => {
    test("should return chain info for valid chain ID", async () => {
      const results: any[] = [];
      const mockServer = {
        tool: mock(
          (_name: string, _desc: string, _schema: any, handler: (params: any) => Promise<any>) => {
            results.push(handler);
          }
        )
      } as any;

      walletTools.registerAll(mockServer);
      const handler = results[1];
      const response = await handler({ chainId: 1 });

      expect(response.content).toBeDefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.id).toBe(1);
      expect(data.name).toBe("Ethereum");
      expect(data.nativeCurrency.symbol).toBe("ETH");
    });

    test("should return error for invalid chain ID", async () => {
      const results: any[] = [];
      const mockServer = {
        tool: mock(
          (_name: string, _desc: string, _schema: any, handler: (params: any) => Promise<any>) => {
            results.push(handler);
          }
        )
      } as any;

      walletTools.registerAll(mockServer);
      const handler = results[1];
      const response = await handler({ chainId: 999999 });

      expect(response.isError).toBe(true);
      const data = JSON.parse(response.content[0].text);
      expect(data.error).toContain("not supported");
    });
  });

  describe("tool descriptions", () => {
    test("all tools should have descriptions", () => {
      const descriptions: string[] = [];
      const mockServer = {
        tool: mock((_name: string, desc: string) => {
          descriptions.push(desc);
        })
      } as any;

      walletTools.registerAll(mockServer);

      descriptions.forEach((desc) => {
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });
});
