# API Reference

Complete documentation of all 13 MCP tools exposed by Agentic EVM Wallet.

## Tool Categories

- **Wallet Management** - Create, import, address, balance
- **Chain Operations** - List chains, chain info
- **Gas Operations** - Estimate gas, gas price
- **Transactions** - Prepare, execute, pending, approve
- **Safety** - Rate limit status

---

## Wallet Tools

### create_wallet

Create a new wallet on a specific blockchain.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID (1, 137, 56, etc.)

**Returns**:

```typescript
{
  address: string,      // Wallet address (0x...)
  chainId: number,     // Chain ID
  keyId: string        // Key identifier: "chainId:address"
}
```

**Example**:

```json
{
  "chainId": 1
}
```

**Response**:

```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "chainId": 1,
  "keyId": "1:0x1234567890123456789012345678901234567890"
}
```

### import_wallet

Import an existing wallet using its private key.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `privateKey` (string, required) - 64-character hex string starting with "0x"

**Returns**:

```typescript
{
  address: string,
  chainId: number,
  keyId: string
}
```

**Example**:

```json
{
  "chainId": 1,
  "privateKey": "0x1234...67890"
}
```

### get_address

Get the wallet address for a specific chain and key.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `keyId` (string, required) - Key identifier (format: "chainId:address")

**Returns**:

```typescript
{
  address: string;
}
```

**Example**:

```json
{
  "chainId": 1,
  "keyId": "1:0x1234..."
}
```

**Response**:

