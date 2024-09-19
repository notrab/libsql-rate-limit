import { createClient, Client, Config } from "@libsql/client";

type RateLimitConfig = Partial<Config>;

interface RateLimitOptions {
  key: string;
  limit: number;
  window: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class RateLimiter {
  private client: Client;
  private initialized: boolean = false;

  constructor(config: RateLimitConfig = {}) {
    const url = config.url || process.env.LIBSQL_URL || "file:./rate-limit.db";
    const authToken = config.authToken || process.env.LIBSQL_AUTH_TOKEN;

    this.client = createClient({ url, authToken });
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER,
          reset_at INTEGER
        )
      `);
      this.initialized = true;
    }
  }

  async limit({
    key,
    limit,
    window,
  }: RateLimitOptions): Promise<RateLimitResult> {
    await this.ensureInitialized();

    const now = Date.now();
    const resetAt = now + window;
    let count: number;
    let currentResetAt: number;

    const transaction = await this.client.transaction("write");
    try {
      // Try to update an existing record
      const updateResult = await transaction.execute({
        sql: `UPDATE rate_limits
              SET count = CASE
                WHEN reset_at <= ? THEN 1
                ELSE count + 1
              END,
              reset_at = CASE
                WHEN reset_at <= ? THEN ?
                ELSE reset_at
              END
              WHERE key = ?
              RETURNING count, reset_at`,
        args: [now, now, resetAt, key],
      });
      if (updateResult.rows.length === 0) {
        // If no existing record, insert a new one
        const insertResult = await transaction.execute({
          sql: `INSERT INTO rate_limits (key, count, reset_at)
                VALUES (?, 1, ?)
                RETURNING count, reset_at`,
          args: [key, resetAt],
        });
        count = Number(insertResult.rows[0].count);
        currentResetAt = Number(insertResult.rows[0].reset_at);
      } else {
        count = Number(updateResult.rows[0].count);
        currentResetAt = Number(updateResult.rows[0].reset_at);
      }
      // If all went well, commit the transaction
      await transaction.commit();
    } catch (error) {
      console.error("Error in rate limit operation:", error);
      // Rollback the transaction in case of an error
      await transaction.rollback();
      throw error;
    } finally {
      // Make sure to close the transaction, even if an exception was thrown
      await transaction.close();
    }

    const remaining = Math.max(0, limit - count);
    const reset = Math.max(0, currentResetAt - now);

    return {
      success: count <= limit,
      limit,
      remaining,
      reset,
    };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

const rateLimiter = new RateLimiter();

function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

export {
  RateLimiter,
  rateLimiter,
  createRateLimiter,
  RateLimitConfig,
  RateLimitOptions,
  RateLimitResult,
};
