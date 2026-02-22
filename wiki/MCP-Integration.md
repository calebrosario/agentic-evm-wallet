# MCP Integration Guide

This guide covers integrating Agentic EVM Wallet with Claude Desktop and other MCP-compatible clients.

## What is MCP?

The **Model Context Protocol (MCP)** is a standard for AI assistants to interact with external tools and services. Agentic EVM Wallet exposes 13 blockchain tools via MCP.

## Available Tools

| Tool Name                  | Description                                | Parameters                                                 |
| -------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `get_supported_chains`     | List all 10 supported EVM chains           | None                                                       |
| `get_chain_info`           | Get detailed info for a chain              | `chainId` (number)                                         |
| `create_wallet`            | Create new wallet on specified chain       | `chainId` (number)                                         |
| `import_wallet`            | Import existing wallet via private key     | `chainId`, `privateKey` (string)                           |
| `get_address`              | Get wallet address for a chain             | `chainId`, `keyId` (string)                                |
| `get_balance`              | Get wallet balance (native or ERC-20)      | `chainId`, `address`, `contractAddress?`, `tokenDecimals?` |
| `estimate_gas`             | Estimate gas for transaction               | `chainId`, `to`, `value?`, `data?`                         |
| `get_gas_price`            | Get current gas price for chain            | `chainId`                                                  |
| `prepare_transaction`      | Prepare transaction without executing      | `chainId`, `to`, `value?`, `data?`, `gas?`                 |
| `get_pending_transactions` | Get pending transactions awaiting approval | `chainId`, `address`                                       |
| `authorize_transaction`    | Authorize a pending transaction            | `transactionId` (string)                                   |
| `execute_transaction`      | Execute transaction on chain               | `chainId`, `keyId`, `to`, `value?`, `data?`                |

## Claude Desktop Setup

### 1. Locate Config File

| OS      | Config Path                                                       |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                     |
| Linux   | `~/.config/Claude/claude_desktop_config.json`                     |

### 2. Add Wallet Server

```json
{
  "mcpServers": {
    "agentic-evm-wallet": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/agentic-evm-wallet/src/mcp/server.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

1. Completely quit Claude Desktop
2. Reopen Claude Desktop
3. Open new chat to verify tools are available

### 4. Verify Connection

In Claude Desktop, ask:

```
What blockchain chains can I use?
```

Expected response:

```
I can use 10 EVM blockchain chains:

1. Ethereum (ETH) - Chain ID: 1
2. Polygon (POL) - Chain ID: 137
3. BNB Smart Chain (BNB) - Chain ID: 56
4. Arbitrum One (ETH) - Chain ID: 42161
5. OP Mainnet (ETH) - Chain ID: 10
6. Avalanche (AVAX) - Chain ID: 43114
7. Base (ETH) - Chain ID: 8453
8. ZKsync Era (ETH) - Chain ID: 324
9. Fantom (FTM) - Chain ID: 250
10. Gnosis (XDAI) - Chain ID: 100
```

## Usage Examples

### Creating Multiple Wallets

```
You: Create a wallet on Ethereum
Claude: ✅ Wallet created. Address: 0x1234...
You: Now create one on Polygon
Claude: ✅ Wallet created. Address: 0x5678...
You: Get my Ethereum address again
Claude: Your Ethereum address is 0x1234...
```

### Checking Balances

```
You: Check my balance on Ethereum
Claude: Your Ethereum balance is 10.5 ETH
You: Check my Polygon balance
Claude: Your Polygon balance is 0 POL
```

### Transaction Execution

```
You: Create a wallet on Ethereum
Claude: ✅ Wallet created. Address: 0xabcd...
You: Send 0.1 ETH to 0x9876...
Claude: Estimating gas... Gas limit: 21000, Gas price: 20 gwei
Claude: Preparing transaction...
Claude: Transaction prepared! Transaction hash: 0x123abc...
Claude: Executing transaction...
Claude: ✅ Transaction executed successfully
Claude: Transaction hash: 0x123abc...
Claude: Block number: 18234567
```

### Multi-Chain Operations

```
You: Create wallets on Ethereum and Polygon
Claude: ✅ Ethereum wallet: 0x1234...
Claude: ✅ Polygon wallet: 0x5678...
You: Check balances on both chains
Claude: Ethereum: 10.5 ETH
Claude: Polygon: 0 POL
You: Send 0.1 MATIC to 0xabc...
Claude: ✅ Polygon transaction executed
```

## Advanced Configuration

### Custom RPC Endpoints

Configure custom RPC URLs via environment variables:

```bash
# In .env file
ETHEREUM_RPC_URL=https://your-custom-rpc.com
POLYGON_RPC_URL=https://your-custom-rpc.com
```

Restart MCP server to apply changes.

### Rate Limiting

Configure rate limits in `.env`:

```bash
RATE_LIMIT_MAX_REQUESTS=100    # Requests per minute
RATE_LIMIT_WINDOW_MS=60000   # 1 minute
MAX_TRANSACTIONS_PER_HOUR=10
MAX_TRANSACTIONS_PER_DAY=1000
```

### Transaction Approval Workflow

For large transfers, enable approval workflow:

```bash
MAX_TRANSACTION_SIZE_ETH=100   # Max ETH per transaction without approval
```

Transactions above this threshold require manual authorization via `authorize_transaction`.

## Other MCP Clients

### Cline

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

### Continue.dev

```json
{
  "mcp": {
    "servers": {
      "agentic-evm-wallet": {
        "command": "bun",
        "args": ["run", "/path/to/agentic-evm-wallet/src/mcp/server.ts"]
      }
    }
  }
}
```

## Troubleshooting

### Tools Not Appearing

**Symptoms**: MCP tools not showing in Claude Desktop
**Solutions**:

1. Verify config path is correct for your OS
2. Check file path to `src/mcp/server.ts` is absolute
3. Restart Claude Desktop completely (not just reload)
4. Check Claude Desktop logs for errors

### Connection Timeout

**Symptoms**: Tools timeout when called
**Solutions**:

1. Check RPC endpoints are accessible
2. Configure custom RPC if public endpoints are slow
3. Increase timeout in Claude Desktop settings
4. Check network connectivity

### Rate Limit Errors

**Symptoms**: "Rate limit exceeded" errors
**Solutions**:

1. Increase limits in `.env`
2. Wait and retry
3. Use rate limit status tool to check remaining allowance

## Security Considerations

- **Key Storage**: Private keys are encrypted in-memory, never persisted
- **Rate Limiting**: Configured per agent to prevent abuse
- **Transaction Approval**: Large transfers require explicit authorization
- **Chain Validation**: All chain IDs validated before operations

See [Security](../README#security-considerations-for-production) in main README for full details.

## Best Practices

1. **Test in Development**: Use testnet chains first (Sepolia, Amoy)
2. **Monitor Gas Prices**: Estimate before executing to avoid overpaying
3. **Verify Transactions**: Always check transaction hash on block explorer
4. **Key Rotation**: Periodically rotate keys in production
5. **Log Monitoring**: Monitor MCP server logs for unusual activity

## Next Steps

- [API Reference](API-Reference) - Detailed parameter schemas
- [Troubleshooting](Troubleshooting) - Common issues
- [Development](Development) - Build and test locally
