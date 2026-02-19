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

  checkLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
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

    recent.push(now);
    this.requests.set(identifier, recent);

    return {
      allowed: true,
      remaining: config.maxRequests - recent.length,
      resetTime: now + config.windowMs
    };
  }

  clear(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}

export class AgentRateLimiter {
  private readonly limiter: RateLimiter;
  private readonly dailyLimit: number;
  private readonly hourlyLimit: number;
  private readonly transactionTracker = new Map<string, number[]>();

  constructor() {
    this.limiter = new RateLimiter();
    this.dailyLimit = Number(process.env.MAX_TRANSACTIONS_PER_DAY) || 1000;
    this.hourlyLimit = Number(process.env.MAX_TRANSACTIONS_PER_HOUR) || 10;
  }

  checkRequest(identifier: string): RateLimitResult {
    const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;

    return this.limiter.checkLimit(identifier, { maxRequests, windowMs });
  }

  checkTransactionLimit(chainId: number, address: Address): RateLimitResult {
    const identifier = `${chainId}:${address}`;
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
      remaining: Math.min(this.hourlyLimit - recentHour.length, this.dailyLimit - recentDay.length),
      resetTime: now + 3600000
    };
  }

  clear(chainId?: number, address?: Address): void {
    if (chainId && address) {
      const identifier = `${chainId}:${address}`;
      this.transactionTracker.delete(identifier);
    } else {
      this.transactionTracker.clear();
    }
  }
}
