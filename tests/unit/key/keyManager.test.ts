import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KeyManager } from "../../../src/key/keyManager";

describe("KeyManager", () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  afterEach(() => {
    keyManager = undefined as any;
  });

  describe("generateKey", () => {
    it("should generate a new key for Ethereum", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      expect(keyEntry).toBeDefined();
      expect(keyEntry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(keyEntry.privateKey).toBeDefined();
      expect(keyEntry.chainId).toBe(1);
      expect(keyEntry.createdAt).toBeInstanceOf(Date);
    });

    it("should generate a new key for Polygon", () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });

      expect(keyEntry).toBeDefined();
      expect(keyEntry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(keyEntry.chainId).toBe(137);
    });

    it("should store generated key in keystore", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const retrieved = keyManager.getKey(keyEntry.address, 1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.address).toBe(keyEntry.address);
    });
  });

  describe("importKey", () => {
    it("should import a valid private key", () => {
      const privateKey = ("0x" + "a".repeat(64)) as any;

      const keyEntry = keyManager.importKey({
        privateKey,
        chainId: 1
      });

      expect(keyEntry).toBeDefined();
      expect(keyEntry.privateKey).toBe(privateKey);
    });

    it("should throw error for invalid private key", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "invalid" as any,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should throw error for empty private key", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "" as any,
          chainId: 1
        });
      }).toThrow("Private key cannot be empty");
    });
  });

  describe("exportKey", () => {
    it("should export an existing key", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const exported = keyManager.exportKey({
        address: keyEntry.address,
        chainId: 1
      });

      expect(exported).toBe(keyEntry.privateKey);
    });

    it("should throw error for non-existent key", () => {
      expect(() => {
        keyManager.exportKey({
          address: ("0x" + "a".repeat(40)) as any,
          chainId: 1
        });
      }).toThrow("Key not found");
    });
  });

  describe("signTransaction", () => {
    it.skip("should sign a transaction - requires test account", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      const transaction = {
        to: ("0x" + "a".repeat(40)) as `0x${string}`,
        value: 1000000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      } as any;

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signed.hash).toBeDefined();
    });
  });

  describe("getKey", () => {
    it("should retrieve an existing key", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const retrieved = keyManager.getKey(keyEntry.address, 1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.address).toBe(keyEntry.address);
    });

    it("should return undefined for non-existent key", () => {
      const retrieved = keyManager.getKey(("0x" + "a".repeat(40)) as any, 1);

      expect(retrieved).toBeUndefined();
    });
  });

  describe("listKeys", () => {
    it("should list all keys", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const keys = keyManager.listKeys();

      expect(keys).toHaveLength(2);
    });

    it("should filter keys by chain ID", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });
      keyManager.generateKey({ chainId: 137 });

      const ethereumKeys = keyManager.listKeys(1);
      const polygonKeys = keyManager.listKeys(137);

      expect(ethereumKeys).toHaveLength(1);
      expect(polygonKeys).toHaveLength(2);
    });
  });

  describe("deleteKey", () => {
    it("should delete an existing key", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const deleted = keyManager.deleteKey(keyEntry.address, 1);

      expect(deleted).toBe(true);
      expect(keyManager.getKey(keyEntry.address, 1)).toBeUndefined();
    });

    it("should return false for non-existent key", () => {
      const deleted = keyManager.deleteKey(("0x" + "a".repeat(40)) as any, 1);

      expect(deleted).toBe(false);
    });
  });
});