```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

### get_balance

Get wallet balance (native token or ERC-20).

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `address` (string, required) - Wallet address
- `contractAddress?` (string, optional) - ERC-20 contract address
- `tokenDecimals?` (number, optional) - Token decimals (default: 18)

**Returns**:

```typescript
{
  balance: string,      // Balance as string (wei value)
  balanceWei: bigint,   // Balance as bigint
  tokenSymbol: string,  // Token symbol ("ETH", "POL", etc.)
}
```

**Example**:

```json
{
  "chainId": 1,
  "address": "0x1234...",
  "contractAddress": "0xA0b86933c6652362e4a8654041356ab6"
}
```

**Response**:

```json
{
  "balance": "10000000000000000000",
  "balanceWei": "10000000000000000000n",
  "tokenSymbol": "USDC"
}
```

---

## Chain Tools

### get_supported_chains

List all supported EVM blockchains.

**Parameters**: None

**Returns**: Array of chain objects

```typescript
Array<{
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: {
    name: string;
    url: string;
  };
}>;
```

**Example Response**:

```json
[
  {
    "id": 1,
    "name": "Ethereum",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "blockExplorer": {
      "name": "etherscan.io",
      "url": "https://etherscan.io"
    }
  },
  {
    "id": 137,
    "name": "Polygon",
    "nativeCurrency": {
      "name": "MATIC",
      "symbol": "POL",
      "decimals": 18
    },
    "blockExplorer": {
      "name": "polygonscan.com",
      "url": "https://polygonscan.com"
    }
  }
]
```

### get_chain_info

Get detailed information for a specific chain.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID

**Returns**:

```typescript
{
  id: number,
  name: string,
  nativeCurrency: { ... },
  rpcUrls: {
    default: string[],
    public: string[]
  },
  blockExplorer: { ... },
  contracts: Record<string, string>
}
```

**Example**:

```json
{
  "chainId": 1
}
```

---

## Gas Tools

### estimate_gas

Estimate gas required for a transaction.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `to` (string, required) - Recipient address
- `value?` (string, optional) - Transaction value (hex)
- `data?` (string, optional) - Transaction data (hex)
- `gas?` (string, optional) - Gas limit (hex)
- `maxFeePerGas?` (string, optional) - EIP-1559 max fee
- `maxPriorityFeePerGas?` (string, optional) - EIP-1559 priority fee

**Returns**:

```typescript
{
  gas: bigint; // Estimated gas as bigint
}
```

**Example**:

```json
{
  "chainId": 1,
  "to": "0x1234...",
  "value": "0xde0b6b3a7640000",
  "data": "0xa9059cbb7"
}
```

**Response**:

```json
{
  "gas": "21000"
}
```

### get_gas_price

Get current gas price for a chain.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID

**Returns**:

```typescript
{
  gasPrice: bigint,  // Gas price as bigint (wei)
  gasPriceGwei: string  // Gas price in gwei (formatted)
}
```

**Example**:

```json
{
  "chainId": 1
}
```

**Response**:

```json
{
  "gasPrice": "20000000000n",
  "gasPriceGwei": "20.0"
}
```

---

## Transaction Tools

### prepare_transaction

Prepare a transaction without executing (estimate gas, build request).

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `to` (string, required) - Recipient address
- `value?` (string, optional) - Transaction value (hex)
- `data?` (string, optional) - Transaction data (hex)
- `gas?` (string, optional) - Gas limit (hex)
- `maxFeePerGas?` (string, optional) - EIP-1559 max fee
- `maxPriorityFeePerGas?` (string, optional) - EIP-1559 priority fee

**Returns**:

```typescript
{
  transaction: TransactionRequest,  // Prepared transaction object
  gasLimit: bigint,        // Estimated gas
  gasPrice: bigint        // Current gas price
}
```

**Example**:

```json
{
  "chainId": 1,
  "to": "0x1234...",
  "value": "0xde0b6b3a7640000"
}
```

**Response**:

```json
{
  "transaction": {
    "to": "0x1234...",
    "value": "0xde0b6b3a7640000n",
    "gas": "0x5208",
    "gasPrice": "0x4a817c800",
    "maxFeePerGas": "0x59682f00",
    "maxPriorityFeePerGas": "0x59682f00"
  },
  "gasLimit": "21000",
  "gasPrice": "20000000000n"
}
```

### get_pending_transactions

Get transactions pending approval for a wallet.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `address` (string, required) - Wallet address

**Returns**:

```typescript
Array<{
  transactionId: string; // Unique transaction ID
  to: string; // Recipient
  value: string; // Value (hex)
  data: string; // Data (hex)
  status: "pending"; // Always "pending"
  createdAt: string; // ISO timestamp
}>;
```

**Example**:

```json
{
  "chainId": 1,
  "address": "0x1234..."
}
```

**Response**:

```json
[
  {
    "transactionId": "tx_abc123",
    "to": "0x5678...",
    "value": "0x16345789d00000000",
    "data": "0x",
    "status": "pending",
    "createdAt": "2024-02-21T10:30:00Z"
  }
]
```

### authorize_transaction

Authorize a pending transaction for execution.

**Parameters**:

- `transactionId` (string, required) - Transaction ID from `prepare_transaction` or `get_pending_transactions`

**Returns**:

```typescript
{
  success: boolean,
  message: string
}
```

**Example**:

```json
{
  "transactionId": "tx_abc123"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Transaction authorized successfully"
}
```

### execute_transaction

Execute a transaction on blockchain.

**Parameters**:

- `chainId` (number, required) - Blockchain chain ID
- `keyId` (string, required) - Key identifier
- `to` (string, required) - Recipient address
- `value?` (string, optional) - Transaction value (hex)
- `data?` (string, optional) - Transaction data (hex)
- `gas?` (string, optional) - Gas limit (hex)

**Returns**:

```typescript
{
  hash: string,              // Transaction hash
  status: TransactionStatus,  // "pending", "confirmed", "failed"
  blockNumber?: bigint,    // Block number (if confirmed)
  gasUsed?: bigint,        // Gas used (if confirmed)
  retries: number            // Retry count (0-3)
}
```

**Example**:

```json
{
  "chainId": 1,
  "keyId": "1:0x1234...",
  "to": "0x5678...",
  "value": "0xde0b6b3a7640000",
  "gas": "0x5208"
}
```

**Response**:

```json
{
  "hash": "0xabc123def456...",
  "status": "confirmed",
  "blockNumber": "18234567n",
  "gasUsed": "21000n",
  "retries": 0
}
```

**Status Values**:

- `pending` - Transaction submitted, awaiting confirmation
- `confirmed` - Transaction confirmed, included in block
- `failed` - Transaction failed (check error message)

---

## Safety Tools

### get_rate_limit_status

Check current rate limit status for the agent.

**Parameters**: None

**Returns**:

```typescript
{
  requestLimit: number,      // Max requests per window
  windowMs: number,          // Window size in milliseconds
  requestsRemaining: number, // Requests remaining in current window
  requestsUsed: number,     // Requests used in current window
  requestLimitConfigured: boolean,  // Whether custom limit configured
  transactionLimits: {
    maxPerHour: number,
    maxPerDay: number,
    hourlyUsed: number,
    dailyUsed: number
  }
}
```

**Example Response**:

```json
{
  "requestLimit": 100,
  "windowMs": 60000,
  "requestsRemaining": 95,
  "requestsUsed": 5,
  "requestLimitConfigured": false,
  "transactionLimits": {
    "maxPerHour": 10,
    "maxPerDay": 1000,
    "hourlyUsed": 2,
    "dailyUsed": 15
  }
}
```

---

## Error Codes

| Code                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `INVALID_CHAIN`       | Chain ID not supported or invalid           |
| `INVALID_ADDRESS`     | Invalid Ethereum address format             |
| `INVALID_KEY`         | Invalid private key format or key not found |
| `INVALID_TRANSACTION` | Transaction validation failed               |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded                         |
| `KEY_NOT_FOUND`       | Key identifier not found                    |
| `TRANSACTION_FAILED`  | Transaction execution failed                |

---

## Common Patterns

### Multi-Chain Wallet

AI agents can manage wallets across multiple chains:

```typescript
// Create wallet on Ethereum
const ethWallet = await createWallet({ chainId: 1 });
const ethAddress = ethWallet.address;

