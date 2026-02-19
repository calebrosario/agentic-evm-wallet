import { describe, test, expect, beforeEach } from "bun:test";
import { KeyManager } from "@/key/keyManager";
import type { Address, Hex } from "viem";

describe("KeyManager", () => {
  let keyManager: KeyManager;

  // Valid 32-byte private key for testing (DO NOT USE IN PRODUCTION)
  const testPrivateKey: Hex = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  describe("generateKey", () => {
    test("should generate a key for Ethereum (1)", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      expect(entry.chainId).toBe(1);
      expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(entry.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    test("should generate a key for Polygon (137)", () => {
      const entry = keyManager.generateKey({ chainId: 137 });

      expect(entry.chainId).toBe(137);
      expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    test("should generate different keys on multiple calls", () => {
      const entry1 = keyManager.generateKey({ chainId: 1 });
      const entry2 = keyManager.generateKey({ chainId: 1 });

      expect(entry1.privateKey).not.toBe(entry2.privateKey);
      expect(entry1.address).not.toBe(entry2.address);
    });

    test("should throw for invalid chain ID", () => {
      expect(() => keyManager.generateKey({ chainId: 999999 })).toThrow(/invalid chain id/i);
    });

    test("should store generated key in keystore", () => {
      const entry = keyManager.generateKey({ chainId: 1 });
      const retrieved = keyManager.getKey(entry.address, 1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.privateKey).toBe(entry.privateKey);
    });

    test("should generate keys for all supported chains", () => {
      const supportedChains = [1, 56, 137, 42161, 10, 43114, 8453, 324, 250, 100];

      supportedChains.forEach((chainId) => {
        const entry = keyManager.generateKey({ chainId });
        expect(entry.chainId).toBe(chainId);
      });
    });
  });

  describe("importKey", () => {
    test("should import a valid private key for Ethereum", () => {
      const entry = keyManager.importKey({
        privateKey: testPrivateKey,
        chainId: 1
      });

      expect(entry.chainId).toBe(1);
      expect(entry.privateKey).toBe(testPrivateKey);
      // Known address derived from testPrivateKey
      expect(entry.address).toBe("0xFCAd0B19bB29D4674531d6f115237E16AfCE377c" as Address);
    });

    test("should throw for empty private key", () => {
      expect(() => keyManager.importKey({ privateKey: "" as Hex, chainId: 1 })).toThrow(
        /private key/i
      );
    });

    test("should throw for malformed private key", () => {
      expect(() => keyManager.importKey({ privateKey: "0xinvalid" as Hex, chainId: 1 })).toThrow(
        /invalid private key/i
      );
    });

    test("should throw for private key with wrong length", () => {
      // Too short
      expect(() =>
        keyManager.importKey({
          privateKey: "0x0123456789abcdef" as Hex,
          chainId: 1
        })
      ).toThrow(/invalid private key/i);

      // Too long
      expect(() =>
        keyManager.importKey({
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as Hex,
          chainId: 1
        })
      ).toThrow(/invalid private key/i);
    });

    test("should overwrite existing key for same address and chain", () => {
      const entry1 = keyManager.importKey({
        privateKey: testPrivateKey,
        chainId: 1
      });

      // Import same key again - should overwrite
      const entry2 = keyManager.importKey({
        privateKey: testPrivateKey,
        chainId: 1
      });

      expect(entry1.address).toBe(entry2.address);
      expect(keyManager.listKeys(1).length).toBe(1);
    });
  });

  describe("exportKey", () => {
    test("should export an imported key", () => {
      keyManager.importKey({ privateKey: testPrivateKey, chainId: 1 });
      const address = "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c" as Address;

      const exported = keyManager.exportKey({ address, chainId: 1 });

      expect(exported).toBe(testPrivateKey);
    });

    test("should export a generated key", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      const exported = keyManager.exportKey({
        address: entry.address,
        chainId: 1
      });

      expect(exported).toBe(entry.privateKey);
    });

    test("should throw for non-existent key", () => {
      const randomAddress = "0x0000000000000000000000000000000000000000" as Address;

      expect(() => keyManager.exportKey({ address: randomAddress, chainId: 1 })).toThrow(
        /key not found/i
      );
    });

    test("should not find key on different chain", () => {
      keyManager.importKey({ privateKey: testPrivateKey, chainId: 1 });
      const address = "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c" as Address;

      // Key exists on chain 1, but not on chain 137
      expect(() => keyManager.exportKey({ address, chainId: 137 })).toThrow(/key not found/i);
    });
  });

  describe("getKey", () => {
    test("should return undefined for non-existent key", () => {
      const randomAddress = "0x0000000000000000000000000000000000000000" as Address;

      const result = keyManager.getKey(randomAddress, 1);

      expect(result).toBeUndefined();
    });

    test("should retrieve stored key", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      const retrieved = keyManager.getKey(entry.address, 1);

      expect(retrieved).toEqual(entry);
    });

    test("should not retrieve key from different chain", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      const result = keyManager.getKey(entry.address, 137);

      expect(result).toBeUndefined();
    });
  });

  describe("listKeys", () => {
    test("should return empty array when no keys", () => {
      const keys = keyManager.listKeys();

      expect(keys).toEqual([]);
    });

    test("should list all keys across chains", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const keys = keyManager.listKeys();

      expect(keys.length).toBe(2);
    });

    test("should list keys for specific chain only", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });
      keyManager.generateKey({ chainId: 1 });

      const keys = keyManager.listKeys(1);

      expect(keys.length).toBe(2);
      keys.forEach((k) => expect(k.chainId).toBe(1));
    });

    test("should return empty array for chain with no keys", () => {
      const keys = keyManager.listKeys(999);

      expect(keys).toEqual([]);
    });
  });

  describe("deleteKey", () => {
    test("should delete an existing key", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      const result = keyManager.deleteKey(entry.address, 1);

      expect(result).toBe(true);
      expect(keyManager.getKey(entry.address, 1)).toBeUndefined();
    });

    test("should return false for non-existent key", () => {
      const randomAddress = "0x0000000000000000000000000000000000000000" as Address;

      const result = keyManager.deleteKey(randomAddress, 1);

      expect(result).toBe(false);
    });

    test("should not delete key on different chain", () => {
      const entry = keyManager.generateKey({ chainId: 1 });

      // Try to delete from wrong chain
      const result = keyManager.deleteKey(entry.address, 137);

      expect(result).toBe(false);
      expect(keyManager.getKey(entry.address, 1)).toBeDefined();
    });
  });

  describe("signTransaction", () => {
    test("should throw for invalid private key", async () => {
      await expect(
        keyManager.signTransaction({
          privateKey: "0xinvalid" as Hex,
          chainId: 1,
          transaction: {} as any
        })
      ).rejects.toThrow(/invalid private key/i);
    });

    test("should throw for invalid chain ID", async () => {
      await expect(
        keyManager.signTransaction({
          privateKey: testPrivateKey,
          chainId: 999999,
          transaction: {} as any
        })
      ).rejects.toThrow(/invalid chain id/i);
    });

    // Note: Full signing tests would require mocking viem's wallet client
    // or using a known private key with a known transaction to verify signature
  });

  describe("Key ID format", () => {
    test("should use chainId:address format for key storage", () => {
      const entry = keyManager.generateKey({ chainId: 137 });
      const retrieved = keyManager.getKey(entry.address, 137);

      // Verify the key is stored correctly
      expect(retrieved).toBeDefined();
      expect(retrieved?.chainId).toBe(137);
      expect(retrieved?.address).toBe(entry.address);
    });
  });

  describe("Key isolation between chains", () => {
    test("should store separate entries for same private key on different chains", () => {
      const entry1 = keyManager.importKey({
        privateKey: testPrivateKey,
        chainId: 1
      });
      const entry2 = keyManager.importKey({
        privateKey: testPrivateKey,
        chainId: 137
      });

      // Both should exist independently
      const keys = keyManager.listKeys();
      expect(keys.length).toBe(2);

      // Deleting one should not affect the other
      keyManager.deleteKey(entry1.address, 1);
      expect(keyManager.getKey(entry2.address, 137)).toBeDefined();
    });
  });
});
