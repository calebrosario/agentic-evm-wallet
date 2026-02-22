# Architecture

This document describes the system architecture and component design of Agentic EVM Wallet.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude/Custom)                │
│                              ↓                                │
│                    Model Context Protocol (MCP)          │
│                              ↓                                │
│                    ┌─────────────────────────┐            │
│                    │  WalletTools         │            │
│                    │  - 13 Tools         │            │
│                    └──────────┬──────────┘            │
│                               ↓                         │
│    ┌────────────────────┬─────────────────┐            │
│    │                  │                 │            │
│  WalletManager   AgentRateLimiter  TransactionExecutor   │
│    │                  │                 │            │
│  ┌───┐   ┌─────┐      ┌──────┐      │
│  │Key │   │Task │      │Retry │      │
│  │Mgr │   │Queue│      │Logic │      │
│  └─┬─┘   └──┬──┘      └──┬───┘      │
│    ↓          ↓      ↓            ↓      │
│  KeyManager  AgentManager     Viem           │
│              │                 │      │
│              ↓                 │      │
│         In-memory storage      Blockchain RPC              │
└─────────────────────────────────────────────────────────────┘
```

## Component Layers

### Layer 1: MCP Interface

**File**: `src/mcp/server.ts`, `src/mcp/tools.ts`

**Purpose**: Expose blockchain operations as MCP tools to AI agents

**Key Components**:

- `WalletTools` class - Implements all 13 tools
- Zod schemas - Runtime parameter validation
- Server initialization - MCP protocol handshake

**Tools**:

1. `get_supported_chains` - List all chains
2. `get_chain_info` - Chain details
3. `create_wallet` - Generate new wallet
4. `import_wallet` - Import existing key
5. `get_address` - Retrieve wallet address
6. `get_balance` - Check balance
7. `estimate_gas` - Gas estimation
8. `get_gas_price` - Current gas price
9. `prepare_transaction` - Build transaction
10. `get_pending_transactions` - Approval queue
11. `authorize_transaction` - Approve large transfer
12. `execute_transaction` - Execute transaction
13. `get_rate_limit_status` - Rate limit status

### Layer 2: Wallet Management

**Files**: `src/wallet/walletManager.ts`

**Purpose**: Create, import, and manage multi-chain wallets

**Key Operations**:

- `createWallet(chainId)` - Generate new wallet with in-memory key
- `importWallet(chainId, privateKey)` - Import existing private key
- `getBalance(chainId, address)` - Get native/ERC-20 balance
- `getWalletAddress(chainId, keyId)` - Retrieve wallet address

**Design**:

- Keys stored in-memory (Map: keyId → { privateKey, address, chainId })
- Keys isolated by chain (different key per chain)
- Encrypted storage (in-memory, non-persistent)

### Layer 3: Key Management

**Files**: `src/key/keyManager.ts`

**Purpose**: Secure key storage and retrieval

**Key Methods**:

- `generateKey()` - Generate new private key
- `importKey()` - Import existing private key
- `exportKey(keyId)` - Retrieve private key for signing
- `getKey(address, chainId)` - Get key metadata

**Security**:

- Keys never persisted to disk
- Encrypted in-memory storage
- Chain-isolated keys (prevent cross-chain issues)

### Layer 4: Transaction Execution

**Files**: `src/execution/transactionExecutor.ts`, `src/execution/types.ts`

**Purpose**: Execute transactions with retry logic and confirmation

**Key Features**:

- **Retry Logic**: Exponential backoff on transient failures
- **Event System**: Emits `signed`, `broadcasted`, `confirmed`, `failed` events
- **Timeout Handling**: Configurable confirmation timeout
- **Validation**: Validates transaction before execution
  - Max gas limit: 30M
  - Max value: 1M ETH
  - Max data size: 1MB

**Retry Policy**:

```typescript
{
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 10000,
  backoffMultiplier: 2.0
}
```

### Layer 5: Gas Management

**Files**: `src/gas/gasManager.ts`

**Purpose**: Estimate gas and fetch current gas prices

**Key Operations**:

- `estimateGas(chainId, params)` - Estimate gas for transaction
- `getGasPrice(chainId)` - Get current gas price
- `suggestGasLimit(operation)` - Suggest gas limit for operation

**Gas Types**:

- `transfer` - 21000 gas
- `contract` - 100000 gas
- `complex` - 500000 gas

### Layer 6: Security Layer

**Files**:

- `src/security/rateLimiter.ts` - Rate limiting
- `src/security/transactionApproval.ts` - Transaction approval workflow

**Features**:

#### Rate Limiting

- **Request-level**: 100 requests/minute (configurable)
- **Transaction-level**: 10/hour, 1000/day (configurable)
- **Async mutex**: Queue-based locks (no busy-wait polling)
- **Per-agent tracking**: Isolated limits per agent

#### Transaction Approval

- **Two-step workflow**: Prepare → Authorize → Execute
- **Size limits**: Configurable max ETH per transaction
- **Pending queue**: Store transactions awaiting approval
- **Authorization**: Explicit approval for large transfers

### Layer 7: Chain Management

**Files**: `src/chains/chainConfig.ts`, `src/chains/registry.ts`

**Purpose**: Centralized chain configuration and validation

**Supported Chains** (10):

1. Ethereum (ETH) - Chain ID: 1
2. Polygon (POL) - Chain ID: 137
3. BNB Smart Chain (BNB) - Chain ID: 56
4. Arbitrum One (ETH) - Chain ID: 42161
5. OP Mainnet (ETH) - Chain ID: 10
6. Avalanche (AVAX) - Chain ID: 43114
7. Base (ETH) - Chain ID: 8453
8. ZKsync Era (ETH) - Chain ID: 324
9. Fantom (FTM) - Chain ID: 250
10. Gnosis (XDAI) - Chain ID: 100

**Validation**:

- `getChain(chainId)` - Get chain or throw
- `getChainOrThrow(chainId)` - Get chain (throws if invalid)
- `isChainSupported(chainId)` - Check support
- `getAllSupportedChainIds()` - List all chain IDs

### Layer 8: Agent Orchestration

**Files**: `src/agent/agentManager.ts`, `src/agent/taskQueue.ts`

**Purpose**: Multi-agent coordination and task scheduling

**Features**:

- **Priority Queue**: Higher priority tasks execute first
- **Task Timeout**: Configurable timeout per task
- **Agent Isolation**: Each agent has isolated context
- **Error Handling**: Graceful failure handling

## Data Flow

### Creating a Wallet

```
AI Agent
  ↓
