# AGENTS.md

Single-module Spring Boot REST API for RoyalTravels (bookings, fleet, admin auth) plus a separate Next.js frontend. Controllers delegate to services; entities are mapped to DTOs at the API boundary.

## Commands

Run from the repo root. This is a Windows/Spring Tool Suite project; use the wrapper:

- `.\mvnw.cmd spring-boot:run` — start the API on **port 8081**. Requires the `local` profile config or env vars (see Configuration).
- `.\mvnw.cmd test` — run all tests. Integration-style: the only test boots the full context against the **live Supabase database**.
- `.\mvnw.cmd -Dtest=RoyalTravelsApplicationTests test` — run the single existing test class.
- `.\mvnw.cmd clean package -DskipTests` — compile/package without connecting to the database.
- `./mvnw ...` works in Git Bash/Linux; the wrapper is script-only (`distributionType=only-script`), so no wrapper jar is needed.

There is no linter, formatter, Checkstyle, or CI config; compilation plus tests are the verification. Java 21 is the target.

## Code layout and conventions

- Java package is `com.example.demo` even though Maven coordinates are `com.royaltravels:api`. Put new classes under `src/main/java/com/example/demo/`.
- Entry point: `RoyalTravelsApplication`. Entities: `Booking`, `Vehicle`, `Admin`. API payloads are records under `dto/`; map entities with the static `from(...)` helpers rather than exposing entities.
- Business logic lives in `service/` (`BookingService`, `VehicleService`, `AuthService`). Controllers stay thin.
- Abuse protection: `RateLimitFilter` throttles `POST /api/auth/login` (10/5min), `POST /api/bookings` (20/10min), `POST /api/bookings/lookup` (60/10min) and `POST /api/driver/trips/lookup` (60/10min) per client IP with `429` + `Retry-After`.
- `VehicleService.listPublic()` serves a 60-second in-process TTL snapshot; admin writes evict it. Public `GET /api/vehicles` also sets `Cache-Control: max-age=60`.
- Performance indexes (trigram GIN for search, composite for list sort) live in `db/indexes.sql` and must be applied manually, like all schema changes.
- API roots:
  - Public: `/api/health`, `/api/auth/login`, `/api/bookings` (POST), `/api/bookings/lookup` (POST), `/api/vehicles`, `/api/driver/trips/lookup` (POST), `/api/driver/trips/{id}/stage` (PATCH).
  - Admin: `/api/bookings` (GET), `/api/bookings/{id}` (GET/PATCH), `/api/admin/vehicles` (CRUD), `/api/admin/drivers` (CRUD), `/api/admin/password` (POST).
- Booking PATCH accepts only `status`, `paymentStatus`, `tripStage`, and `driverId` (empty string unassigns). The allowed values are enforced by `BookingUpdateRequest` patterns (and mirrored in `BookingService`). Extend both when adding values.
- Driver portal is passwordless: the trip reference plus the assigned driver's phone from the `drivers` table authorises the lookup and stage update.
- `Booking.createdAt` uses Hibernate `@CreationTimestamp` so POST responses include it; it is still `updatable = false` and should not be set from application code.
- Errors are returned as RFC 7807 `ProblemDetail` via `exception/GlobalExceptionHandler`.

## Database and configuration

- `src/main/resources/application.properties` reads all connection details from env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `PORT`.
- Local values live in `config/application-local.properties` (gitignored, loaded automatically by Spring Boot from the working directory). `spring.profiles.active` defaults to `local`.
- `application-prod.properties` is activated in containers (`SPRING_PROFILES_ACTIVE=prod`) and only tightens error output; datasource values still come from env.
- `spring.jpa.hibernate.ddl-auto=validate` and there are **no migrations** (no Flyway/Liquibase). Entity changes fail at startup until the shared database schema is altered manually. Do not change `ddl-auto` to `update`/`create` against this database.
- Tests are not isolated and use the same remote database; avoid tests that assume a clean schema or that mutate production-like data.
- `JWT_SECRET` has no default, so startup fails without it. jjwt HMAC requires at least 32 bytes (32 ASCII characters); a shorter value fails too.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are optional. When both are set, `AdminBootstrap` creates a single `owner` admin at startup if that email does not already exist (case-insensitive).
- CORS defaults to `http://localhost:3000`; set `CORS_ALLOWED_ORIGINS` to a comma-separated list for deployed frontends.
- `db/seed_vehicles.sql` seeds six demo vehicles idempotently by plate number.

## Security map

Stateless JWT via `JwtAuthFilter`, CSRF disabled. Public endpoints:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/bookings`
- `POST /api/bookings/lookup` (requires booking UUID **and** phone number)
- `POST /api/driver/trips/lookup` and `PATCH /api/driver/trips/{id}/stage` (require booking UUID **and** the assigned driver's phone)
- `GET /api/vehicles` and `GET /api/vehicles/{id}` (active vehicles only)

Everything else requires `Authorization: Bearer <token>` — notably `GET /api/bookings`, `GET/PATCH /api/bookings/{id}`, and all vehicle writes. Add explicit matchers in `SecurityConfig` for any new public route.

JWT roles are stored lowercase (`owner`, `staff`) and converted to `ROLE_<UPPERCASE>` authorities. Admin controllers enforce `hasAnyRole('OWNER','STAFF')` with `@PreAuthorize`.

## Frontend

The Next.js app lives outside this repo (typically `C:\Users\sagar\Downloads\royal-travels-nextjs\royal-travels`). It talks to this API using `NEXT_PUBLIC_API_BASE_URL`, stores the admin JWT in `sessionStorage`, and requires the booking phone number for confirmation/tracking. See that project's `README.md`.

## Test dependency quirk

This project uses Spring Boot 4's per-module test starters (`spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, etc.) rather than the legacy single `spring-boot-starter-test`. Follow the existing `pom.xml` pattern when adding test support.
