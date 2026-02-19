#!/usr/bin/env bun
/**
/**

 * Automated Testnet Faucet Script
 *
 * Automatically claims test tokens from various testnet faucets for testing.
 * Designed to run as a cron job to keep test wallets funded.
 *
 * Usage:
 *   bun run scripts/faucet.ts                    # Fund all configured wallets
 *   bun run scripts/faucet.ts --chain 1         # Fund Ethereum testnet only
 *   bun run scripts/faucet.ts --wallet 0x...     # Fund specific wallet
 *
 * Environment Variables:
 *   TEST_WALLET_ADDRESSES - JSON array of test wallet addresses
 *   FAUCET_MIN_BALANCE - Minimum balance in ETH before faucet (default: 0.01)
 *   FAUCET_AMOUNT - Amount to request in ETH (default: 0.1)
 *
 * Example .env:
 *   TEST_WALLET_ADDRESSES=["0x123...", "0x456..."]
 *   FAUCET_MIN_BALANCE=0.01
 *   FAUCET_AMOUNT=0.1
 */

import { http, createPublicClient, formatUnits, parseUnits } from "viem";
import { mainnet, sepolia } from "viem/chains";

interface FaucetConfig {
  name: string;
  chainId: number;
  chain: any;
  faucetUrl: string;
  minBalance: string;
  amount: string;
}

interface WalletInfo {
  address: `0x${string}`;
  balance: bigint;
}

const FAUCETS: FaucetConfig[] = [
  {
    name: "Sepolia",
    chainId: 11155111,
    chain: sepolia,
    faucetUrl: "https://faucet.sepolia.dev",
    minBalance: "0.01",
    amount: "0.1"
  },
  {
    name: "Amoy (Polygon Testnet)",
    chainId: 80002,
    chain: {
      id: 80002,
      name: "Polygon Amoy",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://rpc-amoy.polygon.technology"] }
      },
      blockExplorers: {
        default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" }
      }
    },
    faucetUrl: "https://faucet.polygon.technology",
    minBalance: "0.1",
    amount: "1.0"
  },
  {
    name: "Sepolia Arb",
    chainId: 421614,
    chain: {
      id: 421614,
      name: "Arbitrum Sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] }
      },
      blockExplorers: {
        default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" }
      }
    },
    faucetUrl: "https://faucet.quicknode.com/arbitrum/sepolia",
    minBalance: "0.01",
    amount: "0.1"
  },
  {
    name: "Sepolia OP",
    chainId: 11155420,
    chain: {
      id: 11155420,
      name: "Optimism Sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://sepolia.optimism.io"] }
      },
      blockExplorers: {
        default: { name: "Optimism Sepolia Explorer", url: "https://sepolia-optimism.etherscan.io" }
      }
    },
    faucetUrl: "https://sepoliafaucet.com",
    minBalance: "0.01",
    amount: "0.1"
  },
  {
    name: "Base Sepolia",
    chainId: 84532,
    chain: {
      id: 84532,
      name: "Base Sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://sepolia.base.org"] }
      },
      blockExplorers: {
        default: { name: "BaseScan Sepolia", url: "https://sepolia.basescan.org" }
      }
    },
    faucetUrl: "https://www.coinbase.com/faucets/base-sepolia-faucet",
    minBalance: "0.01",
    amount: "0.1"
  }
];

async function getBalance(address: `0x${string}`, chain: any): Promise<bigint> {
  const client = createPublicClient({
    chain,
    transport: http()
  });

  return await client.getBalance({ address });
}

