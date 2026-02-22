# Gas Estimation Integration Tests

This directory contains integration tests for the gas estimation system that test real-world scenarios against live Ethereum and Polygon networks.

## Test Coverage

### Multi-Chain Gas Estimation

Tests gas estimation and price fetching across multiple chains:

- **Ethereum Mainnet** (Chain ID: 1)
  - Simple ETH transfers
  - Gas price retrieval
- **Polygon** (Chain ID: 137)
  - MATIC transfers
  - Gas price comparison

### Transaction Simulation Tests

Tests various transaction scenarios:

- Contract interactions with custom data
- WETH contract calls (balanceOf)
- Zero value transfers

### Gas Prediction Accuracy Tests

Validates gas estimation accuracy:

- Simple transfer predictions
- Gas limit suggestions
- Value-agnostic gas estimation

### EIP-1559 Integration Tests

Tests EIP-1559 transaction parameters:

- maxFeePerGas and maxPriorityFeePerGas
- Custom maxFeePerGas
- Custom maxPriorityFeePerGas

### Error Handling

Tests error scenarios:

- Invalid addresses
- Unsupported chains
- Empty addresses

### Performance Benchmarks

Tests performance characteristics:

- Single gas estimation latency
- Gas price retrieval latency
- Concurrent estimation handling

## Running the Tests

### Run all integration tests:

```bash
bun test tests/integration/gasEstimation.test.ts
```

### Run with verbose output:

```bash
bun test tests/integration/gasEstimation.test.ts --reporter=verbose
```

### Run specific test suite:

```bash
bun test tests/integration/gasEstimation.test.ts -t "Multi-Chain Gas Estimation"
```

## Test Requirements

- Active internet connection (tests make RPC calls to live networks)
- Bun runtime
- viem library

## Important Notes

### Network Conditions

Integration tests make actual RPC calls to:

- Ethereum Mainnet
- Polygon Mainnet

Test execution time depends on network conditions. Tests include generous timeouts (30-45s) to accommodate network latency.

### Gas Price Variations

Gas prices on live networks fluctuate. Tests are designed to:

- Accept ranges rather than exact values where appropriate
- Log actual gas prices for debugging
- Be resilient to network congestion

### Test Data

Tests use real contract addresses:

- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- Recipient addresses from known wallets

## Expected Behavior

### Pass Criteria

All 20 tests should pass when:

- Network is accessible
- RPC endpoints are responsive
- Gas estimation completes within timeout

### Common Failure Scenarios

1. **Network timeout**: Test exceeds configured timeout
   - Solution: Increase timeout or retry

2. **RPC error**: Node rejects request
   - Solution: Check network connectivity

3. **Gas price spikes**: Unexpectedly high gas prices
   - Solution: Adjust assertions or retry

## Contributing

When adding new integration tests:

1. Include clear test names describing the scenario
2. Add appropriate timeouts (minimum 30s for network calls)
3. Use real addresses and contract data
4. Handle network variations gracefully
5. Log relevant values for debugging

## Related Documentation

- [Unit Tests](../unit/README.md)
- [GasManager Implementation](../../src/gas/gasManager.ts)
- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)
