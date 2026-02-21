# Agentic EVM Wallet

A multi-chain EVM blockchain wallet for AI agents with MCP (Model Context Protocol) support. Built with Viem and Bun runtime.

## Features

- **Multi-chain support**: Top 10 EVM blockchains by users/TVL
- **MCP server**: AI agent integration via Model Context Protocol (9 tools)
- **Secure key management**: Encrypted in-memory key storage with chain isolation
- **Transaction execution**: Built-in retry logic with exponential backoff
- **Gas optimization**: Automatic gas estimation and price fetching
- **Agent orchestration**: Multi-agent task queue with priority scheduling

## Supported Chains

| Chain ID | Chain Name      | Native Token | Block Explorer                  |
| -------- | --------------- | ------------ | ------------------------------- |
| 1        | Ethereum        | ETH          | https://etherscan.io            |
| 56       | BNB Smart Chain | BNB          | https://bscscan.com             |
| 137      | Polygon         | POL          | https://polygonscan.com         |
| 42161    | Arbitrum One    | ETH          | https://arbiscan.io             |
| 10       | OP Mainnet      | ETH          | https://optimistic.etherscan.io |
| 43114    | Avalanche       | AVAX         | https://snowtrace.io            |
| 8453     | Base            | ETH          | https://basescan.org            |
| 324      | ZKsync Era      | ETH          | https://era.zksync.io           |
| 250      | Fantom          | FTM          | https://ftmscan.com             |
| 100      | Gnosis          | XDAI         | https://gnosisscan.io           |

## Installation

```bash
# Clone repository
git clone https://github.com/your-org/agentic-evm-wallet.git
cd agentic-evm-wallet

# Install dependencies
bun install

# Build project
bun run build
```

## MCP Server Setup for Claude Desktop

### 1. Configure Claude Desktop

Add to Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentic-evm-wallet": {
      "command": "bun",
      "args": ["run", "/path/to/agentic-evm-wallet/src/mcp/server.ts"]
    }
  }
}
```

### 2. Start Claude Desktop

Restart Claude Desktop to load the MCP server.

## Available MCP Tools

| Tool Name            | Description                            |
| -------------------- | -------------------------------------- |
| get_supported_chains | List all supported EVM chains          |
| get_chain_info       | Get detailed info for a specific chain |
| create_wallet        | Create a new wallet on a chain         |
| import_wallet        | Import existing wallet via private key |
| get_balance          | Get wallet balance (native or ERC-20)  |
| get_address          | Get wallet address for a chain         |
| estimate_gas         | Estimate gas for a transaction         |
| get_gas_price        | Get current gas price for a chain      |
| execute_transaction  | Execute a transaction on a chain       |

## Usage

### Library Usage

```typescript
import { WalletManager, KeyManager, TransactionExecutor, getChain } from "agentic-evm-wallet";

// Create wallet on Ethereum
const walletManager = new WalletManager();
const wallet = await walletManager.createWallet(1);
console.log("Address:", wallet.address);

// Get balance
const balance = await walletManager.getBalance(wallet.address, 1);
console.log("Balance:", balance);

// Execute transaction
const executor = new TransactionExecutor();
const result = await executor.executeTransaction({
  chainId: 1,
  privateKey: wallet.privateKey,
  to: "0xRecipientAddress" as Address,
  value: parseEther("0.01"),
  gas: 21000n
});
console.log("Transaction hash:", result.hash);
```

### MCP Agent Usage

After configuring Claude Desktop, you can ask Claude to:

```
"Create a wallet on Polygon"
"Check my ETH balance on mainnet"
"Send 0.1 ETH to 0xRecipientAddress"
"Get the current gas price on Arbitrum"
```

## Configuration

### Environment Variables (Optional)

Create a `.env` file in the project root:

```bash
# Custom RPC endpoints (optional - uses public nodes by default)
ETHEREUM_RPC_URL=https://your-rpc-url.com
POLYGON_RPC_URL=https://your-rpc-url.com

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Chain Configuration

All chain configurations are in `src/chains/chainConfig.ts`. Custom RPC endpoints can be added by modifying the chain config.

## Architecture

```
agentic-evm-wallet/
├── src/
│   ├── agent/       # Multi-agent orchestration
│   ├── chains/      # Chain configuration
│   ├── execution/   # Transaction execution
│   ├── gas/        # Gas estimation
│   ├── key/        # Key management
│   ├── mcp/        # MCP server
│   └── wallet/     # Wallet operations
├── tests/
│   ├── unit/        # Component tests
│   ├── integration/ # End-to-end tests
│   └── security/   # Security tests
└── examples/       # Usage examples
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run unit tests only
bun test tests/unit

# Run integration tests
bun test tests/integration

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format

# Build
bun run build

# Run MCP server
bun run mcp
```

## Security

- **Never commit private keys** to version control
- **Use dedicated agent wallets** with minimal funding
- **Enable transaction approval** for production use
- **Monitor transaction limits** to prevent unauthorized transfers
- **Key storage** is encrypted in-memory (non-persistent by design)

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.
