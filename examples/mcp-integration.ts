import { WalletManager, TransactionExecutor, KeyManager, getChain } from "../src/index.js";
import { parseEther } from "viem";

async function main() {
  console.log("=== Agentic EVM Wallet - MCP Integration Example ===\n");

  const walletManager = new WalletManager();
  const keyManager = new KeyManager();
  const executor = new TransactionExecutor({ keyManager });

  try {
    console.log("Creating wallet on Polygon (chain ID 137)...");
    const wallet = await walletManager.createWallet(137);
    console.log("Wallet created:");
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Chain ID: ${wallet.chainId}\n`);

    console.log("Checking balance...");
    const balance = await walletManager.getBalance(137);
    console.log(`  Balance: ${Number(balance) / 1e18} POL\n`);

    console.log("Transaction approval workflow:\n");

    console.log("Step 1: Prepare transaction for approval");
    console.log("  This would generate a transaction and approval token");
    console.log("  The agent must request user approval before execution\n");

    console.log("\nStep 2: User approves transaction");
    console.log("  User provides approval token to authorize execution");
    console.log("  This prevents unauthorized transactions\n");

    console.log("\nStep 3: Execute approved transaction");
    console.log("  Transaction executes only with valid approval token");
    console.log("  Rate limits apply: 10 transactions/hour, 1000 transactions/day\n");

    const chainInfo = getChain(137);
    console.log(`\nChain: ${chainInfo.name} (${chainInfo.nativeCurrency.symbol})`);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("\nExample completed!");
}

main();
