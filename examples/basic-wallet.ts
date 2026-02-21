import { WalletManager, TransactionExecutor, getChain, KeyManager } from "../src/index.js";
import { formatUnits } from "viem";

async function main() {
  console.log("=== Agentic EVM Wallet - Basic Example ===\n");

  const walletManager = new WalletManager();
  const keyManager = new KeyManager();
  const executor = new TransactionExecutor({ keyManager });

  try {
    console.log("Creating wallet on Ethereum...");
    const wallet = await walletManager.createWallet(1);
    console.log("Wallet created:");
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Chain ID: ${wallet.chainId}`);
    console.log(`  Private Key: ${wallet.privateKey.slice(0, 10)}... (truncated)\n`);

    console.log("Chain Information:");
    const chainInfo = getChain(1);
    console.log(`  Name: ${chainInfo.name}`);
    console.log(`  Native Currency: ${chainInfo.nativeCurrency.symbol}\n`);

    console.log("Checking balance...");
    const balance = await walletManager.getBalance(wallet.chainId);
    const formattedBalance = formatUnits(balance, 18);
    console.log(`  Balance: ${formattedBalance} ETH\n`);

    console.log("Preparing transaction (not executed without funds)...");
    console.log("  To: 0x0000000000000000000000000000000000000000000");
    console.log(`  Amount: 0.01 ETH\n`);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("\nExample completed successfully!");
}

main();
