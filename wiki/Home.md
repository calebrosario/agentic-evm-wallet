# Agentic EVM Wallet

**An autonomous blockchain wallet designed specifically for AI agents** to interact with EVM-compatible blockchains via the Model Context Protocol (MCP).

## Quick Links

- [Getting Started](Getting-Started) - Install and configure in 5 minutes
- [MCP Integration](MCP-Integration) - Set up with Claude Desktop or other MCP clients
- [API Reference](API-Reference) - All available tools and parameters
- [Architecture](Architecture) - System design and components
- [Development](Development) - Run tests, build, contribute
- [Troubleshooting](Troubleshooting) - Common issues and solutions
- [FAQ](FAQ) - Frequently asked questions

## What It Does

| Feature                   | Description                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Multi-chain support**   | 10 EVM blockchains: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain, ZKsync Era, Fantom, Gnosis |
| **MCP server**            | 13 blockchain tools exposed to AI agents via Model Context Protocol                                               |
| **Secure key management** | Encrypted in-memory storage, chain-isolated, never persisted                                                      |
| **Transaction execution** | Automatic retry with exponential backoff, timeout handling                                                        |
| **Rate limiting**         | Request-level and transaction-level rate limits with configurable thresholds                                      |
| **Gas optimization**      | Automatic gas estimation, EIP-1559 support                                                                        |
| **Safety controls**       | Transaction approval workflow, size limits, spending caps                                                         |
| **Multi-agent support**   | Priority-based task queue, agent orchestration                                                                    |

## Why Use This?

### For AI Agents

- **Built for autonomy**: No human interaction required for wallet operations
- **Safety guardrails**: Rate limits, approval workflows prevent fund drainage
- **MCP protocol**: Standard interface compatible with Claude Desktop, other MCP clients
- **Programmatic API**: All operations accessible via function calls
- **Retry logic**: Handles transient failures automatically

### Compared to Alternatives

| Alternative            | For AI?             | Safety Controls | MCP Support |
| ---------------------- | ------------------- | --------------- | ----------- |
| **MetaMask**           | No (requires human) | Optional        | No          |
| **Hardhat Wallet**     | Yes (requires code) | No              | No          |
| **ethers.js Wallet**   | Yes (requires code) | No              | No          |
| **Agentic EVM Wallet** | ✅ Yes              | ✅ Built-in     | ✅ Yes      |

## Use Cases

1. **AI Trading Agents**: Execute trades across multiple chains
2. **Treasury Management**: AI-managed multi-signer wallets
3. **DeFi Operations**: Automated protocol interactions (Uniswap, Aave)
4. **Payment Processing**: AI-powered payment gateways
5. **Cross-chain Operations**: Atomic operations across multiple chains

## Project Status

- **Version**: 0.1.0
- **Release**: Production-ready ✅
- **Test Coverage**: 85.86% functions, 85.91% lines
- **Security**: All critical vulnerabilities fixed
- **Documentation**: Complete

## Quick Start

```bash
# 1. Install
git clone https://github.com/calebrosario/agentic-evm-wallet.git
cd agentic-evm-wallet
bun install

# 2. Validate
bun run smoke-test

# 3. Run MCP server
bun run mcp
```

See [Getting Started](Getting-Started) for detailed setup instructions.

## Links

- **GitHub Repository**: https://github.com/calebrosario/agentic-evm-wallet
- **MCP Protocol**: https://modelcontextprotocol.io
- **Viem Library**: https://viem.sh
- **Bun Runtime**: https://bun.sh

## License

MIT License - See LICENSE file for details.
