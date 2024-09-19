# Rate Limit SDK

Just playing...

## Install

Install the package using npm:

```bash
npm install libsql-rate-limit
```

## Usage

```typescript
import { rateLimiter } from "libsql-rate-limit";

async function exampleUsage() {
  try {
    const result = await rateLimiter.limit({
      key: "user-123", // Unique identifier for the rate limit
      limit: 5, // Maximum number of requests allowed
      window: 60000, // Time window in milliseconds (60 seconds in this case)
    });

    if (result.success) {
      console.log("Request allowed");
      console.log(`Remaining requests: ${result.remaining}`);
    } else {
      console.log("Rate limit exceeded");
      console.log(`Try again in ${result.reset} ms`);
    }
  } catch (error) {
    console.error("Rate limiting error:", error);
  }
}

exampleUsage();
```

### Custom Configuration

If you need to use a custom configuration, you can create a new rate limiter instance:

```typescript
import { createRateLimiter } from "libsql-rate-limit";

const customRateLimiter = createRateLimiter({
  url: "libsql://your-database.turso.io",
  authToken: "your-auth-token",
});

// Use customRateLimiter.limit() as in the basic usage example
```

## Configuration

The SDK can be configured using environment variables or by passing a configuration object to `createRateLimiter`.

### Environment Variables

- `LIBSQL_URL`: The URL of your libSQL database (e.g., `libsql://your-database.turso.io` or `file:./your-local.db`)
- `LIBSQL_AUTH_TOKEN`: The authentication token for your libSQL database (if using a remote db)

If no environment variables are detected, the SDK defaults to using a local SQLite file at `./rate-limit.db`.

### Configuration Object

When using `createRateLimiter`, you can pass a configuration object that includes any of the properties from the `Config` interface of `@libsql/client`. The most commonly used properties are:

```typescript
interface RateLimitConfig {
  url?: string;
  authToken?: string;
  // Other properties from @libsql/client's Config interface can be included as needed
}
```

If `url` is not provided in the config or environment variables, it defaults to `'file:./rate-limit.db'`.

## API

### `rateLimiter.limit(options: RateLimitOptions)`

Check and update the rate limit for a given key.

- `options.key`: Unique identifier for the rate limit
- `options.limit`: Maximum number of requests allowed
- `options.window`: Time window in milliseconds

Returns a `Promise<RateLimitResult>`:

```typescript
interface RateLimitResult {
  success: boolean; // Whether the request is allowed
  limit: number; // The maximum number of requests allowed
  remaining: number; // The number of requests remaining in the current window
  reset: number; // The number of milliseconds until the limit resets
}
```

### `createRateLimiter(config: RateLimitConfig)`

Create a new RateLimiter instance with custom configuration.
