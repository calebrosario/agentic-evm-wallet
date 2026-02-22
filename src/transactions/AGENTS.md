# src/transactions

## OVERVIEW

Transaction building and validation for EVM chains using Viem.

## WHERE TO LOOK

| Task               | File                  | Notes                                        |
| ------------------ | --------------------- | -------------------------------------------- |
| Build transactions | transactionBuilder.ts | buildTransaction(), signTransaction()        |
| Validate addresses | transactionBuilder.ts | isValidAddress() regex check                 |
| Chain management   | transactionBuilder.ts | getChainConfig() - hardcoded mainnet/polygon |
| Send transactions  | transactionBuilder.ts | sendTransaction() via wallet client          |

## CONVENTIONS

- **Builder pattern**: TransactionBuilder class with factory injection for testability
- **Viem types**: Use TransactionRequest, Address from Viem, never custom types
- **Hardcoded chains**: Currently supports Ethereum (1) and Polygon (137) only
- **Gas estimation**: Always estimate via publicClient before building
- **Private key format**: Accept with/without 0x prefix, validate 64 hex chars

## ANTI-PATTERNS

- Never skip chain ID validation (throws on unsupported chains)
- Never skip address validation (regex: 0x[a-fA-F0-9]{40})
- Never hardcode private keys in tests (use dummy values, mocked wallet)
- Never send unsigned transactions (always sign via walletClient)
- Never use custom transaction structures - stick to Viem's TransactionRequest
