import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

// Rate limiting is only active when Upstash env vars are configured.
// In local development, leave these unset and all requests pass through freely.
const isRateLimitEnabled =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (isRateLimitEnabled) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

function createLimiter(config: ConstructorParameters<typeof Ratelimit>[0]): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit(config)
}

/**
 * Auth limiter — login and password reset.
 * 5 requests per 15-minute sliding window, IP-based.
 * Sliding window prevents burst-at-boundary attacks.
 */
export const authLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:auth",
})

/**
 * Public limiter — contact form (unauthenticated).
 * 5 requests per hour, IP-based.
 */
export const publicLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.fixedWindow(5, "60 m"),
  prefix: "rl:public",
})

/**
 * Upload/import limiter — Cloudinary uploads and CSV bulk imports.
 * 5 requests per hour, userId-based.
 * These are expensive both in server CPU and third-party quota.
 */
export const uploadImportLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.fixedWindow(5, "60 m"),
  prefix: "rl:upload",
})

/**
 * Write limiter — standard data mutations for authenticated users.
 * 30 requests per 60-second sliding window, userId-based.
 */
export const writeLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "rl:write",
})

/**
 * Super admin write limiter — platform-level mutations (create/delete schools, subscriptions).
 * 20 requests per hour, userId-based.
 * These are rare legitimate operations; low limits are safe.
 */
export const superAdminWriteLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.fixedWindow(20, "60 m"),
  prefix: "rl:sa-write",
})

/**
 * Expensive read limiter — large list queries and cross-school aggregations.
 * 100 requests per 60-second sliding window, userId-based.
 */
export const expensiveReadLimiter = createLimiter({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  prefix: "rl:read",
})

/**
 * Extracts the real client IP from the request headers.
 * On Vercel, x-forwarded-for is always set and the first entry is the original client IP.
 */
export function getIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/**
 * Checks the rate limit for a given identifier.
 *
 * @param limiter - The Ratelimit instance to use (one of the exports above)
 * @param identifier - A namespaced key, e.g. `auth:${ip}` or `write:${userId}`
 * @returns A 429 NextResponse if the limit is exceeded, or null if the request is allowed.
 *
 * Usage in route handlers (authenticated routes):
 *   const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
 *   if (limited) return limited
 *
 * Usage in middleware (unauthenticated routes):
 *   const ip = getIp(req)
 *   const limited = await checkRateLimit(authLimiter, `auth:${ip}`)
 *   if (limited) return limited
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  // Rate limiting disabled in development (no Upstash env vars configured)
  if (!isRateLimitEnabled || !limiter) return null

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000))
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      }
    )
  }

  return null
}
