# ADR 0002 — Managed PostgreSQL, validate-only DDL, manual migrations

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [database.md](../database.md)

## Context

The application stores customer commitments in PostgreSQL. The database is
shared between local development, the E2E suite, and eventually production. The
free tier does not provide a disposable per-developer database, and a mistaken
`ddl-auto=update` could silently alter or drop production data.

The team is small. A migration tool adds a dependency, a baseline step, and a
new failure mode during deploys, but manual SQL adds the risk of drift and
forgotten changes.

## Decision

1. Use managed PostgreSQL on Supabase.
2. Set `spring.jpa.hibernate.ddl-auto=validate`. The application refuses to start
   if entities and schema disagree.
3. Apply schema changes as reviewed, idempotent SQL files under `db/`.
4. Do not introduce Flyway or Liquibase until the schema stabilises and there is
   a CI path to verify migrations.

## Consequences

### Positive

- The application can never silently rewrite a shared database.
- Every schema change is visible in Git and reviewable as SQL.
- Startup catches entity/schema drift immediately.
- No migration-tool learning curve for a solo operator.
- The database remains the source of truth for constraints and indexes.

### Negative

- Deploys are not self-contained; SQL must be applied in the right order.
- No automatic rollback.
- Drift is possible if someone edits the database by hand.
- The E2E/context test needs a real database.

### Neutral

- `db/indexes.sql` and `db/customers.sql` are already idempotent, which is the
  pattern a future migration baseline can reuse.
- The absence of migrations is documented as operational debt, not hidden.

## Alternatives considered

| Alternative | Why not |
|---|---|
| `ddl-auto=update` | Can alter/drop shared production data; no review |
| Flyway now | Extra moving part before the schema stabilises; needs a baseline and CI |
| Liquibase now | Same, with more XML/YAML overhead |
| One database per developer | Free-tier limits and setup cost |

## Review trigger

Adopt Flyway when any of these is true:

- more than one environment must be migrated reliably per release;
- schema changes ship more than once a month;
- a second engineer joins;
- a manual SQL change is forgotten or applied out of order.
