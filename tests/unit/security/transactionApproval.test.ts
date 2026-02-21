import { describe, test, expect, beforeEach } from "bun:test";
import {
  TransactionApprovalManager,
  type PendingTransaction
} from "../../../src/security/transactionApproval";
import type { Address } from "viem";

describe("TransactionApprovalManager", () => {
  let approvalManager: TransactionApprovalManager;
  const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  const TEST_CHAIN_ID = 1;

  beforeEach(() => {
    approvalManager = new TransactionApprovalManager();
  });

  describe("prepareTransaction", () => {
    test("should create pending transaction with approval token", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n,
        data: "0x" as `0x${string}`,
        gas: 21000n
      });

      const pending = approvalManager.getTransaction(result.transactionId);

      expect(result.transactionId).toBeDefined();
      expect(result.approvalToken).toBeDefined();
      expect(pending).toBeDefined();
      expect(pending.id).toBe(result.transactionId);
      expect(pending.status).toBe("pending");
      expect(pending.chainId).toBe(TEST_CHAIN_ID);
      expect(pending.approvalToken).toBe(result.approvalToken);
    });
  });

  describe("getPendingTransactions", () => {
    test("should return list of pending transactions", () => {
      approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 2000000000000000000n
      });

      const pendingTransactions = approvalManager.getPendingTransactions();

      expect(pendingTransactions).toHaveLength(2);
    });

    test("should filter out non-pending transactions", () => {
      const result1 = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const result2 = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 2000000000000000000n
      });

      const pendingTx1 = approvalManager.getTransaction(result1.transactionId);
      approvalManager.authorizeTransaction(pendingTx1.id, pendingTx1.approvalToken as string);

      const pendingTransactions = approvalManager.getPendingTransactions();

      expect(pendingTransactions).toHaveLength(1);
      expect(pendingTransactions[0].id).toBe(result2.transactionId);
    });
  });

  describe("authorizeTransaction", () => {
    test("should approve transaction with valid token", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const pendingTx = approvalManager.getTransaction(result.transactionId);
      const authResult = approvalManager.authorizeTransaction(
        pendingTx.id,
        pendingTx.approvalToken as string
      );

      expect(authResult.success).toBe(true);
      expect(authResult.transactionId).toBe(pendingTx.id);
      expect(authResult.message).toBe("Transaction approved");

      const updatedTx = approvalManager.getTransaction(pendingTx.id);
      expect(updatedTx.status).toBe("approved");
    });

    test("should reject authorization with invalid token", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const pendingTx = approvalManager.getTransaction(result.transactionId);
      const authResult = approvalManager.authorizeTransaction(pendingTx.id, "invalid_token_12345");

      expect(authResult.success).toBe(false);
      expect(authResult.transactionId).toBe(pendingTx.id);
      expect(authResult.message).toBe("Invalid approval token");
    });

    test("should reject authorization for non-existent transaction", () => {
      const authResult = approvalManager.authorizeTransaction("non_existent_tx", "some_token");

      expect(authResult.success).toBe(false);
      expect(authResult.transactionId).toBe("non_existent_tx");
      expect(authResult.message).toBe("Transaction not found");
    });

    test("should reject authorization for already approved transaction", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const pendingTx = approvalManager.getTransaction(result.transactionId);
      approvalManager.authorizeTransaction(pendingTx.id, pendingTx.approvalToken as string);

      const authResult2 = approvalManager.authorizeTransaction(
        pendingTx.id,
        pendingTx.approvalToken as string
      );

      expect(authResult2.success).toBe(false);
      expect(authResult2.transactionId).toBe(pendingTx.id);
      expect(authResult2.message).toBe("Transaction already approved");
    });
  });

  describe("markFailed", () => {
    test("should mark transaction as failed with error message", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const pendingTx = approvalManager.getTransaction(result.transactionId);
      approvalManager.markFailed(pendingTx.id, "Insufficient funds");

      const updatedTx = approvalManager.getTransaction(pendingTx.id);

      expect(updatedTx.status).toBe("failed");
      expect(updatedTx.errorMessage).toBe("Insufficient funds");
    });

    test("should handle marking non-existent transaction as failed", () => {
      approvalManager.markFailed("non_existent_tx", "Some error");

      const tx = approvalManager.getTransaction("non_existent_tx");
      expect(tx).toBeUndefined();
    });
  });

  describe("Time-based Expiration", () => {
    test("should mark expired transactions as expired", () => {
      let currentTime = Date.now();
      const approvalManagerWithTime = new TransactionApprovalManager(() => currentTime);

      approvalManagerWithTime.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      approvalManagerWithTime.clearExpired();

      let pending = approvalManagerWithTime.getPendingTransactions();
      expect(pending).toHaveLength(1);

      currentTime += 301000; // Move past default 300000 TTL
      approvalManagerWithTime.clearExpired();

      pending = approvalManagerWithTime.getPendingTransactions();
      expect(pending).toHaveLength(0);
    });

    test("should reject authorization for expired transaction", () => {
      let currentTime = Date.now();
      const approvalManagerWithTime = new TransactionApprovalManager(() => currentTime);

      const result = approvalManagerWithTime.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      const pendingTx = approvalManagerWithTime.getTransaction(result.transactionId);

      currentTime += 301000; // Move past expiration

      const authResult = approvalManagerWithTime.authorizeTransaction(
        pendingTx.id,
        pendingTx.approvalToken as string
      );

      expect(authResult.success).toBe(false);
      expect(authResult.message).toBe("Transaction has expired");
    });

    test("should filter out expired transactions from pending list", () => {
      let currentTime = Date.now();
      const approvalManagerWithTime = new TransactionApprovalManager(() => currentTime);

      approvalManagerWithTime.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      currentTime += 301000; // Move past expiration

      const pending = approvalManagerWithTime.getPendingTransactions();
      expect(pending).toHaveLength(0);
    });
  });

  describe("Security Properties", () => {
    test("should generate cryptographically secure transaction IDs", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      expect(result.transactionId).toMatch(/^tx_[0-9a-f]{32}$/);
    });

    test("should generate cryptographically secure approval tokens", () => {
      const result = approvalManager.prepareTransaction({
        chainId: TEST_CHAIN_ID,
        from: TEST_ADDRESS as Address,
        to: TEST_ADDRESS as Address,
        value: 1000000000000000000n
      });

      expect(result.approvalToken).toMatch(/^token_[0-9a-f]{48}$/);
    });

    test("should not expose private keys or sensitive data in errors", () => {
      const invalidTxId = "invalid_tx";
      const result = approvalManager.authorizeTransaction(invalidTxId, "bad_token");

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.message).not.toContain("privateKey");
      expect(result.message).not.toContain("secret");
    });
  });
});