async function checkFaucetAvailable(faucetUrl: string): Promise<boolean> {
  try {
    const response = await fetch(faucetUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function requestFromSepoliaFaucet(address: `0x${string}`): Promise<boolean> {
  try {
    const response = await fetch("https://faucet.sepolia.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error(`  ❌ Sepolia faucet failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`  ✅ Sepolia faucet: ${data.message || "Success"}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Sepolia faucet error: ${(error as Error).message}`);
    return false;
  }
}

async function requestFromAlchemyFaucet(address: `0x${string}`, chainId: number): Promise<boolean> {
  try {
    // Alchemy faucet supports multiple testnets
    const response = await fetch(
      `https://faucet.alchemyapi.org/v2/drip?address=${address}&chainId=${chainId}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      console.error(`  ❌ Alchemy faucet failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`  ✅ Alchemy faucet: ${data.message || "Success"}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Alchemy faucet error: ${(error as Error).message}`);
    return false;
  }
}

async function requestTokens(address: `0x${string}`, faucet: FaucetConfig): Promise<boolean> {
  console.log(`\n🚰 Requesting tokens from ${faucet.name} for ${address}`);
  console.log(`   Faucet URL: ${faucet.faucetUrl}`);

  const isAvailable = await checkFaucetAvailable(faucet.faucetUrl);
  if (!isAvailable) {
    console.log(`  ⚠️  Faucet appears unavailable, skipping`);
    return false;
  }

  if (faucet.chainId === 11155111) {
    return await requestFromSepoliaFaucet(address);
  } else if ([80002, 421614, 11155420, 84532].includes(faucet.chainId)) {
    return await requestFromAlchemyFaucet(address, faucet.chainId);
  } else {
    console.log(`  ⚠️  No automated faucet available for ${faucet.name}`);
    console.log(`   Please visit: ${faucet.faucetUrl}`);
    return false;
  }
}

async function checkAndFundWallet(wallet: WalletInfo, faucets: FaucetConfig[]): Promise<void> {
  console.log(`\n📋 Checking wallet: ${wallet.address}`);
  console.log(`   Current balance: ${formatUnits(wallet.balance, 18)} ETH`);

  const minBalance = parseUnits(process.env.FAUCET_MIN_BALANCE || "0.01", 18);

  if (wallet.balance >= minBalance) {
    console.log(`   ✅ Sufficient balance, no faucet needed`);
    return;
  }

  console.log(`   ⚠️  Balance below minimum, requesting tokens...`);

  for (const faucet of faucets) {
    try {
      const success = await requestTokens(wallet.address, faucet);

      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const newBalance = await getBalance(wallet.address, faucet.chain);
        console.log(
          `   New balance on ${faucet.name}: ${formatUnits(newBalance, 18)} ${faucet.chain.nativeCurrency.symbol}`
        );

        if (newBalance > wallet.balance) {
          break;
        }
      }
    } catch (error) {
      console.error(`   Error requesting from ${faucet.name}: ${(error as Error).message}`);
    }
  }
}

async function loadWalletAddresses(): Promise<`0x${string}`[]> {
  const envWallets = process.env.TEST_WALLET_ADDRESSES;
  if (envWallets) {
    try {
      const wallets = JSON.parse(envWallets);
      if (Array.isArray(wallets)) {
        return wallets;
      }
    } catch {
      console.error("Invalid TEST_WALLET_ADDRESSES format, using default");
    }
  }

  return ["0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A" as `0x${string}`];
}

async function main(): Promise<void> {
  console.log("🚰 Testnet Faucet Automation");
  console.log("================================\n");

  const args = process.argv.slice(2);
  const chainFilter = args.find((arg) => arg.startsWith("--chain"))?.split("=")[1];
  const walletFilter = args.find((arg) => arg.startsWith("--wallet"))?.split("=")[1];

  const walletAddresses = await loadWalletAddresses();

  const filteredWallets = walletFilter
    ? (walletAddresses.filter(
        (addr) => addr.toLowerCase() === walletFilter.toLowerCase()
      ) as `0x${string}`[])
    : walletAddresses;

  if (filteredWallets.length === 0) {
    console.error("❌ No wallets found");
    process.exit(1);
  }

  console.log(`Found ${filteredWallets.length} wallet(s) to check\n`);

  const filteredFaucets = chainFilter
    ? FAUCETS.filter((f) => f.chainId === parseInt(chainFilter))
    : FAUCETS;

  if (filteredFaucets.length === 0) {
    console.error(`❌ No faucets found for chain: ${chainFilter}`);
    console.log(
      `   Available chains: ${FAUCETS.map((f) => `${f.name} (${f.chainId})`).join(", ")}`
    );
    process.exit(1);
  }

  console.log(`Checking ${filteredFaucets.length} faucet(s)\n`);

  for (const address of filteredWallets) {
    try {
      const initialBalance = await getBalance(address, filteredFaucets[0].chain);
      const walletInfo: WalletInfo = {
        address,
        balance: initialBalance
      };

      await checkAndFundWallet(walletInfo, filteredFaucets);
    } catch (error) {
      console.error(`❌ Error processing wallet ${address}: ${(error as Error).message}`);
    }
  }

  console.log("\n✅ Faucet automation complete");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
