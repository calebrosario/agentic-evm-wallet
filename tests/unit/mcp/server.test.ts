import { describe, test, expect, beforeEach } from "bun:test";
import { WalletTools } from "../../../src/mcp/tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

describe("MCP Server", () => {
  let server: McpServer;
  let walletTools: WalletTools;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0"
    });
    walletTools = new WalletTools();
  });

  describe("WalletTools", () => {
    describe("tool registration", () => {
      test("should register all tools without errors", () => {
        expect(() => {
          walletTools.registerAll(server);
        }).not.toThrow();
      });
    });
  });

  describe("server connection", () => {
    test("should connect without errors", async () => {
      walletTools.registerAll(server);

      const transport = new StdioServerTransport();
      await server.connect(transport);
    });
  });
});
