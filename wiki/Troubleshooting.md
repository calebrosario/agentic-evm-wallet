# Troubleshooting

Common issues and solutions for Agentic EVM Wallet.

## Installation & Setup

### Bun Installation Fails

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

### TypeScript Errors

**Problem**: `bun run typecheck` shows errors
**Solution**:

- Clear cache: `rm -rf node_modules/.cache`
- Reinstall: `bun install`
- Check Bun version compatibility

## MCP Server Issues

### Tools Not Appearing

**Symptoms**: MCP tools not showing in Claude Desktop
**Solutions**:

1. Verify config file path is correct for your OS:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`
2. Check that path to `src/mcp/server.ts` is absolute (not relative)
3. Restart Claude Desktop completely (not just reload)
4. Check Claude Desktop logs for MCP connection errors

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

1. Increase limits in `.env`:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=200
   MAX_TRANSACTIONS_PER_HOUR=20
   MAX_TRANSACTIONS_PER_DAY=2000
   ```
2. Wait and retry
3. Use rate limit status tool to check remaining allowance
4. Use multiple agent wallets for higher throughput

### Transaction Errors

**Problem**: Transaction fails with "Insufficient funds for gas"
**Solution**:

1. Check wallet has enough native token balance
2. Reduce transaction value if testing
3. Use `estimate_gas` tool first to estimate cost
4. Consider using testnet faucets for testing

### "Invalid Key ID" Error

**Problem**: Error when importing wallet or executing transaction
**Solution**:

- Ensure key ID format is `chainId:address` (e.g., `1:0x1234...`)
- Check that wallet was created/imported on the correct chain
- Use `get_address` tool to verify address

## Wallet Operations

### Wallet Creation Fails

**Problem**: `create_wallet` fails
**Solution**:

- Verify chain ID is supported (use `get_supported_chains`)
- Check network connectivity to RPC endpoint
- Ensure `.env` configuration is loaded

### Balance Issues

**Problem**: `get_balance` returns incorrect balance
**Solution**:

1. Verify address is correct (use `get_address` tool)
2. For ERC-20 tokens, include `contractAddress` and `tokenDecimals`
3. Check that wallet exists on that chain
4. Note: Balance is 0 until wallet receives funds

### Transaction Not Found

**Problem**: Transaction not appearing in block explorer
**Solution**:

1. Wait 1-2 minutes for block propagation
2. Check transaction hash in explorer
3. Verify correct block explorer URL for chain
4. Note: Testnets may have delayed indexing

## Gas Estimation

### Gas Estimation Fails

**Problem**: `estimate_gas` fails with RPC error
**Solution**:

1. Check network connectivity
2. Use testnet first (Sepolia) before mainnet
3. Configure custom RPC if public endpoints are slow
4. Increase timeout in Claude Desktop

### Gas Price Too High

**Problem**: Transaction cost unexpectedly high
**Solution**:

1. Check current network congestion
2. Wait for lower gas prices (off-peak hours)
3. Use `get_gas_price` tool to check current price
4. Consider EIP-1559 if supported by chain

## Security Issues

### Rate Limit Reached

**Problem**: All operations failing with rate limit errors
**Solutions**:

1. Check rate limit status with `get_rate_limit_status`
2. Wait for window to reset (default: 1 minute)
3. Configure higher limits in `.env`
4. Use different agent/wallet for isolation

### Transaction Approval

**Problem**: Large transfers require approval but not showing
**Solution**:

1. Check approval workflow is enabled (default: enabled for >100 ETH)
2. Verify `MAX_TRANSACTION_SIZE_ETH` is configured
3. Use `prepare_transaction` for large transfers
4. Wait for `authorize_transaction` after approval

## Testing Issues

### Unit Tests Fail

**Problem**: Unit tests pass but integration tests fail
**Solutions**:

1. Unit tests use viem mocks (no network calls)
2. Integration tests use live RPC (requires network)
3. Skip integration tests if RPC is slow/unavailable
4. Use `bun test:unit` for isolated testing

### Tests Time Out

**Problem**: Tests taking too long or timing out
**Solutions**:

1. Check network connectivity
2. Increase timeout in test: `test({...}, 60000)`
3. Check for slow RPC endpoints
4. Run fewer tests: `bun test tests/unit/wallet/`

