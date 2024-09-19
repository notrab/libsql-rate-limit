import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { Ratelimiter, createRateLimiter, RateLimitResult } from "./";

const TEST_DB_PATH = path.join(__dirname, "test.db");

describe("RateLimiter with Local SQLite", () => {
  let rateLimiter: Ratelimiter;

  beforeAll(async () => {
    // Ensure the test database doesn't exist before we start
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    rateLimiter = createRateLimiter({
      url: `file:${TEST_DB_PATH}`,
    });

    // No need to call initialize() as it's done automatically now
  });

  afterAll(async () => {
    await rateLimiter.close();
    // Clean up the test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("should return success for first request within limit", async () => {
    const result: RateLimitResult = await rateLimiter.limit({
      key: "test-key-1",
      limit: 5,
      window: 60000,
    });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.reset).toBeGreaterThan(0);
  });

  it("should return failure when limit is exceeded", async () => {
    const key = "test-key-2";
    const limit = 3;
    const window = 60000;

    // Make 3 successful requests
    for (let i = 0; i < limit; i++) {
      const result = await rateLimiter.limit({ key, limit, window });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }

    // This request should fail
    const result = await rateLimiter.limit({ key, limit, window });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(limit);
    expect(result.reset).toBeGreaterThan(0);
  });

  it("should reset the count after the window has passed", async () => {
    const key = "test-key-3";
    const limit = 2;
    const window = 1000; // 1 second for quicker testing

    // Make 2 successful requests
    for (let i = 0; i < limit; i++) {
      const result = await rateLimiter.limit({ key, limit, window });
      expect(result.success).toBe(true);
    }

    // This request should fail
    let result = await rateLimiter.limit({ key, limit, window });
    expect(result.success).toBe(false);

    // Wait for the window to pass
    await new Promise((resolve) => setTimeout(resolve, window + 100));

    // This request should now succeed
    result = await rateLimiter.limit({ key, limit, window });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