// Create wallet on Polygon
const polyWallet = await createWallet({ chainId: 137 });
const polyAddress = polyWallet.address;

// Check balances
const ethBalance = await getBalance({ chainId: 1, address: ethAddress });
const polyBalance = await getBalance({ chainId: 137, address: polyAddress });
```

### Transaction Flow

Standard flow for executing a transaction:

```typescript
// 1. Prepare transaction
const { gasLimit, transaction } = await prepareTransaction({
  chainId: 1,
  to: "0x5678...",
  value: "1000000000000000000" // 1 ETH in wei
});

// 2. Execute transaction
const result = await executeTransaction({
  chainId: 1,
  keyId: ethWallet.keyId,
  to: "0x5678...",
  value: "1000000000000000000",
  gas: gasLimit.toString()
});

// 3. Monitor status
console.log(`Transaction hash: ${result.hash}`);
console.log(`Status: ${result.status}`);
```

### Gas Estimation

Always estimate gas before executing to avoid overpaying:

```typescript
const gas = await estimateGas({
  chainId: 1,
  to: recipient,
  value: amountWei.toString(16)
});

const estimatedCostWei = gas * gasPrice;
console.log(
  `Estimated cost: ${estimatedCostWei} wei (${Number(estimatedCostWei / 1e18).toFixed(6)} ETH)`
);
```

## Rate Limiting

Rate limiting works on two levels:

1. **Request-level**: Protects MCP server from abuse
2. **Transaction-level**: Prevents AI from draining funds

Configure limits in `.env`:

```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_TRANSACTIONS_PER_HOUR=10
MAX_TRANSACTIONS_PER_DAY=1000
```

## Best Practices

1. **Estimate Gas First**: Always call `estimate_gas` before `execute_transaction`
2. **Check Limits**: Use `get_rate_limit_status` before operations
3. **Monitor Confirmations**: Wait for `status: "confirmed"` before proceeding
4. **Use Pending Queue**: For large transfers, use `prepare_transaction` → `authorize_transaction` flow
5. **Handle Errors**: Check error codes and implement retry logic appropriately