### Test Failures Persist

**Problem**: Same test fails every time
**Solutions**:

1. Check for caching issues
2. Clear test cache: `rm -rf node_modules/.cache`
3. Check if test is using stale data (time-sensitive)
4. Consider mocking external dependencies

## Development Issues

### Build Errors

**Problem**: `bun run build` fails
**Solution**:

1. Run `bun run typecheck` first
2. Fix TypeScript errors before building
3. Check for missing dependencies
4. Verify `src/index.ts` exists

### Lint Errors

**Problem**: `bun run lint` shows errors
**Solution**:

1. Run `bun run lint:fix` to auto-fix
2. Fix issues one by one (easier to verify)
3. Check for false positives
4. Run `bun run format` after fixes

## Environment Variables

### .env Not Loading

**Problem**: Environment variables not taking effect
**Solution**:

1. Ensure `.env` file is in project root
2. Restart MCP server after changes
3. Use absolute paths in config, not relative
4. Verify Bun auto-loads `.env` (it does)

### Key Storage

**Problem**: Keys lost on restart
**This is expected behavior**:

- Keys are stored in-memory only
- Keys are not persisted to disk by design
- Re-import wallet after restart

## Version Conflicts

### Package Version Mismatch

**Problem**: Using incompatible Bun or Viem version
**Solution**:

1. Check `package.json` dependencies
2. Run `bun pm ls` to check versions
3. Update to compatible versions:
   ```bash
   bun update bun
   bun update viem
   ```
4. Clear lockfile: `rm bun.lockb && bun install`

## Network Issues

### RPC Endpoint Down

**Problem**: Cannot connect to blockchain
**Solutions**:

1. Check network connectivity: `ping 8.8.8.8`
2. Use alternative RPC endpoint
3. Configure custom RPC in `.env`
4. Check RPC status pages (etherscan, polygonscan, etc.)

### Multiple Tools Failing

**Problem**: Many MCP tools timeout/fail
**Solutions**:

1. Reduce concurrent operations
2. Increase rate limits in `.env`
3. Use separate agent/wallets for isolation
4. Check for global rate limits at RPC provider level

## Getting Help

If you're stuck:

1. **Check logs**: MCP server logs show detailed error messages
2. **Enable debug mode**: `DEBUG=true bun run mcp`
3. **Run smoke test**: `bun run smoke-test` validates core functionality
4. **Check docs**: Start with [Home](Home) → [Getting Started](Getting-Started)
5. **File issue**: https://github.com/calebrosario/agentic-evm-wallet/issues
6. **Discuss**: Ask in community discussions

## Common Error Messages

| Error Message                                       | Likely Cause               | Solution                     |
| --------------------------------------------------- | -------------------------- | ---------------------------- |
| "Invalid key ID format: expected 'chainId:address'" | Wrong key format           | Use `chainId:address` format |
| "Chain not supported"                               | Invalid chain ID           | Use `get_supported_chains`   |
| "Key not found"                                     | Key not in storage         | Create/import wallet first   |
| "Rate limit exceeded"                               | Too many requests          | Wait or increase limits      |
| "Transaction validation failed"                     | Invalid transaction params | Check gas/value limits       |
| "Insufficient funds"                                | Not enough ETH             | Fund wallet first            |
| "RPC request failed"                                | Network issue              | Check RPC or retry           |

## Performance Tips

### Slow Operations

If MCP tools are slow:

1. Check RPC latency with `get_gas_price`
2. Use custom RPC endpoints if public nodes are slow
3. Batch operations when possible
4. Increase timeout in Claude Desktop

### High Gas Prices

1. Check current network congestion
2. Wait for off-peak hours
3. Consider EIP-1559 if chain supports it
4. Monitor gas price trends before executing

## Reporting Bugs

When filing an issue on GitHub:

1. **Title**: Clear, descriptive summary
2. **Steps to reproduce**: Detailed reproduction steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happened
5. **Environment**: Bun version, Viem version, OS
6. **Logs**: Error messages or stack traces
7. **Workarounds**: Things you tried that didn't work

Use issue templates:

```
- [Bug] Transaction not appearing in block explorer
- [Bug] Rate limit not resetting
- [Feature Request] Add support for new chain
- [Help] MCP server setup issues
```
