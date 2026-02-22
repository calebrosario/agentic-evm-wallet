# WALLET MODULE

## OVERVIEW

Multi-chain EVM wallet management for AI agents with creation, import, and balance operations.

## WHERE TO LOOK

| Task                | Location                     | Notes                                  |
| ------------------- | ---------------------------- | -------------------------------------- |
| Wallet creation     | walletManager.ts             | createWallet() - generates new wallet  |
| Wallet import       | walletManager.ts             | importWallet() - imports from priv key |
| Balance queries     | walletManager.ts             | getBalance() - native + ERC20 tokens   |
| Chain configuration | walletManager.ts             | chains Map, getChainConfig()           |
| Address retrieval   | walletManager.ts             | getWalletAddress()                     |
| Unit tests          | walletManager.test.ts        | Full coverage + edge cases             |
| Simple tests        | walletManager-simple.test.ts | Smoke tests                            |

## CONVENTIONS

- **One wallet per chain**: Map<chainId, AgentWallet> storage pattern
- **Address normalization**: All addresses stored/returned in lowercase
- **Private key format**: Always prefixed with "0x", 64 hex chars
- **Supported chains**: Ethereum (1), Polygon (137) - expandable via chains Map
- **RPC clients**: Create fresh publicClient per balance query (no connection pooling)
- **Default chain**: ImportWallet defaults to chainId 1 (Ethereum)
- **Singleton pattern**: Export default walletManager instance

## ANTI-PATTERNS

- Never reuse wallets across chains (one-to-one chain mapping)
- Never store private keys in plaintext outside AgentWallet object
- Never assume wallet exists before operations (check Map first)
- Never hardcode RPC URLs (use http() with chain config)
- Never validate private keys without 0x prefix handling
- Never use addresses without lowercase normalization
