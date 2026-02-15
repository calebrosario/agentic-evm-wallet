import { describe, it, expect, beforeEach } from "bun:test";
import { KeyManager } from "../../src/key/keyManager";
import type { Hex } from "viem";

describe("KeyManager Security Tests", () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  describe("Crytographically Secure Random Generation", () => {
    it("should generate keys with sufficient entropy", () => {
      const keys = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const keyEntry = keyManager.generateKey({ chainId: 1 });
        keys.add(keyEntry.privateKey);
      }

      // All 100 keys should be unique (extremely low probability of collision)
      expect(keys.size).toBe(iterations);
    });

    it("should generate different addresses for different keys", () => {
      const addresses = new Set<string>();
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const keyEntry = keyManager.generateKey({ chainId: 1 });
        addresses.add(keyEntry.address);
      }

      // All 50 addresses should be unique
      expect(addresses.size).toBe(iterations);
    });

    it("should not generate predictable patterns", () => {
      const keys = [];
      for (let i = 0; i < 10; i++) {
        const keyEntry = keyManager.generateKey({ chainId: 1 });
        keys.push(keyEntry.privateKey);
      }

      // Check no two consecutive keys are similar
      for (let i = 0; i < keys.length - 1; i++) {
        let diffCount = 0;
        const key1 = keys[i];
        const key2 = keys[i + 1];

        for (let j = 0; j < Math.min(key1.length, key2.length); j++) {
          if (key1[j] !== key2[j]) {
            diffCount++;
          }
        }

        // At least 50% of characters should be different
        expect(diffCount).toBeGreaterThan(32);
      }
    });
  });

  describe("Private Key Validation", () => {
    it("should reject private keys without 0x prefix", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "a".repeat(64) as Hex,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should reject private keys with wrong length", () => {
      // Too short
      expect(() => {
        keyManager.importKey({
          privateKey: ("0x" + "a".repeat(32)) as Hex,
          chainId: 1
        });
      }).toThrow("Invalid private key");

      // Too long
      expect(() => {
        keyManager.importKey({
          privateKey: ("0x" + "a".repeat(96)) as Hex,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should reject private keys with invalid hex characters", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: ("0x" + "g".repeat(64)) as Hex,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should validate private key can derive valid address", () => {
      // Valid private key should work
      const privateKey = ("0x" + "a".repeat(64)) as Hex;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      expect(keyEntry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should reject empty private key", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "" as Hex,
          chainId: 1
        });
      }).toThrow("Private key cannot be empty");
    });

    it("should reject null/undefined private key", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: null as any,
          chainId: 1
        });
      }).toThrow("Private key cannot be empty");
    });
  });

  describe("Address Validation", () => {
    it("should validate addresses in getKey", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      // Valid address should work
      const retrieved = keyManager.getKey(keyEntry.address, 1);
      expect(retrieved).toBeDefined();

      // Invalid address format should not crash (just return undefined)
      const invalidRetrieved = keyManager.getKey("invalid" as any, 1);
      expect(invalidRetrieved).toBeUndefined();
    });

    it("should validate addresses in exportKey", () => {
      expect(() => {
        keyManager.exportKey({
          address: "invalid" as any,
          chainId: 1
        });
      }).toThrow("Key not found");
    });

    it("should validate addresses in deleteKey", () => {
      const result = keyManager.deleteKey("invalid" as any, 1);
      expect(result).toBe(false);
    });
  });

  describe("Chain ID Validation", () => {
    it("should reject invalid chain IDs", () => {
      expect(() => {
        keyManager.generateKey({ chainId: 0 });
      }).toThrow("Invalid chain ID");

      expect(() => {
        keyManager.generateKey({ chainId: 9999 });
      }).toThrow("Invalid chain ID");
    });

    it("should only allow configured chains", () => {
      // These should work
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      // These should fail
      expect(() => {
        keyManager.generateKey({ chainId: 56 });
      }).toThrow("Invalid chain ID");

      expect(() => {
        keyManager.generateKey({ chainId: 42161 });
      }).toThrow("Invalid chain ID");
    });
  });

  describe("Edge Cases and Attack Vectors", () => {
    it("should handle very long input strings", () => {
      const longString = "0x" + "a".repeat(1000);
      expect(() => {
        keyManager.importKey({ privateKey: longString as Hex, chainId: 1 });
      }).toThrow("Invalid private key");
    });

    it("should handle special characters in input", () => {
      const specialChars = "0x" + "!@#$%^&*()_+-=[]{}|;:,.<>?";
      expect(() => {
        keyManager.importKey({ privateKey: specialChars as Hex, chainId: 1 });
      }).toThrow("Invalid private key");
    });

    it("should handle unicode characters in input", () => {
      const unicode = "0x" + "🔥🚀".repeat(32);
      expect(() => {
        keyManager.importKey({ privateKey: unicode as Hex, chainId: 1 });
      }).toThrow("Invalid private key");
    });

    it("should handle negative chain IDs", () => {
      expect(() => {
        keyManager.generateKey({ chainId: -1 });
      }).toThrow("Invalid chain ID");
    });

    it("should handle floating point chain IDs", () => {
      expect(() => {
        keyManager.generateKey({ chainId: 1.5 as any });
      }).toThrow("Invalid chain ID");
    });

    it("should handle null chain ID", () => {
      expect(() => {
        keyManager.generateKey({ chainId: null as any });
      }).toThrow("Invalid chain ID");
    });
  });

  describe("Memory Safety", () => {
    it("should handle rapid key generation without memory leaks", () => {
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it("should handle large number of stored keys", () => {
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const keys = keyManager.listKeys();
      expect(keys.length).toBeGreaterThanOrEqual(iterations);
    });

    it("should handle deleting non-existent keys gracefully", () => {
      for (let i = 0; i < 100; i++) {
        const result = keyManager.deleteKey(("0x" + "f".repeat(40)) as any, 1);
        expect(result).toBe(false);
      }
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent key generation", async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise((resolve) => {
            const keyEntry = keyManager.generateKey({ chainId: 1 });
            resolve(keyEntry);
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(50);

      // Check all keys are unique
      const keys = new Set(results.map((r: any) => r.privateKey));
      expect(keys.size).toBe(50);
    });

    it("should handle concurrent key access", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            const retrieved = keyManager.getKey(keyEntry.address, 1);
            resolve(retrieved);
          })
        );
      }

      const results = await Promise.all(promises);

      // All should return the same key
      results.forEach((result) => {
        expect((result as any)?.privateKey).toBe(keyEntry.privateKey);
      });
    });
  });

  describe("Timing Attack Resistance", () => {
    it("should not have timing differences in validation", () => {
      const validKey = ("0x" + "a".repeat(64)) as Hex;
      const invalidKey = ("0x" + "b".repeat(64)) as Hex;

      const times = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start1 = performance.now();
        try {
          keyManager.importKey({ privateKey: validKey, chainId: 1 });
        } catch (e) {}
        const end1 = performance.now();

        const start2 = performance.now();
        try {
          keyManager.importKey({ privateKey: invalidKey, chainId: 1 });
        } catch (e) {}
        const end2 = performance.now();

        times.push(Math.abs(end1 - start1 - (end2 - start2)));
      }

      // Average timing difference should be small (< 10ms)
      const avgDiff = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgDiff).toBeLessThan(10);
    });
  });
});
