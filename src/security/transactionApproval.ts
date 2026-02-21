import type { Address, TransactionRequest, Hash } from "viem";

export interface PendingTransaction {
  id: string;
  chainId: number;
  from: Address;
  to: Address;
  value: bigint;
  data: `0x${string}` | undefined;
  gas: bigint | undefined;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "approved" | "expired" | "executed" | "failed";
  approvalToken: string;
  executionHash?: Hash;
  errorMessage?: string;
}

export interface PrepareTransactionResult {
  transactionId: string;
  expiresAt: number;
  approvalToken: string;
}

export interface ApprovalResult {
  success: boolean;
  transactionId: string;
  message: string;
}

export class TransactionApprovalManager {
  private pendingTransactions = new Map<string, PendingTransaction>();
  private timeProvider: () => number = Date.now;

  constructor(timeProvider?: () => number) {
    if (timeProvider) {
      this.timeProvider = timeProvider;
    }
  }

  private generateId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Buffer.from(bytes).toString("hex");
    return `tx_${hex}`;
  }

  private generateApprovalToken(transactionId: string): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Buffer.from(bytes).toString("hex");
    return `token_${hex}`;
  }

  getTransaction(transactionId: string): PendingTransaction | undefined {
    return this.pendingTransactions.get(transactionId);
  }

  prepareTransaction(params: {
    chainId: number;
    from: Address;
    to: Address;
    value: bigint;
    data?: `0x${string}`;
    gas?: bigint;
  }): PrepareTransactionResult {
    const transactionId = this.generateId();
    const approvalToken = this.generateApprovalToken(transactionId);
    const now = this.timeProvider();
    const ttl = Number(process.env.TRANSACTION_TTL_MS) || 300000;
    const expiresAt = now + ttl;

    const pendingTx: PendingTransaction = {
      id: transactionId,
      chainId: params.chainId,
      from: params.from,
      to: params.to,
      value: params.value,
      data: params.data,
      gas: params.gas,
      createdAt: now,
      expiresAt,
      status: "pending",
      approvalToken
    };

    this.pendingTransactions.set(transactionId, pendingTx);

    return {
      transactionId,
      expiresAt,
      approvalToken
    };
  }

  getPendingTransactions(): PendingTransaction[] {
    const now = this.timeProvider();
    const transactions = Array.from(this.pendingTransactions.values());

    return transactions.filter((tx) => {
      if (tx.status !== "pending") return false;
      if (now > tx.expiresAt) {
        tx.status = "expired";
        this.pendingTransactions.set(tx.id, tx);
        return false;
      }
      return true;
    });
  }

  authorizeTransaction(transactionId: string, approvalToken: string): ApprovalResult {
    const transaction = this.getTransaction(transactionId);

    if (!transaction) {
      return {
        success: false,
        transactionId,
        message: "Transaction not found"
      };
    }

    if (transaction.status !== "pending") {
      return {
        success: false,
        transactionId,
        message: `Transaction already ${transaction.status}`
      };
    }

    const now = this.timeProvider();
    if (now > transaction.expiresAt) {
      transaction.status = "expired";
      this.pendingTransactions.set(transactionId, transaction);
      return {
        success: false,
        transactionId,
        message: "Transaction has expired"
      };
    }

    if (approvalToken !== transaction.approvalToken) {
      return {
        success: false,
        transactionId,
        message: "Invalid approval token"
      };
    }

    transaction.status = "approved";
    this.pendingTransactions.set(transactionId, transaction);

    return {
      success: true,
      transactionId,
      message: "Transaction approved"
    };
  }

  markExecuted(transactionId: string, hash: Hash): void {
    const transaction = this.getTransaction(transactionId);

    if (!transaction) return;

    transaction.status = "executed";
    transaction.executionHash = hash;
    this.pendingTransactions.set(transactionId, transaction);
  }

  markFailed(transactionId: string, errorMessage: string): void {
    const transaction = this.getTransaction(transactionId);

    if (!transaction) return;

    transaction.status = "failed";
    transaction.errorMessage = errorMessage;
    this.pendingTransactions.set(transactionId, transaction);
  }

  checkTransactionSize(value: bigint): { allowed: boolean; message: string } {
    const maxValueEth = Number(process.env.MAX_TRANSACTION_SIZE_ETH) || 1;
    const maxValueWei = BigInt(maxValueEth) * 10n ** 18n;

    if (value > maxValueWei) {
      const valueInEth = Number(value) / 1e18;
      return {
        allowed: false,
        message: `Transaction value ${valueInEth} ETH exceeds maximum ${maxValueEth} ETH`
      };
    }

    return {
      allowed: true,
      message: "Transaction size acceptable"
    };
  }

  clearExpired(): void {
    const now = this.timeProvider();
    for (const [id, tx] of this.pendingTransactions.entries()) {
      if (now > tx.expiresAt && tx.status === "pending") {
        tx.status = "expired";
        this.pendingTransactions.set(id, tx);
      }
    }
  }
}
