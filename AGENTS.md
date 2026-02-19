# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-17
**Commit:** aa67262
**Branch:** (detached)

## OVERVIEW

Agentic EVM blockchain wallet for AI agents using Viem and Bun runtime.

## STRUCTURE

```
agentic-evm-wallet/
├── src/
│   ├── agent/       # Multi-agent orchestration with task queue
│   ├── chains/      # Centralized chain configuration (top 10 EVM chains)
│   ├── execution/   # Transaction execution with retry/exponential backoff
│   ├── gas/        # Gas estimation and optimization
│   ├── key/        # Key management and signing
│   ├── mcp/        # Model Context Protocol server for AI agents
│   ├── security/    # (empty, planned)
│   ├── transactions/# Transaction building and validation
│   └── wallet/     # Wallet management with multi-chain support
├── tests/
│   ├── unit/        # Component tests (agent, execution, wallet, etc.)
│   ├── integration/ # End-to-end tests
│   └── security/   # Security-focused tests
├── contracts/      # (empty, planned)
├── fixtures/       # (empty, planned)
└── docs/           # (empty, planned)
```

## WHERE TO LOOK

| Task                  | Location          | Notes                                             |
| --------------------- | ----------------- | ------------------------------------------------- |
| Agent orchestration   | src/agent/        | agent.ts, agentManager.ts, taskQueue.ts           |
| Chain configuration   | src/chains/       | chainConfig.ts (10 chains), registry.ts, types.ts |
| Transaction execution | src/execution/    | transactionExecutor.ts (479 lines)                |
| Wallet operations     | src/wallet/       | walletManager.ts                                  |
| Transaction building  | src/transactions/ | transactionBuilder.ts                             |
| Key management        | src/key/          | keyManager.ts                                     |
| Gas estimation        | src/gas/          | gasManager.ts                                     |
| MCP server            | src/mcp/          | server.ts, tools.ts, types.ts (9 tools)           |
| Run tests             | bun test          | Uses bun:test native runner                       |
| Lint                  | bun run lint      | ESLint + Prettier                                 |

## CONVENTIONS

- **Bun only**: Use `bun install`, `bun run`, `bun test` - never npm/pnpm/vite
- **ESLint**: no-unused-vars (error), explicit-function-return-type (warn), no-explicit-any (warn)
- **Prettier**: semi: true, double quotes, printWidth: 100, 2-space tabs
- **TypeScript**: Strict mode, ES2022 target, bundler resolution
- **Testing**: bun:test native runner, no jest/vitest
- **Imports**: Path aliases (@/wallet/_, @/agent/_, etc.)

## ANTI-PATTERNS (THIS PROJECT)

- Never use npm/pnpm - use bun
- Never use Express - use Bun.serve()
- Never use node:crypto - use Bun.crypto
- Never use node:fs - use Bun.file
- Never use ws - use built-in WebSocket
- Never use better-sqlite3 - use bun:sqlite
- Never use ioredis - use Bun.redis
- Never use vite - use HTML imports with Bun.serve()
- Never add @types/node - remove if present
- Never use dotenv - Bun auto-loads .env

## SUPPORTED CHAINS

The wallet supports the top 10 EVM blockchains by users/TVL:

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

**Chain Configuration:** All chain configurations are centralized in `src/chains/chainConfig.ts`. Use `getChain(chainId)` to retrieve chain config, or `isChainSupported(chainId)` to validate.

## MCP (MODEL CONTEXT PROTOCOL)

The wallet provides an MCP server for AI agents to interact with blockchain operations.

### Available Tools (9)

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

### Running the MCP Server

```bash
bun run mcp
```

### Claude Desktop Configuration

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

## UNIQUE STYLES

- Task queue with exponential backoff retry (src/agent/taskQueue.ts)
- Multi-agent orchestration with timeout handling (src/agent/agentManager.ts)
- Transaction execution with retry logic and event emissions (src/execution/transactionExecutor.ts)

## COMMANDS

```bash
bun install              # Install dependencies
bun run dev              # Run src/index.ts (MISSING FILE)
bun run mcp              # Run MCP server for AI agents
bun run build            # Build to dist/
bun test                 # Run all tests
bun test:unit            # Run unit tests
bun test:integration     # Run integration tests
bun run typecheck        # TypeScript type checking
bun run lint             # ESLint check
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format with Prettier
```

## NOTES

- **Entry point mismatch**: package.json references src/index.ts but root index.ts exists (placeholder "Hello via Bun!")
- **Missing files**: src/index.ts (required for dev/build scripts), src/utils/ (empty), src/security/ (empty), src/contracts/ (empty)
- **Git worktrees**: Multi-agent workflow with phased branches (sisyphus_GLM-4.7/phase*-*)
- **Husky hooks**: Pre-commit runs typecheck + lint + test:unit
- **Git untracked**: tests/unit/execution/transactionExecutor.advanced.test.ts
