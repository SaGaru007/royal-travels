# ADR 0003 — Stateless JWT authentication, guest-first booking

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [security.md](../security.md), [api.md](../api.md)

## Context

The public site and the admin console are separate origins in production. The
API must serve browser clients without a server-side session store on a free
tier. Customers should be able to book without creating an account; requiring
signup is a known conversion killer for taxi bookings.

Two roles are enough for operations: `owner` and `staff`. Customers are a third,
separate principal.

## Decision

1. Authenticate admins and customers with **stateless HMAC JWTs**, expiry 8
   hours, role claim stored lowercase and mapped to Spring authorities.
2. Keep **guest checkout** as the default path. Accounts are optional.
3. Do not use server-side sessions, refresh tokens, or cookies.
4. Disable CSRF because the token is sent explicitly in an `Authorization`
   header, not automatically by the browser.

## Consequences

### Positive

- The API can restart or scale horizontally without losing sessions.
- No session table, no sticky sessions, no cookie configuration across origins.
- Guest booking stays frictionless; accounts are an upgrade, not a gate.
- Role checks are simple and auditable in `SecurityConfig` and
  `@PreAuthorize`.

### Negative

- A token cannot be revoked individually before expiry (8 hours).
- The admin token lives in `sessionStorage`, so an XSS bug could steal it.
- Rotating `JWT_SECRET` signs everyone out.
- There is no refresh flow; users sign in again after 8 hours.
- Customer booking history is linked by phone number, not a foreign key, because
  guest bookings predate accounts.

### Neutral

- `sessionStorage` clears on tab close, limiting exposure compared with
  `localStorage`.
- Moving to `HttpOnly` cookies later is possible but requires CSRF protection and
  a same-site deployment or BFF.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Server sessions in Postgres | Extra table, cleanup, sticky sessions, slower |
| Cookies + `HttpOnly` | Needs CSRF and cross-site cookie work; separate origins make it harder |
| OAuth/Google login | Adds a provider and consent flow before there is demand |
| Mandatory accounts | Loses guest bookings; contradicts the product principle |

## Review trigger

Revisit when any of these is true:

- more than two admins, or a suspected token theft;
- a security review flags `sessionStorage` as unacceptable;
- the frontend and API move to the same parent domain, making cookies practical;
- customers ask for "stay signed in" across devices.
