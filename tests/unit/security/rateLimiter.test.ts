import { describe, test, expect, beforeEach } from "bun:test";
import { RateLimiter, AgentRateLimiter } from "../../../src/security/rateLimiter";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe("checkLimit", () => {
    test("should allow requests within limit", async () => {
      const result = await rateLimiter.checkLimit("test-user", {
        maxRequests: 100,
        windowMs: 60000
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    test("should block requests exceeding limit", async () => {
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkLimit("test-user", {
          maxRequests: 100,
          windowMs: 60000
        });
      }

      const result = await rateLimiter.checkLimit("test-user", {
        maxRequests: 100,
        windowMs: 60000
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("should correctly track timestamps in sliding window", async () => {
      for (let i = 0; i < 99; i++) {
        await rateLimiter.checkLimit("test-user", {
          maxRequests: 100,
          windowMs: 60000
        });
      }

      const result = await rateLimiter.checkLimit("test-user", {
        maxRequests: 100,
        windowMs: 60000
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    test("should handle concurrent requests correctly with mutex", async () => {
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          rateLimiter.checkLimit("test-user", {
            maxRequests: 5,
            windowMs: 60000
          })
        );
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter((r) => r.allowed).length;
      expect(allowedCount).toBe(5);

      const allowedResults = results.filter((r) => r.allowed);
      const remainingCounts = allowedResults.map((r) => r.remaining).sort((a, b) => b - a);
      expect(remainingCounts).toEqual([4, 3, 2, 1, 0]);
    });

    test("should track requests per identifier independently", async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit("user1", {
          maxRequests: 10,
          windowMs: 60000
        });
      }

      for (let i = 0; i < 8; i++) {
        await rateLimiter.checkLimit("user2", {
          maxRequests: 10,
          windowMs: 60000
        });
      }

      const result1 = await rateLimiter.checkLimit("user1", {
        maxRequests: 10,
        windowMs: 60000
      });
      expect(result1.remaining).toBe(4);

      const result2 = await rateLimiter.checkLimit("user2", {
        maxRequests: 10,
        windowMs: 60000
      });
      expect(result2.remaining).toBe(1);
    });

    test("should handle different limit configurations", async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit("user", {
          maxRequests: 5,
          windowMs: 60000
        });
      }

      const result1 = await rateLimiter.checkLimit("user", {
        maxRequests: 5,
        windowMs: 60000
      });
      expect(result1.allowed).toBe(false);
      expect(result1.remaining).toBe(0);

      const result2 = await rateLimiter.checkLimit("user", {
        maxRequests: 10,
        windowMs: 60000
      });
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(4);
    });

    test("should return resetTime for blocked requests", async () => {
      const now = Date.now();

      await rateLimiter.checkLimit("test-user", {
        maxRequests: 1,
        windowMs: 60000
      });

      const result = await rateLimiter.checkLimit("test-user", {
        maxRequests: 1,
        windowMs: 60000
      });

      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeGreaterThanOrEqual(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe("clear", () => {
    test("should clear all requests", async () => {
      await rateLimiter.checkLimit("test-user", { maxRequests: 5, windowMs: 60000 });
      await rateLimiter.checkLimit("another-user", { maxRequests: 3, windowMs: 60000 });

      rateLimiter.clear();

      const result1 = await rateLimiter.checkLimit("test-user", {
        maxRequests: 5,
        windowMs: 60000
      });
      const result2 = await rateLimiter.checkLimit("another-user", {
        maxRequests: 3,
        windowMs: 60000
      });

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    test("should clear specific identifier", async () => {
      await rateLimiter.checkLimit("test-user", { maxRequests: 5, windowMs: 60000 });
      await rateLimiter.checkLimit("another-user", { maxRequests: 5, windowMs: 60000 });

      rateLimiter.clear("test-user");

      const result1 = await rateLimiter.checkLimit("test-user", {
        maxRequests: 5,
        windowMs: 60000
      });
      const result2 = await rateLimiter.checkLimit("another-user", {
        maxRequests: 5,
        windowMs: 60000
      });

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });
  });
});

describe("AgentRateLimiter", () => {
  let rateLimiter: AgentRateLimiter;

  beforeEach(() => {
    rateLimiter = new AgentRateLimiter();
  });

  describe("checkRequest", () => {
    test("should enforce request-level rate limit", async () => {
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkRequest("test-agent");
      }

      const result = await rateLimiter.checkRequest("test-agent");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("should allow requests within limit", async () => {
      const result = await rateLimiter.checkRequest("test-agent");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    test("should track requests per agent independently", async () => {
      const result1 = await rateLimiter.checkRequest("agent1");
      const result2 = await rateLimiter.checkRequest("agent2");

      expect(result1.remaining).toBe(result2.remaining);
    });
  });

  describe("checkTransactionLimit", () => {
    test("should enforce hourly transaction limit", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address);
      }

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("should enforce daily transaction limit", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      for (let i = 0; i < 1000; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address);
      }

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("should allow transactions within both limits", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address);
      }

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    test("should handle concurrent transaction limit checks with mutex", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(rateLimiter.checkTransactionLimit(chainId, address));
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter((r) => r.allowed).length;
      expect(allowedCount).toBe(10);
    });

    test("should track transactions per chain and address independently", async () => {
      const chainId = 1;
      const address1 = "0x1234567890123456789012345678901234567890" as `0x${string}`;
      const address2 = "0x0987654321098765432109876543210987654321" as `0x${string}`;

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address1);
      }

      for (let i = 0; i < 8; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address2);
      }

      const result1 = await rateLimiter.checkTransactionLimit(chainId, address1);
      expect(result1.remaining).toBe(4);

      const result2 = await rateLimiter.checkTransactionLimit(chainId, address2);
      expect(result2.remaining).toBe(1);
    });

    test("should track transactions per chain independently", async () => {
      const chainId1 = 1;
      const chainId2 = 137;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkTransactionLimit(chainId1, address);
      }

      const result1 = await rateLimiter.checkTransactionLimit(chainId1, address);
      expect(result1.allowed).toBe(false);

      const result2 = await rateLimiter.checkTransactionLimit(chainId2, address);
      expect(result2.allowed).toBe(true);
    });

    test("should return resetTime for blocked transactions", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkTransactionLimit(chainId, address);
      }

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeGreaterThan(0);
    });
  });

  describe("clear", () => {
    test("should clear all transaction limits", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      await rateLimiter.checkTransactionLimit(chainId, address);
      await rateLimiter.checkTransactionLimit(chainId, address);

      rateLimiter.clear(chainId, address);

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    test("should clear specific chain and address", async () => {
      const chainId = 1;
      const address = "0x1234567890123456789012345678901234567890" as `0x${string}`;

      await rateLimiter.checkTransactionLimit(chainId, address);

      rateLimiter.clear(chainId, address);

      const result = await rateLimiter.checkTransactionLimit(chainId, address);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    test("should clear all limits when no parameters provided", async () => {
      const chainId = 1;
      const address1 = "0x1234567890123456789012345678901234567890" as `0x${string}`;
      const address2 = "0x0987654321098765432109876543210987654321" as `0x${string}`;

      await rateLimiter.checkTransactionLimit(chainId, address1);
      await rateLimiter.checkTransactionLimit(chainId, address2);

      rateLimiter.clear();

      const result1 = await rateLimiter.checkTransactionLimit(chainId, address1);
      const result2 = await rateLimiter.checkTransactionLimit(chainId, address2);

      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(9);
    });
  });
});
