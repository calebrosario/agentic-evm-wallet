# Supported Chains

The Agentic EVM Wallet supports the top 10 EVM blockchains by users/TVL. All chain configurations are centralized in `src/chains/chainConfig.ts` for maintainability and type safety.

## Quick Reference

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

## Usage

### Get Chain Configuration

```typescript
import { getChain, isChainSupported } from "@/chains/chainConfig";

// Check if a chain is supported
if (isChainSupported(1)) {
  const chain = getChain(1 as SupportedChainId);
  console.log(chain.name); // "Ethereum"
  console.log(chain.nativeCurrency.symbol); // "ETH"
}
```

### Get All Supported Chains

```typescript
import { getAllChains, getAllSupportedChainIds } from "@/chains/chainConfig";

// Get all chain IDs
const chainIds = getAllSupportedChainIds();
// [1, 56, 137, 42161, 10, 43114, 8453, 324, 250, 100]

// Get all chain configurations
const chains = getAllChains();
chains.forEach((chain, chainId) => {
  console.log(`${chainId}: ${chain.name}`);
});
```

### Chain Metadata and Utilities

```typescript
import { validateChainId, getChainMetadata, getAllChainInfo } from "@/chains/registry";

// Validate a chain ID
const isValid = validateChainId(1); // true
const isInvalid = validateChainId(999); // false

// Get chain metadata
const metadata = getChainMetadata(137);
// { name: "Polygon", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 }, id: 137 }

// Get all chain info for UI (dropdowns, etc.)
const chainInfo = getAllChainInfo();
// [{ id: 1, name: "Ethereum", nativeSymbol: "ETH" }, ...]
```

### Block Explorer URLs

```typescript
import { getBlockExplorerUrl, getTransactionUrl, getAddressUrl } from "@/chains/registry";

// Get block explorer base URL
const explorerUrl = getBlockExplorerUrl(1); // "https://etherscan.io"

// Get transaction URL
const txUrl = getTransactionUrl(1, "0xabc123...");
// "https://etherscan.io/tx/0xabc123..."

// Get address URL
const addrUrl = getAddressUrl(1, "0x123abc...");
// "https://etherscan.io/address/0x123abc..."
```

## Chain Details

### Ethereum (1)

- **Native Token:** ETH
- **Block Time:** ~12 seconds
- **Consensus:** Proof of Stake
- **Explorer:** https://etherscan.io
- **Notes:** Main network, highest security, highest gas fees

### BNB Smart Chain (56)

- **Native Token:** BNB
- **Block Time:** ~3 seconds
- **Consensus:** Proof of Staked Authority (PoSA)
- **Explorer:** https://bscscan.com
- **Notes:** High throughput, low fees, EVM-compatible

### Polygon (137)

- **Native Token:** POL (formerly MATIC)
- **Block Time:** ~2 seconds
- **Consensus:** Proof of Stake
- **Explorer:** https://polygonscan.com
- **Notes:** Ethereum L2, low fees, high throughput

### Arbitrum One (42161)

- **Native Token:** ETH
- **Block Time:** ~0.25 seconds
- **Consensus:** Optimistic Rollup
- **Explorer:** https://arbiscan.io
- **Notes:** Ethereum L2, low fees, high compatibility

### OP Mainnet (10)

- **Native Token:** ETH
- **Block Time:** ~2 seconds
- **Consensus:** Optimistic Rollup
- **Explorer:** https://optimistic.etherscan.io
- **Notes:** Ethereum L2, low fees, Superchain member

### Avalanche (43114)

- **Native Token:** AVAX
- **Block Time:** ~2 seconds
- **Consensus:** Proof of Stake (Snowman)
- **Explorer:** https://snowtrace.io
- **Notes:** High throughput, sub-second finality, DeFi hub

### Base (8453)

- **Native Token:** ETH
- **Block Time:** ~2 seconds
- **Consensus:** Optimistic Rollup
- **Explorer:** https://basescan.org
- **Notes:** Coinbase L2, fast-growing, low fees

### ZKsync Era (324)

- **Native Token:** ETH
- **Block Time:** ~seconds
- **Consensus:** ZK-Rollup
- **Explorer:** https://era.zksync.io
- **Notes:** ZK technology, account abstraction native

### Fantom (250)

- **Native Token:** FTM
- **Block Time:** ~1 second
- **Consensus:** Lachesis (aBFT)
- **Explorer:** https://ftmscan.com
- **Notes:** Fast finality, low fees, DeFi focused

### Gnosis (100)

- **Native Token:** XDAI
- **Block Time:** ~5 seconds
- **Consensus:** Proof of Stake (POSDAO)
- **Explorer:** https://gnosisscan.io
- **Notes:** Stable transactions, XDAI is stablecoin

## Adding New Chains

To add a new chain:

1. Add the chain ID to `SupportedChainId` type in `src/chains/types.ts`
2. Import the chain from `viem/chains` in `src/chains/chainConfig.ts`
3. Add the chain to the `CHAINS` Map
4. Update `getAllChainInfo()` in `src/chains/registry.ts`
5. Add chain-specific tests in `tests/unit/chains/chainConfig.test.ts`
6. Update this documentation

## Custom RPC URLs

You can override default RPC URLs when creating clients:

```typescript
import { TransactionExecutor } from "@/execution/transactionExecutor";
import { KeyManager } from "@/key/keyManager";

const executor = new TransactionExecutor({
  keyManager: new KeyManager(),
  rpcUrls: {
    1: "https://my-custom-eth-rpc.example.com",
    137: "https://my-custom-polygon-rpc.example.com"
  }
});
```

This is useful for:

- Using private RPC endpoints for better reliability
- Using archive nodes for historical data
- Rate limiting and quota management
