import { WalletManager, KeyManager, TransactionExecutor, getChain } from "../src/index.js";
import { parseUnits } from "viem";

async function main() {
  console.log("=== Agentic EVM Wallet - Multi-Chain Transfer ===\n");

  const walletManager = new WalletManager();
  const keyManager = new KeyManager();
  const executor = new TransactionExecutor({ keyManager });

  try {
    console.log("Creating wallets on Ethereum and Polygon...");
    const ethWallet = await walletManager.createWallet(1);
    const polygonWallet = await walletManager.createWallet(137);
    console.log("Created wallets:");
    console.log(`  Ethereum: ${ethWallet.address}`);
    console.log(`  Polygon: ${polygonWallet.address}\n`);

    console.log("Checking balances...");
    const ethBalance = await walletManager.getBalance(1);
    const polygonBalance = await walletManager.getBalance(137);
    console.log("Balances:");
    console.log(`  Ethereum: ${Number(ethBalance) / 1e18} ETH`);
    console.log(`  Polygon: ${Number(polygonBalance) / 1e18} POL\n`);

    console.log("Preparing transfer from Ethereum to Polygon (cross-chain)...");
    console.log("  From: Ethereum (chain 1)");
    console.log("  To: Polygon (chain 137)");
    console.log("  Amount: 0.001 ETH\n");

    console.log("Note: Cross-chain transfers require bridging protocol.");
    console.log(
      "This example prepares the transfer - actual execution requires bridge contract.\n"
    );
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("Example completed!");
}

main();
