# Testnet Faucet Automation

Automated script to claim test tokens from various testnet faucets for keeping test wallets funded.

## Purpose

This script automatically requests test tokens from public faucets to ensure test wallets always have sufficient balance for running tests. Designed to run as a cron job or CI/CD task.

## Supported Testnets

| Testnet          | Chain ID | Faucet Provider    | Native Token |
| ---------------- | -------- | ------------------ | ------------ |
| Sepolia          | 11155111 | Sepolia Dev Faucet | ETH          |
| Polygon Amoy     | 80002    | Alchemy Faucet     | MATIC        |
| Arbitrum Sepolia | 421614   | Alchemy Faucet     | ETH          |
| Optimism Sepolia | 11155420 | Alchemy Faucet     | ETH          |
| Base Sepolia     | 84532    | Alchemy Faucet     | ETH          |

## Usage

### Fund All Configured Wallets

```bash
bun run faucet
```

### Fund Specific Chain

```bash
bun run faucet --chain 11155111  # Sepolia only
bun run faucet --chain 80002      # Polygon Amoy only
```

### Fund Specific Wallet

```bash
bun run faucet --wallet 0x1234...5678
```

## Environment Variables

Configure via `.env` file:

```bash
# Test wallet addresses (JSON array)
TEST_WALLET_ADDRESSES=["0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "0x4567..."]

# Minimum balance threshold before requesting faucet
FAUCET_MIN_BALANCE=0.01  # 0.01 ETH

# Amount to request from faucet
FAUCET_AMOUNT=0.1  # 0.1 ETH
```

## Setting Up Cron Job

### Linux/Mac (crontab)

```bash
# Edit crontab
crontab -e

# Add entry to run faucet every 6 hours
0 */6 * * * * cd /path/to/agentic-envm-wallet && bun run faucet >> logs/faucet.log 2>&1
```

### Using cron helper script

```bash
# Create cron entry that runs every 6 hours
(crontab -l 2>/dev/null; echo "0 */6 * * * * cd $(pwd) && bun run faucet >> logs/faucet.log 2>&1") | crontab -
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Fund Test Wallets

on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours
  workflow_dispatch: # Manual trigger

jobs:
  fund-wallets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - name: Fund test wallets
        run: bun run faucet
        env:
          TEST_WALLET_ADDRESSES: ${{ secrets.TEST_WALLET_ADDRESSES }}
```

## Monitoring

The script provides detailed console output:

- ✅ Wallet already has sufficient balance (no faucet needed)
- ⚠️ Balance below minimum, requesting tokens
- 🚰 Requesting tokens from specific faucet
- ✅ Successful faucet request
- ❌ Failed faucet request with reason

Log output is saved when run via cron for debugging.

## Notes

- **Rate Limits**: Most faucets have rate limits (e.g., 1 request per address per day)
- **Confirmation Time**: Wait 5 seconds after faucet request before checking balance
- **Multiple Faucets**: Script tries multiple faucets in sequence if first fails
- **Manual Faucets**: Some faucets require manual browser interaction (noted in output)

## Troubleshooting

### Faucet Unavailable

If faucet returns `unavailable` status:

1. Check if faucet website is accessible
2. Try manually visiting faucet URL from script output
3. Wait and retry later (faucets sometimes have maintenance periods)

### Balance Not Updated

If tokens don't appear after successful faucet request:

1. Wait 1-2 minutes for transaction confirmation
2. Check transaction hash on block explorer
3. Verify correct testnet/chain

### Rate Limit Hit

If faucet rejects request due to rate limits:

- Wait 24 hours before retrying
- Use different test wallet address
- Some faucets allow retry after cooldown period
