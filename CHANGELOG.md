# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Company-style documentation set under `docs/`: product overview, architecture,
  API reference, database guide, deployment runbook, operations runbook,
  security model, testing guide, development guide, roadmap, and seven ADRs.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, and
  `.env.example`.
- GitHub pull request and issue templates.
- Dependabot configuration for Maven, npm, GitHub Actions, and Docker.
- `scripts/cleanup-test-data.sql` for rows created by the E2E suite.

### Changed

- README now links the documentation set and no longer claims unverified live
  URLs.
- `DEPLOYMENT.md` is a short quickstart that points to the detailed runbook.
- Frontend README reflects the implemented driver trip sheet and admin features.
- `render.yaml` sets a JVM heap percentage suited to the 512 MB free instance.

---

## [1.0.0] — 2026-11-06

The first complete release: a public booking site, an admin dispatch console, and
a driver trip sheet, deployed as a single Spring Boot API plus a Next.js frontend
on Supabase PostgreSQL.

### Added

**Public site**

- Service-aware booking form for outstation, local, airport, and callback trips.
- Server-side validation and business rules with field-mapped errors.
- Duplicate-submission guard: identical guest, phone, service, and pickup
  date/time within 10 minutes returns the original reference.
- Confirmation and tracking by booking UUID plus phone number.
- Tracking page refreshes every 30 seconds.
- Live fleet catalogue with category and capacity filters.
- Optional customer accounts (email + password), booking history, guest checkout
  retained, and guest bookings linked by phone.

**Admin console**

- JWT login with `owner` and `staff` roles.
- Paginated booking list, status/search filters, CSV export, and pipeline stats.
- Status, payment, and trip-stage updates.
- Driver roster: add, edit, remove, vehicle link, licence flag, availability.
- Assign or unassign a driver directly on a booking.
- One-click WhatsApp trip handoff to the assigned driver, including a trip-sheet
  link.
- Fleet CRUD with active/maintenance/inactive status.
- Analytics derived from real bookings and fleet data.
- Self-service password change with current-password confirmation.

**Driver**

- Passwordless trip sheet at `/driver/trip`, authorised by booking reference and
  the assigned driver's phone.
- Guest call and WhatsApp links, Google Maps route, and start/complete actions.
- Completion updates the booking, the driver's availability, and the completed
  trip count.

**Platform**

- Spring Boot 4.1.1 API on Java 21 with layered architecture and DTO records.
- RFC 7807 error responses via a global exception handler.
- MySQL-free, Supabase PostgreSQL with `ddl-auto=validate`.
- OpenAPI 3.1 contract and Swagger UI.
- Per-IP fixed-window rate limiting on public write routes.
- 60-second in-process fleet cache with write-through invalidation and
  `Cache-Control: max-age=60`.
- Composite and trigram GIN indexes for admin search and sorting.
- Database-aware health endpoint.
- CORS allow-list, stateless security, BCrypt password hashing.
- Multi-stage Docker image, Render Blueprint, and Vercel-ready frontend.
- 43-check E2E smoke suite.
- GitHub Actions CI for the backend package and frontend build.
- Global error boundary, custom 404, responsive mobile navigation, and 12-hour
  AM/PM time selection.

### Security

- Public booking lookup requires UUID and phone; wrong phone and missing booking
  return the same `404`.
- Customer and driver access are scoped to the requesting principal.
- Admin routes are private by default; public routes are an explicit allow-list.
- No account enumeration on login.
- Server-owned booking fields cannot be set by public requests.
- Production profile suppresses error messages and binding details.

### Known limitations

- No online payments; fares and payment are handled offline.
- No live GPS.
- No automated email/SMS/WhatsApp notifications.
- No schema migration tool; SQL is applied manually.
- No unit or Testcontainers test suite; the E2E suite requires a running API.
- Rate limiter and cache are per instance.
- Legal pages (privacy, terms, refunds) are not part of this release.

[Unreleased]: https://github.com/SaGaru007/RoyalTravels/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/SaGaru007/RoyalTravels/releases/tag/v1.0.0