MCP: create_wallet(chainId=1)
  ↓
WalletManager.createWallet(1)
  ↓
KeyManager.generateKey()
  ↓
Store: { privateKey, address, chainId }
  ↓
Return: { keyId: "1:0x1234...", address: "0x1234..." }
  ↓
AI Agent receives wallet details
```

### Executing a Transaction

```
AI Agent
  ↓
MCP: execute_transaction(to="0x5678...", value="1000000000000000")
  ↓
TransactionExecutor.executeTransaction()
  ↓
Validation: Check gas limit, value size, address format
  ↓
KeyManager.exportKey(keyId="1:0x1234...")
  ↓
Viem: signTransaction(transaction, privateKey)
  ↓
Viem: sendTransaction(signedTx)
  ↓
[Retry Logic if fails]
  ↓
Wait for confirmation (poll with exponential backoff)
  ↓
Emit: confirmed event
  ↓
Return: { hash, status, blockNumber, gasUsed, retries }
  ↓
AI Agent receives transaction result
```

### Transaction Approval Flow

```
AI Agent (large transfer > 100 ETH)
  ↓
MCP: prepare_transaction(value="500000000000000000000")  // 500 ETH
  ↓
TransactionApproval.prepare(chainId, address, value, data)
  ↓
Store: { transactionId, status: "pending" }
  ↓
AI Agent reviews pending list
  ↓
MCP: get_pending_transactions(chainId, address)
  ↓
TransactionApproval.getPending(chainId, address)
  ↓
AI Agent (human approval)
  ↓
MCP: authorize_transaction(transactionId="tx_123")
  ↓
TransactionApproval.authorize(transactionId)
  ↓
AI Agent executes transaction
  ↓
TransactionExecutor.executeTransaction()
  ↓
...
```

## Security Architecture

### Key Storage

```
In-memory Map: keyId → KeyEntry

KeyEntry {
  privateKey: string    // Encrypted
  address: string       // Derived
  chainId: number       // Chain identifier
}

Lifecycle:
  - Generated on wallet creation
  - Imported via private key
  - Never persisted to disk
  - Cleared when process exits
```

### Rate Limiting

```
AgentRateLimiter per-chain tracking:

Map: `${chainId}:${address}` → {
  recentHour: number[],
  recentDay: number[]
}

Rate Limit Checks:
  - Hourly: recentHour.length < MAX_TRANSACTIONS_PER_HOUR
  - Daily: recentDay.length < MAX_TRANSACTIONS_PER_DAY
  - Request: requestCount < RATE_LIMIT_MAX_REQUESTS

Mutex: Promise-based async queue (no busy-wait polling)
```

### Transaction Validation

```
TransactionExecutor.validateTransaction():

Checks:
  1. Gas limit ≤ 30M
  2. Value ≤ 1M ETH (BigInt comparison)
  3. Data length ≤ 1MB
  4. Address format valid (0x + 40 hex chars)
  5. Transaction structure complete

Rejects with: TransactionExecutionError(code, details)
```

## Performance Characteristics

| Operation           | Typical Latency     | Retries |
| ------------------- | ------------------- | ------- |
| Create wallet       | <10ms               | 0       |
| Get balance         | RPC-dependent       | 0       |
| Estimate gas        | RPC-dependent       | 0       |
| Execute transaction | RPC + confirmation  | 0-3     |
| Failed retry        | Exponential backoff | 1-3     |

## Error Handling

| Error Type               | Handling Strategy                      |
| ------------------------ | -------------------------------------- |
| **RPC timeout**          | Retry with exponential backoff (max 3) |
| **Invalid key ID**       | Fail immediately (no retry)            |
| **Invalid transaction**  | Fail immediately (no retry)            |
| **Rate limit exceeded**  | Fail immediately (no retry)            |
| **Confirmation timeout** | Return current status, timeout event   |

## Extensibility Points

### Adding New Chains

1. Add chain config to `src/chains/chainConfig.ts`
2. Add to supported chains array
3. Add to CHAINS export
4. Tests for new chain

### Adding New Tools

1. Add tool method to `WalletTools` class
2. Add Zod schema for validation
3. Register tool in `registerAll()` method
4. Update tool count in documentation

### Custom Rate Limiting

Implement `IRateLimiter` interface:

```typescript
interface IRateLimiter {
  checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
  clear(identifier?: string): void;
}
```

## Technology Stack

| Component          | Technology                   |
| ------------------ | ---------------------------- |
| **Runtime**        | Bun                          |
| **Blockchain**     | Viem                         |
| **Validation**     | Zod                          |
| **Protocol**       | Model Context Protocol (MCP) |
| **Language**       | TypeScript                   |
| **Test Framework** | bun:test                     |

## Related Documentation

- [Home](Home) - Project overview
- [MCP Integration](MCP-Integration) - Setup guide
- [API Reference](API-Reference) - Tool documentation
- [Development](Development) - Build and test
