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

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private locks = new Map<string, () => void>();

  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const lockKey = identifier;

    // Wait for existing lock to be released
    while (this.locks.has(lockKey)) {
      await new Promise<void>((resolve) => {
        const existingRelease = this.locks.get(lockKey);
        if (existingRelease) {
          // Wait for the existing lock to be released
          const checkInterval = setInterval(() => {
            if (!this.locks.has(lockKey) || this.locks.get(lockKey) !== existingRelease) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 1);
        } else {
          resolve();
        }
      });
    }

    // Acquire lock
    let releaseFn: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });
    this.locks.set(lockKey, releaseFn!);

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
      // Release lock
      this.locks.delete(lockKey);
      releaseFn!();
    }
  }

  clear(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
      this.locks.delete(identifier);
    } else {
      this.requests.clear();
      this.locks.clear();
    }
  }
}

export class AgentRateLimiter {
  private readonly limiter: RateLimiter;
  private readonly dailyLimit: number;
  private readonly hourlyLimit: number;
  private readonly transactionTracker = new Map<string, number[]>();
  private readonly locks = new Map<string, () => void>();

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

  async checkTransactionLimit(chainId: number, address: Address): Promise<RateLimitResult> {
    const identifier = `${chainId}:${address}`;

    while (this.locks.has(identifier)) {
      await new Promise<void>((resolve) => {
        const existingRelease = this.locks.get(identifier);
        if (existingRelease) {
          const checkInterval = setInterval(() => {
            if (!this.locks.has(identifier) || this.locks.get(identifier) !== existingRelease) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 1);
        } else {
          resolve();
        }
      });
    }

    let releaseFn: () => void;
    this.locks.set(identifier, (() => {}) as () => void);
    const lockPromise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });
    this.locks.set(identifier, releaseFn!);

    try {
      const now = Date.now();
      const transactions = this.transactionTracker.get(identifier) || [];

      const oneHourAgo = now - 3600000;
      const oneDayAgo = now - 86400000;

      const recentHour = transactions.filter((timestamp) => timestamp > oneHourAgo);
      const recentDay = transactions.filter((timestamp) => timestamp > oneDayAgo);

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

      recentHour.push(now);
      this.transactionTracker.set(identifier, recentHour);

      return {
        allowed: true,
        remaining: Math.min(
          this.hourlyLimit - recentHour.length,
          this.dailyLimit - recentDay.length
        ),
        resetTime: now + 3600000
      };
    } finally {
      this.locks.delete(identifier);
      releaseFn!();
    }
  }

  clear(chainId?: number, address?: Address): void {
    if (chainId && address) {
      const identifier = `${chainId}:${address}`;
      this.transactionTracker.delete(identifier);
      this.locks.delete(identifier);
    } else {
      this.transactionTracker.clear();
      this.locks.clear();
    }
  }
}
