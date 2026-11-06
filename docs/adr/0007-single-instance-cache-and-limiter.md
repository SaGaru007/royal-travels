# ADR 0007 — In-process cache and rate limiter, single instance

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [architecture.md](../architecture.md), [security.md](../security.md)

## Context

Two hot paths need protection:

1. **Fleet reads.** The public catalogue is read on every homepage visit but
   changes a few times a year. Hitting PostgreSQL for every page view is
   wasteful.
2. **Public writes.** Booking creation, lookup, login, and signup accept input
   from anyone on the internet. Without a limit, one client can flood the
   bookings table or brute-force an admin password.

The deployment is a single Render instance. Adding Redis would introduce a paid
dependency or another free-tier service with its own failure modes and latency.

## Decision

1. **Fleet cache:** an immutable in-process snapshot in `VehicleService`, TTL 60
   seconds, invalidated immediately on any admin create/update/delete. The HTTP
   response also sets `Cache-Control: max-age=60`.
2. **Rate limiter:** a dependency-free fixed-window counter in
   `RateLimitFilter`, keyed by client IP + route, with a bounded map and a
   `429` + `Retry-After` contract.
3. Accept that neither spans multiple instances. Document the limitation and the
   migration path.

## Consequences

### Positive

- No extra infrastructure, no network hop, no new credential.
- The cache is correct under concurrent readers: a volatile snapshot reference,
  no locks on the read path.
- Admin writes are visible immediately, so the cache cannot serve a deleted
  vehicle indefinitely.
- The limiter is small, auditable, and easy to reason about.
- The HTTP contract (429, Retry-After, `max-age`) does not change if the
  implementation later moves to Redis or the edge.

### Negative

- Each instance has its own cache and counters.
- The limiter resets on restart.
- `X-Forwarded-For` is trusted; a client can spoof it in theory.
- Memory grows with unique client IPs until the lazy eviction threshold.
- No distributed fairness; one noisy IP is limited per instance.

### Neutral

- The cache is not shared, so a second instance may serve data up to 60 seconds
  stale. That is acceptable for a fleet catalogue.
- The limiter is abuse mitigation, not access control; it is not a security
  boundary.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Redis for cache + limiter | Another service, another credential, more cost |
| Caffeine cache | Good library, but the snapshot is simple enough and avoids a dependency |
| Bucket4j | More features, but still in-process unless backed by Redis |
| CDN-only caching | Does not protect writes; cache invalidation still needed |
| Edge rate limiting (Cloudflare) | Excellent at scale; overkill for one instance |
| No cache / no limiter | Database load and abuse risk for no benefit |

## Review trigger

Implement a shared store when:

- the API runs more than one instance;
- rate limiting must survive restarts or be consistent across regions;
- a distributed cache is needed for another reason;
- abuse is observed from many IPs, where per-IP limiting is insufficient.

The migration should preserve the existing HTTP behaviour: `429`,
`Retry-After`, and `Cache-Control: max-age=60`.
