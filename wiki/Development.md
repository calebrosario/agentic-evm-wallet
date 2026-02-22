# Development Guide

This guide covers development, testing, and contributing to Agentic EVM Wallet.

## Prerequisites

- **Bun**: Latest version (1.0+)
- **Node.js**: 18+ (compatible with Bun)
- **Git**: For version control
- **TypeScript**: 5.0+

## Setup

```bash
# 1. Clone repository
git clone https://github.com/calebrosario/agentic-evm-wallet.git
cd agentic-evm-wallet

# 2. Install dependencies
bun install

# 3. Run smoke test
bun run smoke-test

# 4. Verify TypeScript
bun run typecheck

# 5. Run linter
bun run lint
```

## Available Scripts

| Script                 | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `bun run dev`          | Run entry point (`src/index.ts`)                    |
| `bun run mcp`          | Start MCP server                                    |
| `bun run build`        | Build to `dist/`                                    |
| `bun test`             | Run all tests                                       |
| `bun test:unit`        | Run unit tests only                                 |
| `bun test:integration` | Run integration tests                               |
| `bun test:coverage`    | Run tests with coverage report                      |
| `bun run typecheck`    | TypeScript compilation check                        |
| `bun run lint`         | ESLint code quality check                           |
| `bun run lint:fix`     | Auto-fix lint issues                                |
| `bun run format`       | Format with Prettier                                |
| `bun run precommit`    | Run pre-commit hooks (typecheck + lint + test:unit) |

## Project Structure

```
agentic-evm-wallet/
├── src/                    # Source code
│   ├── agent/           # Multi-agent orchestration
│   ├── chains/          # Chain configuration
│   ├── execution/       # Transaction execution
│   ├── gas/            # Gas management
│   ├── key/             # Key management
│   ├── mcp/             # MCP server (13 tools)
│   ├── security/         # Rate limiting, approval
│   ├── transactions/    # Transaction building
│   └── wallet/          # Wallet operations
├── tests/                  # Test suite
│   ├── unit/           # Component tests
│   ├── integration/    # End-to-end tests
│   ├── security/       # Security tests
│   └── mocks/          # Mock implementations
├── examples/               # Usage examples
├── scripts/               # Build/utility scripts
└── wiki/                  # Documentation
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b main
git checkout -b feature/my-new-feature

# Make changes
# ...edit source files...

# Test changes
bun test:unit

# Commit (atomic, semantic)
git add src/
git commit -m "feat: add my new feature"

# Push
git push origin feature/my-new-feature
```

### 2. Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/wallet/walletManager.test.ts

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

### 3. Code Quality

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Format code
bun run format
```

### 4. Pre-commit Hooks

Pre-commit runs automatically before commit:

```bash
bun run precommit
```

This runs:

1. `bun run typecheck` - TypeScript compilation
2. `bun run lint` - ESLint checks
3. `bun run test:unit` - Unit tests

## Testing

### Test Organization

```
tests/
├── unit/           # Component-level tests
│   ├── agent/           # Agent manager, task queue
│   ├── chains/          # Chain config tests
│   ├── execution/       # Transaction executor tests
│   ├── gas/            # Gas manager tests
│   ├── key/             # Key manager tests
│   ├── mcp/             # MCP tool tests
│   ├── security/         # Rate limiter, approval tests
│   ├── transactions/    # Transaction builder tests
│   └── wallet/          # Wallet manager tests
├── integration/     # End-to-end tests
│   └── gasEstimation/ # Gas estimation tests
└── security/        # Security-focused tests
```

### Running Tests

```bash
# Unit tests
bun test:unit

# Integration tests (requires live RPC)
bun test:integration

# Security tests
bun test tests/security

# All tests
bun test
```

### Test Coverage

Current coverage: **85.86% functions, 85.91% lines**

To improve coverage:

- Add tests for `src/mcp/tools.ts` (28.63% coverage)
- Add tests for `src/agent/agentManager.ts` (59.47% coverage)
- Add tests for retry logic with viem mocks

### Adding New Tests

1. Create test file in appropriate directory
2. Use `describe` to organize tests
3. Use `test()` from `bun:test`
4. Mock external dependencies (RPC, wallets)
5. Clean up after each test

## Build

```bash
# Build to dist/
bun run build

