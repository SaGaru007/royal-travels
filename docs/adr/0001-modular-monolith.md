# ADR 0001 — Modular monolith over microservices

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [architecture.md](../architecture.md)

## Context

RoyalTravels has one bounded domain: a booking moves from request to dispatch to
trip completion. The same booking row is read and written by the public site,
the admin console, and the driver trip sheet. The team is one engineer. The
deployment target is a single free container and one managed database.

A microservice split would introduce at least three services (bookings,
fleet/drivers, identity), a message bus or synchronous calls between them, and
distributed failure modes. None of those would be exercised by the current load.

## Decision

Build a **modular monolith**: one Spring Boot application with clear internal
modules (booking, fleet, drivers, customers, auth), one database, one deployment
unit. Enforce module boundaries through packages and service interfaces, not
network calls.

## Consequences

### Positive

- One deploy, one log stream, one health check, one database transaction.
- Booking → driver assignment → stage update is a local transaction, not a saga.
- Local development is one command plus one frontend command.
- Free-tier hosting is sufficient.
- Refactoring module boundaries is cheap while the domain is still being learned.

### Negative

- Independent scaling of one module is not possible.
- A memory leak or crash takes down every feature at once.
- The codebase can drift into a ball of mud without discipline.
- A future split requires extracting data and contracts.

### Neutral

- The package structure already separates concerns, so extraction is possible
  later.
- The API is the natural seam if a service ever needs to be split.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Microservices from day one | Distributed transactions, extra infra, no scaling need |
| Serverless functions per endpoint | Cold starts, connection pooling pain, weaker transaction story |
| Modular monolith with separate deployables per module | More operational work for no current benefit |

## Review trigger

Revisit when a single module needs independent scaling or a separate release
cadence, or when a second team owns a module and deployment contention is real.
