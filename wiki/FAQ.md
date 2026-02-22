# FAQ

Frequently asked questions about Agentic EVM Wallet.

## General

### What is Agentic EVM Wallet?

A blockchain wallet designed specifically for **AI agents** (not humans) to interact with Ethereum-compatible blockchains autonomously via the Model Context Protocol (MCP).

**Key differences from traditional wallets**:

- **Built for autonomy**: No human interaction required for wallet operations
- **Safety guardrails**: Rate limiting, approval workflows, spending limits prevent fund drainage
- **MCP protocol**: Standard interface compatible with Claude Desktop and other MCP clients
- **Programmatic API**: All operations accessible via function calls

### What chains are supported?

10 EVM blockchains: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Smart Chain, ZKsync Era, Fantom, Gnosis.

See [Home](Home) → [Supported Chains](Home#supported-chains) for complete list.

### What is the difference between `create_wallet` and `import_wallet`?

- `create_wallet`: Generates a **new** private key and wallet
- `import_wallet`: Imports an **existing** private key you provide

Both return wallet details (address, keyId, chainId).

### Can I use this with MetaMask?

No. This is designed for AI agents, not browser-based wallets. Traditional wallets like MetaMask require human interaction.

### How are private keys secured?

Private keys are:

1. **Generated in-memory**: Keys are created and stored in RAM
2. **Encrypted**: Using encryption key from `.env`
3. **Never persisted**: Keys are never written to disk
4. **Isolated by chain**: Each chain uses separate keys
5. **Cleared on exit**: Keys are deleted when MCP server stops

### What happens if keys are lost?

Since keys are in-memory only:

1. They're lost when server restarts
2. Re-create wallet with `create_wallet`
3. Consider persistence strategy if needed for your use case

### Can multiple AI agents use the same wallet?

Yes, but with limitations:

- Each agent gets a separate key ID
- Rate limits apply per-identifier (`chainId:address`)
- Transactions can be concurrent but rate-limited

For multiple agents on the same chain, create separate wallets with `create_wallet`.

## MCP Integration

### How do I configure Claude Desktop?

See [MCP Integration](MCP-Integration) for complete setup guide.

### Can I use this with other AI assistants?

Yes, if they support MCP protocol. Currently supported:

- Claude Desktop (native)
- Continue.dev (via Continue.dev protocol)
- Other MCP-compatible tools

### Why aren't tools appearing in Claude Desktop?

**Troubleshoot**:

1. Verify config file path for your OS
2. Check file path to `src/mcp/server.ts` is absolute
3. Restart Claude Desktop completely (not just reload)
4. Check Claude Desktop logs for MCP connection errors
5. Ensure Claude Desktop has MCP enabled

### Tools timeout or fail?

**Possible causes**:

1. Network congestion - Wait and retry
2. RPC endpoint down - Use alternative RPC or check status
3. Rate limit hit - Check `get_rate_limit_status` tool
4. Invalid parameters - Tool provides detailed error messages

## Wallet Operations

### Can I transfer tokens to another wallet?

Yes, via `execute_transaction`:

1. Create/import sender wallet
2. Create/import recipient wallet
3. Use `execute_transaction` to send tokens
4. Both wallets need sufficient balance (gas + value)

### Can I call smart contracts?

Not directly via MCP tools. However, you can:

1. Use `prepare_transaction` to build contract call data
2. Execute transaction with contract address as `to` parameter
3. Use external libraries (viem, ethers.js) for contract interactions

### How do I know my wallet address?

Use the `get_address` tool after creating a wallet:

```typescript
const result = await get_address({ chainId: 1, keyId: "my-key-id" });
console.log(result.address);
```

### What does keyId mean?

Key ID format: `chainId:address`

- Example: `1:0x1234...` for Ethereum
- Example: `137:0x5678...` for Polygon

The `keyId` is returned by `create_wallet` and `import_wallet`. Save it to reference your wallet.

### Can I have multiple addresses on the same chain?

Yes! Create/import multiple wallets:

```typescript
const ethWallet1 = await createWallet({ chainId: 1 });
const ethWallet2 = await createWallet({ chainId: 1 });
const ethWallet3 = await createWallet({ chainId: 1 });
// Each has different keyId and address
```

## Security

### Is it safe to use?

**Production deployment**:

- Set up custom RPC endpoints
- Use environment variables for configuration
- Enable transaction approval workflow for large transfers
- Set appropriate rate limits
- Use encrypted storage (in-memory is designed to be ephemeral)

**Testing/Development**:

- Use testnet chains (Sepolia, Amoy) first
- Use viem mocks for unit tests
- Fund with faucet: `bun run faucet`

### What prevents AI from draining funds?

Multiple security layers:

1. **Rate limiting**: Limits requests and transactions per hour/day
2. **Transaction size limits**: Configurable max ETH per transaction
3. **Approval workflow**: Large transfers (>100 ETH by default) require explicit authorization
4. **Chain isolation**: Each chain has isolated keys

### What happens if someone gets access to the MCP server?

The MCP server has:

- **No authentication**: Runs in trusted environments only
- **Input validation**: All parameters validated with Zod schemas
- **Rate limiting**: Configured per agent/identifier

If deployed publicly:

1. Use reverse proxy
2. Add authentication layer
3. Use secure WebSocket/WSS connections
4. Monitor for abuse

## Transaction Execution

### Why did my transaction fail?

Common reasons:

- **Insufficient funds**: Balance < gas \* gasPrice + value
- **Gas price spike**: Network congestion, wait and retry
- **Nonce too low**: Another transaction confirmed first
- **Reverted**: Chain reorganization

### How do I retry automatically?

The system handles retries automatically with exponential backoff:

1. **Attempt 1**: Immediate
2. **Attempt 2**: Wait 1 second
3. **Attempt 3**: Wait 2 seconds
4. **Attempt 4**: Wait 4 seconds

Max retries: 3 (configurable). Total wait time up to 12 seconds.

### Can I speed up transactions?

Yes, by reducing confirmation requirements:

- Set `confirmationTimeoutMs` in execution options (default: 60s)
- Use faster RPC endpoints
- Accept slightly higher gas prices

## Gas Management

### How are gas prices fetched?

Automatically via `get_gas_price` tool:

- Uses public RPC endpoints
- Returns current gas price in wei and gwei

### Can I estimate gas before executing?

Yes, use `estimate_gas` tool:

```typescript
const gas = await estimateGas({
  chainId: 1,
  to: "0x1234...",
  value: "10000000000000000"
});

console.log(`Estimated gas: ${gas}`);
```

### What does EIP-1559 mean?

EIP-1559 introduces dynamic fees:

- **maxFeePerGas**: Tip to validator (for inclusion)
- **maxPriorityFeePerGas**: Priority fee for validators
- Base chain supports EIP-1559

The wallet automatically includes these in `execute_transaction` when chain supports it.

## Rate Limiting

### How are rate limits enforced?

Two-level system:

1. **Request-level**: Protects MCP server from abuse (100 req/min default)
2. **Transaction-level**: Limits AI agent operations (10/hour, 1000/day default)

### How to check remaining allowance?

```typescript
const status = await get_rate_limit_status();
console.log(`Remaining: ${status.requestsRemaining}/${status.requestLimit}`);
console.log(
  `Hourly used: ${status.transactionLimits.hourlyUsed}/${status.transactionLimits.maxPerHour}`
);
console.log(
  `Daily used: ${status.transactionLimits.dailyUsed}/${status.transactionLimits.maxPerDay}`
);
```

### What resets the rate limit?

Rate limit resets automatically after time window (default: 60 seconds).
Check `windowMs` in `.env` to configure custom window size.

## Development

### How do I add a new blockchain?

1. Add chain config to `src/chains/chainConfig.ts`
2. Export chain from `getAllChainIds()`
3. Add to `CHAINS` array

Example:

```typescript
import { Chain } from "viem";

export const MY_CHAIN: Chain = {
  id: 324, // Custom chain ID
  name: "My Custom Chain",
  nativeCurrency: {
    name: "My Token",
    symbol: "MTK",
    decimals: 18
  },
  rpcUrls: {
    default: { http: ["https://my-rpc.com"] },
    public: { http: ["https://my-rpc.com"] }
  },
  blockExplorers: {
    default: { name: "My Explorer", url: "https://explorer.com" }
  },
  contracts: {}
};
```

### How do I run tests?

```bash
# All tests
bun test

# Unit tests only
bun test:unit

# Security tests
bun test tests/security

# Integration tests (requires network)
bun test:integration
```

### How do I build?

```bash
bun run build
```

Outputs to `dist/` directory.

### What is the test coverage?

Current: **85.86%** functions, **85.91%** lines

See [Development](Development#testing-coverage) for improving coverage.

## Troubleshooting

### Installation issues

See [Troubleshooting](Troubleshooting) for detailed solutions.

### API Reference

See [API Reference](API-Reference) for tool documentation.

### Support

- **Issues**: https://github.com/calebrosario/agentic-evm-wallet/issues
- **Discussions**: https://github.com/calebrosario/agentic-evm-wallet/discussions
- **Wiki**: This documentation

## Contributing

See [Development](Development#contributing) for contribution guidelines.

---

## Common Use Cases

### AI Trading Agent

```typescript
// Create wallets and trade
const wallet1 = await createWallet({ chainId: 1 });
const wallet2 = await createWallet({ chainId: 137 });

// Monitor balance
const ethBalance = await getBalance({ chainId: 1, address: wallet1.address });
const polyBalance = await getBalance({ chainId: 137, address: wallet2.address });

// Execute trade
const gas = await estimateGas({ chainId: 1, to: recipient, value: tradeAmount });
await executeTransaction({
  chainId: 1,
  keyId: wallet1.keyId,
  to: recipient,
  value: tradeAmount,
  gas: gas.toString()
});
```

### DeFi Operations

```typescript
// Prepare contract call
const callData = encodeFunctionData({
  abi: contractAbi,
  functionName: "swap",
  args: [amountIn, amountOut, recipient]
});

// Execute
const tx = await executeTransaction({
  chainId: 1,
  keyId: wallet1.keyId,
  to: contractAddress,
  data: callData
});
```

### Treasury Management

```typescript
// Multi-sig setup (conceptual)
const treasury1 = await createWallet({ chainId: 1 });
const treasury2 = await createWallet({ chainId: 1 });
const treasury3 = await createWallet({ chainId: 1 });

// Require multi-sig for large transfers
await authorize_transaction({
  transactionId: largeTxId,
  keyId: treasury1.keyId
});
```

### Payment Processing

```typescript
// Generate unique addresses for payments
const paymentWallet = await createWallet({ chainId: 1 });
const refundWallet = await createWallet({ chainId: 1 });

// Monitor transactions
const paymentTx = await executeTransaction({
  chainId: 1,
  keyId: paymentWallet.keyId,
  to: recipient,
  value: paymentAmount
});
```

---

Still have questions?

- Check [Home](Home) for project overview
- Check [Architecture](Architecture) for system design
- Check [API Reference](API-Reference) for tool documentation
- Check [Troubleshooting](Troubleshooting) for solutions
- Check [FAQ](FAQ) for common questions
- Search existing issues or start a [discussion](https://github.com/calebrosario/agentic-evm-wallet/discussions)
