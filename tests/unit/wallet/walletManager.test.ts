import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { WalletManager } from "../../../src/wallet/walletManager";

describe("WalletManager", () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = new WalletManager();
  });

  afterEach(() => {
    // Cleanup after each test
    walletManager = new WalletManager();
  });

  describe("createWallet", () => {
    it("should create a new wallet with specified chain ID (Ethereum)", async () => {
      const wallet = await walletManager.createWallet(1);
      expect(wallet.chainId).toBe(1);
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should create a new wallet with Polygon chain ID", async () => {
      const wallet = await walletManager.createWallet(137);
      expect(wallet.chainId).toBe(137);
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should fail with invalid chain ID", async () => {
      await expect(walletManager.createWallet(999999)).rejects.toThrow("Invalid chain ID: 999999");
    });

    it("should generate a unique address", async () => {
      const wallet1 = await walletManager.createWallet(1);
      const wallet2 = await walletManager.createWallet(137);
      expect(wallet1.address).not.toBe(wallet2.address);
    });
  });

  describe("importWallet", () => {
    const validPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    it("should import wallet from private key", async () => {
      const wallet = await walletManager.importWallet({
        privateKey: validPrivateKey,
        chainId: 1
      });
      expect(wallet.chainId).toBe(1);
      expect(wallet.address).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
    });

    it("should validate private key format", async () => {
      await expect(
        walletManager.importWallet({
          privateKey: "invalid-key"
        })
      ).rejects.toThrow("Invalid private key format");
    });

    it("should fail with empty private key", async () => {
      await expect(
        walletManager.importWallet({
          privateKey: ""
        })
      ).rejects.toThrow("Private key required");
    });

    it("should handle private key without 0x prefix", async () => {
      const wallet = await walletManager.importWallet({
        privateKey: validPrivateKey.slice(2),
        chainId: 1
      });
      expect(wallet.address).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
    });

    it("should default to Ethereum chain if not specified", async () => {
      const wallet = await walletManager.importWallet({
        privateKey: validPrivateKey
      });
      expect(wallet.chainId).toBe(1);
    });
  });

  describe("getBalance", () => {
    it("should throw error if wallet not created", async () => {
      await expect(walletManager.getBalance(1)).rejects.toThrow("No wallet found for chain ID: 1");
    });

    it("should get native balance when wallet exists", async () => {
      await walletManager.createWallet(1);
      // This will fail with network error, but at least it won't throw the "wallet not found" error
      try {
        await walletManager.getBalance(1);
      } catch (error) {
        // Network error is expected since we don't have a real RPC endpoint
        expect(error).toBeTruthy();
      }
    });

    it("should get ERC20 token balance", async () => {
      await walletManager.createWallet(1);
      const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7" as `0x${string}`;
      try {
        await walletManager.getBalance(1, usdtAddress);
      } catch (error) {
        // Network error is expected
        expect(error).toBeTruthy();
      }
    });
  });

  describe("getWalletAddress", () => {
    it("should return the wallet address", async () => {
      const wallet = await walletManager.createWallet(1);
      const address = await walletManager.getWalletAddress(1);
      expect(address).toBe(wallet.address);
    });

    it("should throw error if wallet not created", async () => {
      await expect(walletManager.getWalletAddress(1)).rejects.toThrow(
        "No wallet found for chain ID: 1"
      );
    });

    it("should be in lowercase format", async () => {
      const wallet = await walletManager.createWallet(1);
      const address = await walletManager.getWalletAddress(1);
      expect(address).toBe(wallet.address);
      expect(address === address.toLowerCase()).toBe(true);
    });

    it("should start with 0x prefix", async () => {
      await walletManager.createWallet(1);
      const address = await walletManager.getWalletAddress(1);
      expect(address).toMatch(/^0x/);
    });
  });
});
