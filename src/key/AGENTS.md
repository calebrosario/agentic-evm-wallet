# KEY MODULE

**Generated:** 2026-02-17

## OVERVIEW

Key management and cryptographic signing for EVM transactions using Viem accounts.

## WHERE TO LOOK

| Task                   | File          | Function               |
| ---------------------- | ------------- | ---------------------- |
| Generate new key       | keyManager.ts | generateKey()          |
| Import existing key    | keyManager.ts | importKey()            |
| Export private key     | keyManager.ts | exportKey()            |
| Sign transaction       | keyManager.ts | signTransaction()      |
| Validate private key   | keyManager.ts | validatePrivateKey()   |
| List all keys          | keyManager.ts | listKeys()             |
| Generate secure random | keyManager.ts | generateSecureRandom() |
| Type definitions       | types.ts      | All interfaces         |

## CONVENTIONS

- **Key ID format**: `${chainId}:${address}` for unique identification
- **Supported chains**: Ethereum (1), Polygon (137) - extensible via chains Map
- **Random generation**: `crypto.getRandomValues()` (Bun crypto compliant, no node:crypto)
- **Key derivation**: Viem's `privateKeyToAccount` for address generation
- **In-memory storage**: Map-based key store (non-persistent, no encryption yet)
- **Address validation**: Regex `/^0x[a-fA-F0-9]{40}$/` for format checking
- **Hex format**: All private keys as `0x${string}` with Hex type

## ANTI-PATTERNS

- Never use `node:crypto` - use `crypto.getRandomValues()` instead
- Never log private keys or expose them in API responses
- Never persist keys without encryption (current in-memory only, encryption planned)
- Never skip privateKey validation before signing operations
- Never import keys for unsupported chain IDs without validation