# Output: dist/index.ts, dist/index.d.ts, etc.
```

## Debugging

### MCP Server Debugging

```bash
# Start MCP server in debug mode
DEBUG=true bun run mcp

# Enable verbose logging
LOG_LEVEL=debug bun run mcp
```

### Common Debugging Tips

1. **Add logs** in tool handlers to trace execution flow
2. **Use smoke test** to validate core functionality
3. **Test with viem mocks** (in `tests/mocks/viem-client.ts`)
4. **Check rate limits** with `get_rate_limit_status` tool

## Contributing

### Commit Conventions

Follow semantic commit messages:

```
feat: add new feature
fix: fix bug or issue
refactor: improve code structure
docs: update documentation
test: add or update tests
chore: maintenance task
ci: CI/CD changes
```

### Commit Examples

```bash
# Good commit
git commit -m "feat(wallet): add multi-chain support for Polygon"

# Fix commit
git commit -m "fix(security): resolve race condition in rate limiter"

# Refactor commit
git commit -m "refactor(extraction): improve chain config performance"
```

## Code Style

Follow existing patterns in codebase:

- **2-space tabs**
- **Double quotes**
- **Semicolons** at end of statements
- **100 char line width** (configurable)
- **Explicit return types** (no implicit any)

## Environment Variables

Available variables for development:

```bash
# Custom RPC endpoints
ETHEREUM_RPC_URL=https://your-rpc-url.com
POLYGON_RPC_URL=https://your-rpc-url.com

# Encryption key
ENCRYPTION_KEY=your-32-byte-hex-key

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_TRANSACTIONS_PER_HOUR=10
MAX_TRANSACTIONS_PER_DAY=1000

# Transaction limits
MAX_TRANSACTION_SIZE_ETH=100
```

## Common Issues

### Module Not Found

**Error**: `Cannot find module`
**Solution**:

- Check file imports
- Ensure `bun install` was run
- Check `tsconfig.json` paths are correct

### Type Errors

**Error**: TypeScript compilation errors
**Solution**:

- Run `bun run typecheck` for details
- Check for missing imports
- Verify types are correct

### MCP Server Issues

**Problem**: Tools not appearing in Claude Desktop
**Solution**:

- Verify config file path is correct for your OS
- Check that `src/mcp/server.ts` path is absolute
- Restart Claude Desktop completely

### Test Failures

**Problem**: Tests fail with network errors
**Solution**:

- Check internet connection
- Use viem mocks for unit tests
- Increase timeout in test if RPC is slow

## Resources

- [Home](Home) - Project overview
- [Architecture](Architecture) - System design
- [API Reference](API-Reference) - Tool documentation
- [MCP Integration](MCP-Integration) - Setup guide
- [Troubleshooting](Troubleshooting) - Common issues
- [FAQ](FAQ) - Frequently asked questions
- [README](../README.md) - Main project README
- [AGENTS.md](../AGENTS.md) - Team guidelines

## Release Process

### Version Bump

```bash
# 1. Update version in package.json
# (e.g., 0.1.0 → 0.2.0)

# 2. Commit changes
git add package.json
git commit -m "chore: bump version to 0.2.0"

# 3. Create git tag
git tag -a v0.2.0 -m "Release v0.2.0"
```

### Publishing

```bash
# Build project
bun run build

# Publish to npm
npm publish
```

## Next Steps

- [API Reference](API-Reference) - Explore available tools
- [Architecture](Architecture) - Understand system design
- [Troubleshooting](Troubleshooting) - Solve issues
- [FAQ](FAQ) - Get answers

## Support

- **Issues**: https://github.com/calebrosario/agentic-evm-wallet/issues
- **Discussions**: https://github.com/calebrosario/agentic-evm-wallet/discussions
- **Wiki**: Full documentation
