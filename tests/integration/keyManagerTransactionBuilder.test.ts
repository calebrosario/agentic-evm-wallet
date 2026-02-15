import { describe, it, expect, beforeEach } from "bun:test";
import { KeyManager } from "../../src/key/keyManager";
import { privateKeyToAccount } from "viem/accounts";

describe("KeyManager Integration Tests", () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  describe("Key Generation and Account Creation", () => {
    it("should generate key and create viem account", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.address).toBe(account.address);
      expect(keyEntry.privateKey).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should import key and create viem account", () => {
      const privateKey = ("0x" + "a".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.address).toBe(account.address);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should generate different keys for different transactions", () => {
      const key1 = keyManager.generateKey({ chainId: 1 });
      const key2 = keyManager.generateKey({ chainId: 1 });

      expect(key1.address).not.toBe(key2.address);
      expect(key1.privateKey).not.toBe(key2.privateKey);
    });
  });

  describe("Multi-Chain Support", () => {
    it("should handle Ethereum keys", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.chainId).toBe(1);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should handle Polygon keys", () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.chainId).toBe(137);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should support same private key on different chains", () => {
      const privateKey = ("0x" + "b".repeat(64)) as any;

      const ethKey = keyManager.importKey({ privateKey, chainId: 1 });
      const polygonKey = keyManager.importKey({ privateKey, chainId: 137 });

      expect(ethKey.chainId).toBe(1);
      expect(polygonKey.chainId).toBe(137);
      expect(ethKey.address).toBe(polygonKey.address);
    });
  });

  describe("Key Management Integration", () => {
    it("should complete key lifecycle: generate, retrieve, delete", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      const retrieved = keyManager.getKey(keyEntry.address, 1);
      expect(retrieved).toBeDefined();
      expect(retrieved?.address).toBe(keyEntry.address);

      const deleted = keyManager.deleteKey(keyEntry.address, 1);
      expect(deleted).toBe(true);

      const afterDelete = keyManager.getKey(keyEntry.address, 1);
      expect(afterDelete).toBeUndefined();
    });

    it("should export key successfully", () => {
      const privateKey = ("0x" + "c".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });

      const exported = keyManager.exportKey({
        address: keyEntry.address,
        chainId: 1
      });

      expect(exported).toBe(privateKey);
    });

    it("should list keys across chains", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const allKeys = keyManager.listKeys();
      expect(allKeys.length).toBeGreaterThanOrEqual(2);

      const ethKeys = keyManager.listKeys(1);
      const polygonKeys = keyManager.listKeys(137);

      expect(ethKeys.length).toBeGreaterThanOrEqual(1);
      expect(polygonKeys.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Transaction Signing Integration", () => {
    it("should sign transaction with generated key", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const recipientKey = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction: any = {
        to: recipientKey.address,
        value: 1000000000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signed.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should sign transaction with imported key", async () => {
      const privateKey = ("0x" + "d".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const recipientKey = keyManager.generateKey({ chainId: 1 });

      const transaction: any = {
        to: recipientKey.address,
        value: 500000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it("should reject invalid private key during signing", async () => {
      const recipientKey = keyManager.generateKey({ chainId: 1 });

      const transaction: any = {
        to: recipientKey.address,
        value: 1000000000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      await expect(
        keyManager.signTransaction({
          privateKey: "invalid" as any,
          chainId: 1,
          transaction
        })
      ).rejects.toThrow("Invalid private key");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid chain ID in key generation", () => {
      expect(() => {
        keyManager.generateKey({ chainId: 9999 });
      }).toThrow("Invalid chain ID");
    });

    it("should handle invalid chain ID in key import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "0x" + "e".repeat(64) as any,
          chainId: 9999
        });
      }).toThrow("Invalid chain ID");
    });

    it("should handle invalid private key in import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "invalid" as any,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should handle empty private key in import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "" as any,
          chainId: 1
        });
      }).toThrow("Private key cannot be empty");
    });
  });

  describe("Performance Integration", () => {
    it("should handle rapid key generation", () => {
      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it("should handle many stored keys efficiently", () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const keys = keyManager.listKeys();
      expect(keys.length).toBeGreaterThanOrEqual(iterations);

      const startTime = Date.now();
      const filteredKeys = keyManager.listKeys(1);
      const filterDuration = Date.now() - startTime;

      expect(filterDuration).toBeLessThan(100);
    });
  });
});

  describe("Key Generation and Account Creation", () => {
    it("should generate key and create viem account", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.address).toBe(account.address);
      expect(keyEntry.privateKey).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should import key and create viem account", () => {
      const privateKey = ("0x" + "a".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.address).toBe(account.address);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should generate different keys for different transactions", () => {
      const key1 = keyManager.generateKey({ chainId: 1 });
      const key2 = keyManager.generateKey({ chainId: 1 });

      expect(key1.address).not.toBe(key2.address);
      expect(key1.privateKey).not.toBe(key2.privateKey);
    });
  });

  describe("Multi-Chain Support", () => {
    it("should handle Ethereum keys", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.chainId).toBe(1);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should handle Polygon keys", () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.chainId).toBe(137);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should support same private key on different chains", () => {
      const privateKey = ("0x" + "b".repeat(64)) as any;

      const ethKey = keyManager.importKey({ privateKey, chainId: 1 });
      const polygonKey = keyManager.importKey({ privateKey, chainId: 137 });

      expect(ethKey.chainId).toBe(1);
      expect(polygonKey.chainId).toBe(137);
      expect(ethKey.address).toBe(polygonKey.address);
    });
  });

  describe("Key Management Integration", () => {
    it("should complete key lifecycle: generate, retrieve, delete", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });

      const retrieved = keyManager.getKey(keyEntry.address, 1);
      expect(retrieved).toBeDefined();
      expect(retrieved?.address).toBe(keyEntry.address);

      const deleted = keyManager.deleteKey(keyEntry.address, 1);
      expect(deleted).toBe(true);

      const afterDelete = keyManager.getKey(keyEntry.address, 1);
      expect(afterDelete).toBeUndefined();
    });

    it("should export key successfully", () => {
      const privateKey = ("0x" + "c".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });

      const exported = keyManager.exportKey({
        address: keyEntry.address,
        chainId: 1
      });

      expect(exported).toBe(privateKey);
    });

    it("should list keys across chains", () => {
      keyManager.generateKey({ chainId: 1 });
      keyManager.generateKey({ chainId: 137 });

      const allKeys = keyManager.listKeys();
      expect(allKeys.length).toBeGreaterThanOrEqual(2);

      const ethKeys = keyManager.listKeys(1);
      const polygonKeys = keyManager.listKeys(137);

      expect(ethKeys.length).toBeGreaterThanOrEqual(1);
      expect(polygonKeys.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Transaction Signing Integration", () => {
    it("should sign transaction with generated key", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const recipientKey = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction: any = {
        to: recipientKey.address,
        value: 1000000000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signed.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should sign transaction with imported key", async () => {
      const privateKey = ("0x" + "d".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const recipientKey = keyManager.generateKey({ chainId: 1 });

      const transaction: any = {
        to: recipientKey.address,
        value: 500000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it("should reject invalid private key during signing", async () => {
      const recipientKey = keyManager.generateKey({ chainId: 1 });

      const transaction: any = {
        to: recipientKey.address,
        value: 1000000000000000000000n,
        gas: 21000n,
        nonce: 0n,
        type: "eip1559" as const,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n
      };

      await expect(
        keyManager.signTransaction({
          privateKey: "invalid" as any,
          chainId: 1,
          transaction
        })
      ).rejects.toThrow("Invalid private key");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid chain ID in key generation", () => {
      expect(() => {
        keyManager.generateKey({ chainId: 9999 });
      }).toThrow("Invalid chain ID");
    });

    it("should handle invalid chain ID in key import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "0x" + "e".repeat(64),
          chainId: 9999
        });
      }).toThrow("Invalid chain ID");
    });

    it("should handle invalid private key in import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "invalid" as any,
          chainId: 1
        });
      }).toThrow("Invalid private key");
    });

    it("should handle empty private key in import", () => {
      expect(() => {
        keyManager.importKey({
          privateKey: "" as any,
          chainId: 1
        });
      }).toThrow("Private key cannot be empty");
    });
  });

  describe("Performance Integration", () => {
    it("should handle rapid key generation", () => {
      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it("should handle many stored keys efficiently", () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        keyManager.generateKey({ chainId: 1 });
      }

      const keys = keyManager.listKeys();
      expect(keys.length).toBeGreaterThanOrEqual(iterations);

      const startTime = Date.now();
      const filteredKeys = keyManager.listKeys(1);
      const filterDuration = Date.now() - startTime;

      expect(filterDuration).toBeLessThan(100);
    });
  });
});

  describe("Key Generation and Transaction Building", () => {
    it("should generate key and use it for transaction building", () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      expect(keyEntry.address).toBe(account.address);
      expect(keyEntry.privateKey).toBeDefined();
    });

    it("should use generated key in transaction builder", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      expect(transaction).toBeDefined();
      expect(transaction.to).toBe(testAddress);
      expect(transaction.value).toBe(1000000000000000000n);
      expect(transaction.gas).toBeDefined();
    });

    it("should generate different keys for different transactions", () => {
      const key1 = keyManager.generateKey({ chainId: 1 });
      const key2 = keyManager.generateKey({ chainId: 1 });

      expect(key1.address).not.toBe(key2.address);
      expect(key1.privateKey).not.toBe(key2.privateKey);
    });
  });

  describe("Transaction Signing with KeyManager", () => {
    it("should sign transaction using KeyManager", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction: transaction as any
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signed.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should import key and use it for signing", async () => {
      const privateKey = ("0x" + "a".repeat(64)) as any;
      const keyEntry = keyManager.importKey({ privateKey, chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: keyEntry.address,
        value: 500000000000000000n,
        account
      });

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction: transaction as any
      });

      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it("should sign multiple transactions with same key", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          transactionBuilder.buildTransaction(1, {
            to: testAddress,
            value: 1000000000000000n * BigInt(i + 1),
            account
          })
        );
      }

      const transactions = await Promise.all(promises);

      for (const transaction of transactions) {
        const signed = await keyManager.signTransaction({
          privateKey: keyEntry.privateKey,
          chainId: 1,
          transaction: transaction as any
        });
        expect(signed).toBeDefined();
      }
    });
  });

  describe("Multi-Chain Transactions", () => {
    it("should handle Ethereum transactions", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      expect(transaction).toBeDefined();

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction: transaction as any
      });

      expect(signed).toBeDefined();
    });

    it("should handle Polygon transactions", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 137 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(137, {
        to: testAddress,
        value: 5000000000000000000n,
        account
      });

      expect(transaction).toBeDefined();

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 137,
        transaction: transaction as any
      });

      expect(signed).toBeDefined();
    });

    it("should support same private key on different chains", async () => {
      const privateKey = ("0x" + "b".repeat(64)) as any;

      const ethKey = keyManager.importKey({ privateKey, chainId: 1 });
      const polygonKey = keyManager.importKey({ privateKey, chainId: 137 });

      const ethAccount = privateKeyToAccount(ethKey.privateKey);
      const polygonAccount = privateKeyToAccount(polygonKey.privateKey);

      const ethTransaction = await transactionBuilder.buildTransaction(1, {
        to: ethKey.address,
        value: 1000000000000000000n,
        account: ethAccount
      });

      const polygonTransaction = await transactionBuilder.buildTransaction(137, {
        to: polygonKey.address,
        value: 5000000000000000000n,
        account: polygonAccount
      });

      const ethSigned = await keyManager.signTransaction({
        privateKey: ethKey.privateKey,
        chainId: 1,
        transaction: ethTransaction as any
      });

      const polygonSigned = await keyManager.signTransaction({
        privateKey: polygonKey.privateKey,
        chainId: 137,
        transaction: polygonTransaction as any
      });

      expect(ethSigned).toBeDefined();
      expect(polygonSigned).toBeDefined();
      expect(ethSigned.signedTransaction).not.toBe(polygonSigned.signedTransaction);
    });
  });

  describe("Transaction Workflow", () => {
    it("should complete full workflow: generate, build, sign", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction: transaction as any
      });

      expect(keyEntry.address).toBeDefined();
      expect(transaction).toBeDefined();
      expect(signed).toBeDefined();
      expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it("should handle multiple transactions in sequence", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const signedTransactions = [];

      for (let i = 0; i < 3; i++) {
        const transaction = await transactionBuilder.buildTransaction(1, {
          to: testAddress,
          value: 1000000000000000n * BigInt(i + 1),
          account
        });

        const signed = await keyManager.signTransaction({
          privateKey: keyEntry.privateKey,
          chainId: 1,
          transaction: transaction as any
        });

        signedTransactions.push(signed);
      }

      expect(signedTransactions).toHaveLength(3);
      signedTransactions.forEach((signed) => {
        expect(signed).toBeDefined();
        expect(signed.signedTransaction).toMatch(/^0x[a-fA-F0-9]+$/);
      });
    });

    it("should handle transaction with data field", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const data =
        "0xa9059cbb00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000001";

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 0n,
        data: data as `0x${string}`,
        account
      });

      expect(transaction.data).toBe(data);

      const signed = await keyManager.signTransaction({
        privateKey: keyEntry.privateKey,
        chainId: 1,
        transaction: transaction as any
      });

      expect(signed).toBeDefined();
    });
  });

  describe("Error Handling in Integration", () => {
    it("should handle invalid private key in signing", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      await expect(
        keyManager.signTransaction({
          privateKey: "invalid" as any,
          chainId: 1,
          transaction: transaction as any
        })
      ).rejects.toThrow("Invalid private key");
    });

    it("should handle mismatched chain IDs", async () => {
      const keyEntry = keyManager.generateKey({ chainId: 1 });
      const account = privateKeyToAccount(keyEntry.privateKey);

      const transaction = await transactionBuilder.buildTransaction(1, {
        to: testAddress,
        value: 1000000000000000000n,
        account
      });

      await expect(
        keyManager.signTransaction({
          privateKey: keyEntry.privateKey,
          chainId: 137,
          transaction: transaction as any
        })
      ).rejects.toThrow();
    });
  });

  describe("Performance Integration", () => {
    it("should handle rapid key generation and transaction building", async () => {
      const startTime = Date.now();
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const keyEntry = keyManager.generateKey({ chainId: 1 });
        const account = privateKeyToAccount(keyEntry.privateKey);

        const transaction = await transactionBuilder.buildTransaction(1, {
          to: testAddress,
          value: 1000000000000000n,
          account
        });

        const signed = await keyManager.signTransaction({
          privateKey: keyEntry.privateKey,
          chainId: 1,
          transaction: transaction as any
        });

        expect(signed).toBeDefined();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});
