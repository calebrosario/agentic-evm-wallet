import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WalletTools } from "./tools.js";

const server = new McpServer({
  name: "agentic-evm-wallet",
  version: "1.0.0"
});

const walletTools = new WalletTools();
walletTools.registerAll(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agentic EVM Wallet MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
