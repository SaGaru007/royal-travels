# ADR 0006 — Free-tier hosting: Render + Vercel + Supabase

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [deployment.md](../deployment.md)

## Context

The platform must run a real business pilot with **no recurring infrastructure
cost** while the owner validates demand. It also has to be presentable as a
professional deployment, not a localhost demo.

The stack is a Dockerised Spring Boot API, a Next.js frontend, and PostgreSQL.
Each has a usable free tier, but each free tier has a sharp edge:

- Render free sleeps after ~15 minutes and offers 512 MB RAM / 0.1 CPU.
- Vercel Hobby is for non-commercial use.
- Supabase free is 500 MB with limited backups and pauses after inactivity.

## Decision

Deploy on:

| Piece | Provider |
|---|---|
| API | Render Free Web Service (Docker, Singapore) |
| Frontend | Vercel Hobby |
| Database | Supabase Free PostgreSQL |
| Uptime | cron-job.org health ping every 10 minutes |

Keep the deployment portable: standard Dockerfile, environment variables, no
provider-specific SDKs, no proprietary database features. Document the paid
upgrade path and the Vercel commercial-use caveat.

## Consequences

### Positive

- ₹0 recurring cost for a pilot.
- Infrastructure as Code via `render.yaml`.
- Automatic deploys from `main`.
- Managed database backups, TLS, and connection pooling included.
- The same Docker image runs on any container host.

### Negative

- Cold starts of 30–90 seconds after idle.
- 512 MB RAM requires JVM heap tuning.
- Free-tier resource limits and provider pauses.
- Vercel Hobby is not licensed for commercial use.
- No guaranteed uptime or support SLA.
- Limited backup retention.

### Neutral

- The health endpoint is designed to keep both the API and database warm.
- A paid upgrade is a configuration change, not a rewrite.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Railway / Fly.io | Trial credits expire; less predictable free tier |
| Cloudflare Pages + Workers | Workers cannot run a Spring Boot JVM |
| AWS/GCP free tier | 12-month expiry, complex IAM, billing risk |
| VPS | Cheapest paid option, but patching and TLS become the owner's job |
| Self-hosted Postgres | Backup and uptime become the owner's job |

## Review trigger

Move to paid hosting when any of these is true:

- cold starts cause lost bookings during business hours;
- RAM restarts persist after heap tuning;
- the business is commercial and Vercel Hobby is no longer appropriate;
- the database approaches 350 MB or backups become a compliance requirement.
