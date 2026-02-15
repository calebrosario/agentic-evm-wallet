import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { KeyManager } from "../../src/key/keyManager";
import type { Hex, Address } from "viem";

describe("KeyManager Integration Tests - Key Management", () => {
  let keyManager: KeyManager;
  let testPrivateKey: Hex;
  let testAddress: `0x${string}`;

  beforeAll(() => {
    keyManager = new KeyManager();
    const keyEntry = keyManager.generateKey({ chainId: 1 });
    testPrivateKey = keyEntry.privateKey as Hex;
    testAddress = keyEntry.address;
  });

  afterAll(() => {
    keyManager = undefined as any;
  });

  describe("generateKey", () => {
    it("should generate key with valid address format", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      expect(keyEntry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(keyEntry.privateKey).toBeDefined();
      expect(keyEntry.privateKey.length).toBeGreaterThan(0);
      expect(keyEntry.chainId).toBe(1);
      expect(keyEntry.createdAt).toBeInstanceOf(Date);
    });

    it("should generate key for different chains", () => {
      const ethKey = keyManager.generateKey({ chainId: 1 });
      const polygonKey = keyManager.generateKey({ chainId: 137 });

      expect(ethKey.chainId).toBe(1);
      expect(polygonKey.chainId).toBe(137);
      expect(ethKey.address).not.toBe(polygonKey.address);
    });

    it("should store generated key for retrieval", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const retrieved = keyManager.getKey(keyEntry.address, 1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.address).toBe(keyEntry.address);
      expect(retrieved?.privateKey).toBe(keyEntry.privateKey);
    });
  });

  describe("importKey", () => {
    it("should import valid private key", () => {
      const privateKey = ("0x" + "a".repeat(64)) as Hex;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });

      expect(keyEntry).toBeDefined();
      expect(keyEntry.privateKey).toBe(privateKey);
    });

    it("should throw error for invalid key format", () => {
      expect(() => {
        keyManager.importKey({ privateKey: "invalid" as Hex, chainId: 1 });
      }).toThrow("Invalid private key");
    });

    it("should throw error for empty key", () => {
      expect(() => {
        keyManager.importKey({ privateKey: "" as Hex, chainId: 1 });
      }).toThrow("Private key cannot be empty");
    });

    it("should store imported key", () => {
      const privateKey = ("0x" + "b".repeat(64)) as Hex;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const retrieved = keyManager.getKey(keyEntry.address, 1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.privateKey).toBe(privateKey);
    });

    it("should import key for Polygon", () => {
      const privateKey = ("0x" + "c".repeat(64)) as Hex;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 137 });

      expect(keyEntry).toBeDefined();
      expect(keyEntry.chainId).toBe(137);
    });
  });

  describe("exportKey", () => {
    it("should export existing key", () => {
      const exported = keyManager.exportKey({
        address: testAddress,
        chainId: 1
      });

      expect(exported).toBe(testPrivateKey);
    });

    it("should throw error for non-existent key", () => {
      const nonExistentAddress = ("0x" + "d".repeat(40)) as Address;

      expect(() => {
        keyManager.exportKey({ address: nonExistentAddress, chainId: 1 });
      }).toThrow("Key not found");
    });

    it("should export key from Polygon", () => {
      const polygonKeyEntry = keyManager.generateKey({ chainId: 137 });
      const exported = keyManager.exportKey({
        address: polygonKeyEntry.address,
        chainId: 137
      });

      expect(exported).toBe(polygonKeyEntry.privateKey);
    });
  });

  describe("listKeys", () => {
    it("should list all keys across chains", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const keys = keyManager.listKeys();

      expect(keys.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter keys by chain ID", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const ethereumKeys = keyManager.listKeys(1);
      const polygonKeys = keyManager.listKeys(137);

      expect(ethereumKeys.length).toBeGreaterThanOrEqual(1);
      expect(polygonKeys.length).toBeGreaterThanOrEqual(1);
    });

    it("should list only Ethereum keys", () => {
      keyManager.generateKey({ chainId: 137 });

      const ethKeys = keyManager.listKeys(1);
      const allKeys = keyManager.listKeys();

      expect(ethKeys.length).toBeLessThan(allKeys.length);
    });
  });

  describe("deleteKey", () => {
    it("should delete existing key", () => {
      keyManager.generateKey({ chainId: 1 });
      const keyEntry = keyManager.getKey(testAddress, 1);

      const deleted = keyManager.deleteKey(testAddress, 1);

      expect(deleted).toBe(true);
      expect(keyManager.getKey(testAddress, 1)).toBeUndefined();
    });

    it("should return false for non-existent key", () => {
      const nonExistentAddress = ("0x" + "f".repeat(40)) as Address;

      const deleted = keyManager.deleteKey(nonExistentAddress, 1);

      expect(deleted).toBe(false);
    });
  });

  describe("Multi-Chain Key Management", () => {
    it("should manage keys across multiple chains", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const ethKeys = keyManager.listKeys(1);
      const polygonKeys = keyManager.listKeys(137);

      expect(ethKeys.length).toBeGreaterThan(0);
      expect(polygonKeys.length).toBeGreaterThan(0);

      const ethAddress = ethKeys[0].address;
      const polygonAddress = polygonKeys[0].address;

      expect(ethAddress).not.toBe(polygonAddress);
    });

    it("should support same address on different chains", () => {
      const privateKey = ("0x" + "a".repeat(64)) as Hex;

      const ethKey = keyManager.importKey({ privateKey, chainId: 1 });
      const polygonKey = keyManager.importKey({ privateKey, chainId: 137 });

      expect(ethKey.address).toBe(polygonKey.address);
      expect(ethKey.privateKey).toBe(polygonKey.privateKey);
    });
  });

  describe("Performance", () => {
    it("should generate keys quickly", () => {
      const startTime = Date.now();

      keyManager.generateKey({ chainId: 1 });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it("should handle many keys efficiently", () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
