# RoyalTravels — Documentation

This directory is the source of truth for how RoyalTravels is designed, built,
deployed, and operated. It is written for the people who have to run the
platform after handover, not only for the person who wrote it.

**Product:** RoyalTravels — booking and fleet operations platform for a cab and
travel agency.
**Owner:** RoyalTravels (repository owner)
**Version:** 1.0
**Last reviewed:** 2026-11-06

---

## Where to start

| I want to… | Read |
|---|---|
| Understand what the product does and who it is for | [Product overview](product.md) |
| Understand how the system is put together | [Architecture](architecture.md) |
| Call or integrate with the API | [API reference](api.md) |
| Understand the schema or change the database | [Database](database.md) |
| Deploy the platform | [Deployment runbook](deployment.md) |
| Run the platform day to day, or handle an incident | [Operations runbook](operations.md) |
| Review security controls and known risks | [Security](security.md) |
| Run or extend the test suite | [Testing](testing.md) |
| Set up a development machine and contribute | [Development guide](development.md) |
| See what is planned and what is intentionally out of scope | [Roadmap](roadmap.md) |
| Understand why a technical choice was made | [Architecture decision records](adr/README.md) |

If you have five minutes, read the [product overview](product.md) and the
[architecture](architecture.md) summary. If you are deploying, follow
[deployment.md](deployment.md) top to bottom.

---

## Document map

| Document | Audience | Maintained by |
|---|---|---|
| [product.md](product.md) | Everyone, stakeholders | Product owner |
| [architecture.md](architecture.md) | Engineers | Backend lead |
| [api.md](api.md) | Frontend, integrators, QA | Backend lead |
| [database.md](database.md) | Backend, data owners | Backend lead |
| [deployment.md](deployment.md) | Whoever ships a release | Release owner |
| [operations.md](operations.md) | On-call, support | Operations |
| [security.md](security.md) | Engineers, reviewers, auditors | Security owner |
| [testing.md](testing.md) | Engineers, QA | QA / backend lead |
| [development.md](development.md) | New contributors | Engineering |
| [roadmap.md](roadmap.md) | Everyone | Product owner |
| [adr/](adr/README.md) | Engineers, reviewers | Decision author |

---

## Repository layout

```text
RoyalTravels/
├── src/main/java/com/example/demo/   Spring Boot API (controllers, services, entities, DTOs)
├── src/main/resources/               application.properties, prod profile
├── src/test/java/                    Context-load test (requires the live database)
├── config/                           Local-only secrets (gitignored)
├── db/                               Manual SQL: schema add-ons, indexes, seed data
├── scripts/                          E2E smoke suite and test-data cleanup
├── frontend/                         Next.js 14 App Router application
├── docs/                             This documentation set
├── .github/                          CI workflow, PR and issue templates
├── Dockerfile                        Multi-stage production image
├── render.yaml                       Render Blueprint (Infrastructure as Code)
├── DEPLOYMENT.md                     Short deployment quickstart
├── CONTRIBUTING.md                   Contribution workflow
├── SECURITY.md                       Vulnerability disclosure policy
├── CHANGELOG.md                      Release history
└── README.md                         Project entry point
```

---

## Documentation conventions

- **Paths** are repository-relative unless stated otherwise.
- **Commands** use Windows PowerShell syntax by default because that is the
  primary development environment. Bash equivalents are shown where they differ.
- **Environment variables** are written in `UPPER_SNAKE_CASE` and are never
  given real production values in this repository.
- **HTTP examples** omit the `Authorization` header where it is obvious; it is
  always `Authorization: Bearer <token>`.
- **Status** of a feature is stated explicitly: *implemented*, *manual
  workaround*, *out of scope*, or *planned*. The project does not describe
  unimplemented features as if they exist.
- **Screenshots** are intentionally avoided in this directory; UI copy and route
  names are stable, screenshots are not.

## Keeping the documentation current

Documentation is part of the definition of done for any change that affects:

- a public or admin API route, request/response field, or error code;
- an environment variable or deployment step;
- the database schema, index, or constraint;
- a security control or a known risk;
- an operational procedure.

When you change one of those, update the relevant document in the same pull
request. If a document and the code disagree, the code is the current behaviour
and the document is a bug — fix it.

## Getting help

- Bugs and feature requests: open a GitHub issue using the templates in
  `.github/ISSUE_TEMPLATE/`.
- Security issues: do **not** open a public issue. Follow
  [SECURITY.md](../SECURITY.md).
- Operational incidents: follow [operations.md](operations.md) and record the
  outcome in the incident log.
