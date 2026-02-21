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

## Quick Start

Get started in under 2 minutes:

```bash
# 1. Install dependencies
bun install

# 2. Clone repository
git clone https://github.com/calebrosario/agentic-evm-wallet.git
cd agentic-evm-wallet

# 3. Run smoke test (validates MVP functionality)
bun run smoke-test

# 4. Start MCP server for Claude Desktop
bun run mcp
```

### What the smoke test validates:

- ✅ All supported chains are configured
- ✅ Wallet creation works on Ethereum and Polygon
- ✅ Wallet manager has all required methods
- ✅ Gas manager has required methods

If the smoke test passes, your environment is ready for:

1. **Using as a library** → Import and call wallet functions directly
2. **Using MCP server** → Configure Claude Desktop (see below)
3. **Running examples** → Check `examples/` directory for working code

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

## Troubleshooting

### MCP Server Issues

**Problem:** MCP server starts but Claude Desktop doesn't see tools
**Solutions:**

- Verify Claude Desktop config path is correct for your OS
- Check that the path in config matches the actual file location
- Restart Claude Desktop after updating config
- Check Claude Desktop logs for MCP connection errors

**Problem:** "Module not found" or "Cannot import X"
**Solutions:**

- Run `bun install` to ensure all dependencies are installed
- Check that you're in the project root directory
- Run `bun run build` before starting MCP server

### Wallet Operations

**Problem:** "Invalid key ID format: expected 'chainId:address'"
**Solution:** This is an internal test fixture issue - not a user problem. If you see this in production, report as a bug.

**Problem:** Transaction fails with "Insufficient funds for gas"
**Solution:** Ensure wallet has enough ETH to cover gas + transaction value. Run `bun run faucet` to fund test wallets.

**Problem:** RPC connection timeout or "request failed"
**Solutions:**

- Network congestion: Wait and retry
- Custom RPC endpoint: Try a different RPC URL in `.env`
- Check `src/chains/chainConfig.ts` for default RPC configuration

### Development

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

## Security Considerations for Production

### Key Management

- **Never share private keys**: Private keys give full control over wallet funds
- **Use environment variables**: Store sensitive values in `.env` file, never commit it
- **Key rotation**: Periodically rotate keys for production deployments
- **Hardware wallets**: For high-value wallets, consider HSM/TEE integration

### Transaction Approval

- **Two-step approval**: Enable `MAX_TRANSACTION_SIZE_ETH` and use approval workflow for large transfers
- **Review pending transactions**: Check pending list before authorizing
- **Transaction limits**: Configure `MAX_TRANSACTIONS_PER_HOUR` and `MAX_TRANSACTIONS_PER_DAY` as appropriate

### Rate Limiting

- **Configure limits**: Set `RATE_LIMIT_MAX_REQUESTS` based on expected traffic
- **Monitor limits**: Use `get_rate_limit_status` tool to track usage
- **Agent isolation**: Each agent should use its own wallet address

### Network Security

- **RPC endpoints**: Use reputable RPC providers or self-hosted nodes
- **TLS verification**: Ensure RPC endpoints use HTTPS
- **Chain IDs**: Always validate chain IDs to prevent chain confusion attacks

### MCP Server

- **Authentication**: Currently no auth - run in secure environment only
- **Input validation**: All inputs are validated via Zod schemas
- **Audit logs**: Review MCP logs for unusual activity patterns

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.
