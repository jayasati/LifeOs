import "server-only";
import { revalidateTag } from "next/cache";

/**
 * Cross-request cache tag namespaces.
 *
 * `unstable_cache(...)` stores results under one or more tags. Mutating
 * actions call `bumpTag()` to flush every cached entry that wears that tag,
 * forcing the next read to re-query.
 *
 * Cache entries are keyed by `userId` (passed as a keyPart), so per-user
 * isolation is automatic. Tags here are global — calling `bumpTag('analytics')`
 * flushes all users' analytics caches. With short TTLs (60s) and a low-traffic
 * personal app this is the right trade-off vs. the complexity of per-user
 * tags. Refactor to `analytics:<userId>` if multi-tenant scale demands it.
 */
export type CacheNamespace = "analytics" | "tags";

// Next 16 changed revalidateTag's signature to require a cache profile. We
// pass an immediate-expire so the next read is forced to re-query rather than
// honouring whatever stale window the cache was using.
const IMMEDIATE = { expire: 0 } as const;

export function bumpTag(...namespaces: CacheNamespace[]): void {
  for (const ns of namespaces) revalidateTag(ns, IMMEDIATE);
}
