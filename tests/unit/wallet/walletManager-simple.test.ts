import { test, expect } from "bun:test";

import { WalletManager } from "../../../src/wallet/walletManager";

const walletManager = new WalletManager();

test("WalletManager creates wallet correctly", async () => {
  const wallet = await walletManager.createWallet(1);

  expect(wallet).toBeDefined();
  expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  expect(wallet.chainId).toBe(1);
});

test("WalletManager imports wallet correctly", async () => {
  const privateKey = "0x" + "a".repeat(64);
  const wallet = await walletManager.importWallet({ privateKey, chainId: 1 });

  expect(wallet).toBeDefined();
  expect(wallet.chainId).toBe(1);
});

test("WalletManager gets balance correctly", async () => {
  const wallet = await walletManager.createWallet(1);
  const balance = await walletManager.getBalance(1);

  expect(balance).toBeGreaterThanOrEqual(0n);
});
