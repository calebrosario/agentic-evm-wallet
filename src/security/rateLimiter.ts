import type { Address } from "viem";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Promise-based async mutex to replace busy-wait polling
 * Uses a queue to manage waiting lock acquisitions
 */
interface LockState {
  locked: boolean;
  queue: Array<() => void>;
}

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private lockStates = new Map<string, LockState>();

  /**
   * Acquire a lock for the given key using async queue-based mutex
   * Returns a release function that must be called to release the lock
   */
  private async acquireLock(key: string): Promise<() => void> {
    if (!this.lockStates.has(key)) {
      this.lockStates.set(key, { locked: false, queue: [] });
    }

    const lockState = this.lockStates.get(key)!;

    // If lock is free, acquire immediately
    if (!lockState.locked) {
      lockState.locked = true;
      return () => this.releaseLock(key);
    }

    // Lock is held, wait in queue
    return new Promise((resolve) => {
      lockState.queue.push(() => {
        lockState.locked = true;
        resolve(() => this.releaseLock(key));
      });
    });
  }

  /**
   * Release a lock and wake up the next waiter in queue
   */
  private releaseLock(key: string): void {
    const lockState = this.lockStates.get(key);
    if (!lockState) return;

    const nextWaiter = lockState.queue.shift();
    if (nextWaiter) {
      // Wake up next waiter - they will set locked=true
      nextWaiter();
    } else {
      // No waiters, mark as free
      lockState.locked = false;
    }
  }

  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const release = await this.acquireLock(identifier);

    try {
      const now = Date.now();
      const requests = this.requests.get(identifier) || [];

      const recent = requests.filter((timestamp) => now - timestamp < config.windowMs);

      if (recent.length >= config.maxRequests) {
        const oldestTimestamp = recent[0];
        const resetTime = oldestTimestamp + config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime
        };
      }

      const newRequests = [...recent, now];
      this.requests.set(identifier, newRequests);

      return {
        allowed: true,
        remaining: config.maxRequests - newRequests.length,
        resetTime: now + config.windowMs
      };
    } finally {
      release();
    }
  }

  clear(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
      this.lockStates.delete(identifier);
    } else {
      this.requests.clear();
      this.lockStates.clear();
    }
  }
}

export class AgentRateLimiter {
  private readonly limiter: RateLimiter;
  private readonly dailyLimit: number;
  private readonly hourlyLimit: number;
  private readonly transactionTracker = new Map<string, number[]>();
  private readonly lockStates = new Map<string, LockState>();

  constructor() {
    this.limiter = new RateLimiter();
    this.dailyLimit = Number(process.env.MAX_TRANSACTIONS_PER_DAY) || 1000;
    this.hourlyLimit = Number(process.env.MAX_TRANSACTIONS_PER_HOUR) || 10;
  }

  async checkRequest(identifier: string): Promise<RateLimitResult> {
    const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;

    return await this.limiter.checkLimit(identifier, { maxRequests, windowMs });
  }

  /**
   * Acquire a lock for the given key using async queue-based mutex
   * Returns a release function that must be called to release the lock
   */
  private async acquireLock(key: string): Promise<() => void> {
    if (!this.lockStates.has(key)) {
      this.lockStates.set(key, { locked: false, queue: [] });
    }

    const lockState = this.lockStates.get(key)!;

    if (!lockState.locked) {
      lockState.locked = true;
      return () => this.releaseLock(key);
    }

    return new Promise((resolve) => {
      lockState.queue.push(() => {
        lockState.locked = true;
        resolve(() => this.releaseLock(key));
      });
    });
  }

  private releaseLock(key: string): void {
    const lockState = this.lockStates.get(key);
    if (!lockState) return;

    const nextWaiter = lockState.queue.shift();
    if (nextWaiter) {
      nextWaiter();
    } else {
      lockState.locked = false;
    }
  }

  async checkTransactionLimit(chainId: number, address: Address): Promise<RateLimitResult> {
    const identifier = `${chainId}:${address}`;
    const release = await this.acquireLock(identifier);

    try {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const oneDayAgo = now - 86400000;

      const allTransactions = this.transactionTracker.get(identifier) || [];
      const recentHour = allTransactions.filter((timestamp) => timestamp > oneHourAgo);
      const recentDay = allTransactions.filter((timestamp) => timestamp > oneDayAgo);

      if (recentHour.length >= this.hourlyLimit) {
        const oldestTimestamp = recentHour[0];
        return {
          allowed: false,
          remaining: 0,
          resetTime: oldestTimestamp + 3600000
        };
      }

      if (recentDay.length >= this.dailyLimit) {
        const oldestTimestamp = recentDay[0];
        return {
          allowed: false,
          remaining: 0,
          resetTime: oldestTimestamp + 86400000
        };
      }

      const allTx = [...recentDay, now];
      this.transactionTracker.set(identifier, allTx);

      const newHourlyCount = recentHour.length + 1;
      const newDailyCount = recentDay.length + 1;

      return {
        allowed: true,
        remaining: Math.min(this.hourlyLimit - newHourlyCount, this.dailyLimit - newDailyCount),
        resetTime: now + 3600000
      };
    } finally {
      release();
    }
  }

  clear(chainId?: number, address?: Address): void {
    if (chainId && address) {
      const identifier = `${chainId}:${address}`;
      this.transactionTracker.delete(identifier);
      this.lockStates.delete(identifier);
    } else {
      this.transactionTracker.clear();
      this.lockStates.clear();
    }
  }
}
