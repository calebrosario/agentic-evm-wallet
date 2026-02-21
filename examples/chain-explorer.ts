import { getChain, getAllSupportedChainIds } from "../src/index.js";

async function main() {
  console.log("=== Agentic EVM Wallet - Chain Explorer ===\n");

  try {
    console.log("Fetching all supported chains...");
    const chains = getAllSupportedChainIds();

    console.log(`Found ${chains.length} supported chains:\n`);

    for (const chainId of chains) {
      const chain = getChain(chainId);
      console.log(`Chain ID: ${chain.id}`);
      console.log(`  Name: ${chain.name}`);
      console.log(
        `  Native Currency: ${chain.nativeCurrency.symbol} (${chain.nativeCurrency.name})`
      );
      console.log(`  RPC: ${chain.rpcUrls.default.http[0]}`);
      console.log(`  Block Explorer: ${chain.blockExplorers?.default?.url}\n`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("Example completed!");
}

main();
