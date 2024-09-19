import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rateLimiter, RateLimitResult } from "libsql-rate-limit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const identifier = req.headers["x-forwarded-for"];

  try {
    const result: RateLimitResult = await rateLimiter.limit({
      key: `ip:${identifier}`,
      limit: 5, // Allow 5 requests
      window: 60000, // Per minute (60000 milliseconds)
    });

    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(Date.now() + result.reset).toUTCString()
    );

    if (!result.success) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(result.reset / 1000)} seconds.`,
      });
    }

    return res.status(200).json({ message: "Hello from the API!" });
  } catch (error) {
    console.error("Rate limiting error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
