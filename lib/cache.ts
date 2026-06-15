import { Redis } from "@upstash/redis"

/**
 * Read-through cache backed by Upstash Redis.
 *
 * Design notes:
 * - Caching is only active when the Upstash env vars are configured. In local
 *   development you can leave them unset and every read goes straight to the DB,
 *   so behavior is identical to having no cache at all.
 * - Unlike `lib/rate-limit.ts`, caching FAILS OPEN: if Redis is unset or has a
 *   transient error we simply hit the database. A cache outage must never take
 *   the app down, so we never throw here (not even in production).
 * - Invalidation is tag-based: every cached key registers itself under one or
 *   more tags. A mutation busts a tag, which deletes all keys registered under
 *   it. This is the primary consistency mechanism; TTL is only a safety net.
 *
 * IMPORTANT: cache keys are tenant-scoped. Always build keys via
 * `lib/cache-keys.ts` so that `school_id` (and `userId`/`studentId` for personal
 * data) is part of every key — never serve one school's data to another.
 */

const isCacheEnabled =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

// Caching is a performance optimization, not a security control. If the env vars
// are missing in production we log loudly but keep serving from the DB rather
// than refusing to start (the opposite of the rate limiter's fail-closed stance).
if (!isCacheEnabled && process.env.NODE_ENV === "production") {
  console.warn(
    "[cache] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
      "caching is DISABLED in production. All reads will hit the database.",
  )
}

const redis: Redis | null = isCacheEnabled
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Tag sets self-expire as a safety valve so a missed invalidation can't leak
// member references forever. Individual cached values expire on their own TTL.
const TAG_TTL_SECONDS = 60 * 60 * 24 // 24h

export interface CacheOptions {
  /** Time-to-live in seconds (safety fallback; invalidation is primary). */
  ttl: number
  /** Tags this key belongs to, used for event-driven invalidation. */
  tags?: string[]
}

/**
 * Read-through cache. Returns the cached value if present; otherwise runs
 * `fetcher`, stores the result with the given TTL, registers the key under each
 * tag, and returns it. Any Redis failure falls back to `fetcher` (fail-open).
 *
 * @example
 *   return cached(
 *     cacheKeys.schoolStats(schoolId),
 *     { ttl: 600, tags: [cacheTags.schoolStats(schoolId)] },
 *     async () => { ...existing query... },
 *   )
 */
export async function cached<T>(
  key: string,
  opts: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher()

  try {
    const hit = await redis.get<T>(key)
    // Upstash auto-deserializes JSON. `null`/`undefined` means a miss; a cached
    // value that is genuinely `null` is stored as the string "null" by callers
    // returning objects/arrays, which we never do for these reads.
    if (hit !== null && hit !== undefined) return hit
  } catch (err) {
    console.error("[cache] get failed, bypassing cache:", err)
    return fetcher()
  }

  const value = await fetcher()

  // Don't cache empty results (not-found). Avoids storing `null` (which some
  // Redis clients reject) and means a record appearing later isn't masked by a
  // cached miss.
  if (value === null || value === undefined) return value

  try {
    const pipeline = redis.pipeline()
    pipeline.set(key, value, { ex: opts.ttl })
    for (const tag of opts.tags ?? []) {
      pipeline.sadd(tag, key)
      pipeline.expire(tag, TAG_TTL_SECONDS)
    }
    await pipeline.exec()
  } catch (err) {
    // Failing to populate the cache is non-fatal — we already have the value.
    console.error("[cache] set failed:", err)
  }

  return value
}

/**
 * Event-driven invalidation. Deletes every key registered under each given tag,
 * then deletes the tag set itself. Call this AFTER a successful DB write, inside
 * the same service/route try-block.
 */
export async function invalidateTags(...tags: string[]): Promise<void> {
  if (!redis || tags.length === 0) return
  try {
    for (const tag of tags) {
      const members = await redis.smembers(tag)
      const pipeline = redis.pipeline()
      if (members.length > 0) pipeline.del(...members)
      pipeline.del(tag)
      await pipeline.exec()
    }
  } catch (err) {
    console.error("[cache] invalidateTags failed:", err)
  }
}

/** Direct key invalidation (rarely needed; prefer tag-based invalidation). */
export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (err) {
    console.error("[cache] invalidateKeys failed:", err)
  }
}
