# Getting Started

Get up and running with Agentic EVM Wallet in under 5 minutes.

## Prerequisites

- **Bun**: Latest version (for package management and runtime)
- **Node.js**: 18+ (compatible with Bun)
- **Git**: For cloning the repository

## Installation

```bash
# 1. Clone repository
git clone https://github.com/calebrosario/agentic-evm-wallet.git
cd agentic-evm-wallet

# 2. Install dependencies
bun install

# 3. Run smoke test (validates installation)
bun run smoke-test
```

Expected smoke test output:

```
🧪 Agentic EVM Wallet - Smoke Test / E2E Validation

✅ List supported chains (0ms)
✅ Create wallet on Ethereum (18ms)
✅ Create wallet on Polygon (1ms)
✅ Gas manager methods exist (0ms)
✅ Wallet manager public API (0ms)

📊 Test Summary
==================================================
Total: 5 tests
Passed: 5
Failed: 0
Duration: 18ms
==================================================

✅ All tests passed
```

## MCP Integration for Claude Desktop

### Step 1: Add Configuration

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

### Step 2: Restart Claude Desktop

After saving the config, restart Claude Desktop to load the MCP server.

### Step 3: Verify Connection

Open a new chat and try:

```
List all supported chains I can use.
```

You should see a list of 10 EVM chains.

## Usage Examples

### As a Library

```typescript
import { WalletManager, TransactionExecutor } from "agentic-evm-wallet";

// Create wallet
const walletManager = new WalletManager();
const wallet = await walletManager.createWallet(1); // Ethereum

// Get balance
const balance = await walletManager.getBalance(1, wallet.address);
console.log(`Balance: ${balance} ETH`);
```

### Via MCP Tools

```
You: Create a wallet on Ethereum
Claude: [calls create_wallet tool]
Claude: ✅ Wallet created successfully
You: What's my address?
Claude: [calls get_address tool]
Claude: Your address is 0x1234...
You: Check my balance
Claude: [calls get_balance tool]
Claude: Your balance is 10.5 ETH
```

## Configuration

### Environment Variables (Optional)

Create `.env` file in project root:

```bash
# Custom RPC endpoints (optional - uses public nodes by default)
ETHEREUM_RPC_URL=https://your-rpc-url.com
POLYGON_RPC_URL=https://your-rpc-url.com

# Encryption key for key storage
# Generate with: bun run -e "console.log(crypto.randomUUID().replace(/-/g, '').slice(0, 64))"
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here

# Rate limiting (default: 100 requests per minute)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Transaction limits (for approval workflow)
MAX_TRANSACTION_SIZE_ETH=100
MAX_TRANSACTIONS_PER_HOUR=10
MAX_TRANSACTIONS_PER_DAY=1000
```

## Verification

After installation, verify:

1. **Smoke test**: `bun run smoke-test` (should pass all 5 tests)
2. **Type check**: `bun run typecheck` (should have no errors)
3. **Linter**: `bun run lint` (should pass)
4. **Unit tests**: `bun run test:unit` (should pass)

## Troubleshooting

### Installation Fails

**Problem**: `bun install` fails with errors
**Solution**:

- Check Bun version: `bun --version` (should be 1.0+)
- Clear cache: `rm -rf node_modules bun.lockb`
- Retry installation

### Smoke Test Fails

**Problem**: Smoke test shows failed tests
**Solution**:

- Check Bun is installed: `which bun`
- Verify dependencies installed: `ls node_modules`
- Check error logs in test output
- File issue: https://github.com/calebrosario/agentic-evm-wallet/issues

### MCP Server Not Connecting

**Problem**: Claude Desktop doesn't show wallet tools
**Solution**:

1. Verify config file path is correct for your OS
2. Check the path to `src/mcp/server.ts` is absolute
3. Restart Claude Desktop completely (not just reload)
4. Check Claude Desktop logs for MCP connection errors

### TypeScript Errors

**Problem**: `bun run typecheck` shows errors
**Solution**:

- Clear cache: `rm -rf node_modules/.cache`
- Reinstall: `bun install`
- Check Bun version compatibility

## Next Steps

- [Architecture](Architecture) - Understand system design
- [API Reference](API-Reference) - All available tools
- [Development](Development) - Run tests, build, contribute

## Support

- **Documentation**: See [Home](Home)
- **Issues**: https://github.com/calebrosario/agentic-evm-wallet/issues
- **Discussions**: https://github.com/calebrosario/agentic-evm-wallet/discussions
