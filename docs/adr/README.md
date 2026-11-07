# Architecture decision records

An ADR captures a decision that is expensive to reverse, the context in which it
was made, and what we accepted by choosing it. ADRs are immutable: if a decision
changes, write a new ADR that supersedes the old one rather than editing history.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-modular-monolith.md) | Build a modular monolith, not microservices | Accepted |
| [0002](0002-managed-postgres-manual-migrations.md) | Managed PostgreSQL with `validate` and manual SQL | Accepted |
| [0003](0003-stateless-jwt-guest-first.md) | Stateless JWT auth, guest-first booking | Accepted |
| [0004](0004-phone-verified-lookup.md) | Booking and driver access require a phone secret | Accepted |
| [0005](0005-whatsapp-click-to-chat.md) | Free WhatsApp click-to-chat for driver dispatch | Accepted |
| [0006](0006-free-tier-hosting.md) | Render + Vercel + Supabase free tier | Accepted |
| [0007](0007-single-instance-cache-and-limiter.md) | In-process cache and rate limiter | Accepted |
| [0008](0008-live-driver-location.md) | Browser-based live driver location | Accepted |

## Template

```markdown
# ADR NNNN — Title

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** names or roles
- **Related:** links

## Context
What forces are at play? What constraints are real?

## Decision
What we will do, stated in one or two sentences.

## Consequences
### Positive
### Negative
### Neutral

## Alternatives considered
| Alternative | Why not |
|---|---|

## Review trigger
The event that should make us revisit this.
```
