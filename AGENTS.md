# AGENTS.md

Single-module Spring Boot REST API for RoyalTravels (bookings, fleet, drivers, customers, admin auth) plus the Next.js frontend in `frontend/`. Controllers delegate to services; entities are mapped to DTOs at the API boundary.

## Documentation

`docs/` is the source of truth for architecture, API, database, deployment, operations, security, testing, and decisions. Read `docs/README.md` first; update the relevant document in the same pull request as the code.

## Commands

Run from the repo root. This is a Windows/Spring Tool Suite project; use the wrapper:

- `.\mvnw.cmd spring-boot:run` — start the API on **port 8081**. Requires the `local` profile config or env vars (see Configuration).
- `.\mvnw.cmd test` — run all tests. Integration-style: the only test boots the full context against the **live Supabase database**.
- `.\mvnw.cmd -Dtest=RoyalTravelsApplicationTests test` — run the single existing test class.
- `.\mvnw.cmd clean package -DskipTests` — compile/package without connecting to the database.
- `./mvnw ...` works in Git Bash/Linux; the wrapper is script-only (`distributionType=only-script`), so no wrapper jar is needed.
- Frontend: `cd frontend; npm install; npm run dev` (port 3000), `npx tsc --noEmit`, `npm run build`.
- E2E: `node scripts/e2e-smoke.mjs` with `API_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. It inserts test rows; clean up with `scripts/cleanup-test-data.sql`.

CI (`.github/workflows/ci.yml`) runs `./mvnw -B -DskipTests package` and the frontend production build on every push/PR. It does not run database tests. Java 21 is the target.

## Code layout and conventions

- Java package is `com.example.demo` even though Maven coordinates are `com.royaltravels:api`. Put new classes under `src/main/java/com/example/demo/`.
- Entry point: `RoyalTravelsApplication`. Entities: `Booking`, `Vehicle`, `Driver`, `Customer`, `Admin`. API payloads are records under `dto/`; map entities with the static `from(...)` helpers rather than exposing entities.
- Business logic lives in `service/` (`BookingService`, `VehicleService`, `DriverService`, `CustomerService`, `AuthService`). Controllers stay thin.
- Abuse protection: `RateLimitFilter` throttles `POST /api/auth/login` (10/5min), `POST /api/auth/customer/login` (10/5min), `POST /api/auth/customer/signup` (5/hour), `POST /api/bookings` (20/10min), `POST /api/bookings/lookup` (60/10min), `POST /api/driver/trips/lookup` (60/10min) and `POST /api/driver/trips/*/location` (90/10min) per client IP with `429` + `Retry-After`.
- `VehicleService.listPublic()` serves a 60-second in-process TTL snapshot; admin writes evict it. Public `GET /api/vehicles` also sets `Cache-Control: max-age=60`.
- Performance indexes (trigram GIN for search, composite for list sort) live in `db/indexes.sql` and must be applied manually, like all schema changes.
- API roots:
  - Public: `/api/health`, `/api/auth/login`, `/api/auth/customer/signup`, `/api/auth/customer/login`, `/api/bookings` (POST), `/api/bookings/lookup` (POST), `/api/vehicles`, `/api/driver/trips/lookup` (POST), `/api/driver/trips/{id}/stage` (PATCH), `/api/driver/trips/{id}/location` (POST).
  - Customer: `/api/customer/me`, `/api/customer/bookings` (GET, `ROLE_CUSTOMER`).
  - Admin: `/api/bookings` (GET), `/api/bookings/{id}` (GET/PATCH), `/api/admin/vehicles` (CRUD), `/api/admin/drivers` (CRUD), `/api/admin/password` (POST).
- Booking PATCH accepts only `status`, `paymentStatus`, `tripStage`, and `driverId` (empty string unassigns). The allowed values are enforced by `BookingUpdateRequest` patterns (and mirrored in `BookingService`). Extend both when adding values.
- Driver portal is passwordless: the trip reference plus the assigned driver's phone from the `drivers` table authorises the lookup and stage update.
- `Booking.createdAt` uses Hibernate `@CreationTimestamp` so POST responses include it; it is still `updatable = false` and should not be set from application code.
- Errors are returned as RFC 7807 `ProblemDetail` via `exception/GlobalExceptionHandler`.
- Comments explain why, not what. Keep the existing style.

## Database and configuration

- `src/main/resources/application.properties` reads all connection details from env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `PORT`.
- Local values live in `config/application-local.properties` (gitignored, loaded automatically by Spring Boot from the working directory). `spring.profiles.active` defaults to `local`.
- `application-prod.properties` is activated in containers (`SPRING_PROFILES_ACTIVE=prod`) and only tightens error output; datasource values still come from env.
- `spring.jpa.hibernate.ddl-auto=validate` and there are **no migrations** (no Flyway/Liquibase). Entity changes fail at startup until the shared database schema is altered manually. Do not change `ddl-auto` to `update`/`create` against this database.
- Tests are not isolated and use the same remote database; avoid tests that assume a clean schema or that mutate production-like data.
- `JWT_SECRET` has no default, so startup fails without it. jjwt HMAC requires at least 32 bytes (32 ASCII characters); a shorter value fails too. Tokens expire after 8 hours.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are optional. When both are set, `AdminBootstrap` creates a single `owner` admin at startup if that email does not already exist (case-insensitive). Changing them later does not reset an existing password.
- CORS defaults to `http://localhost:3000`; set `CORS_ALLOWED_ORIGINS` to a comma-separated list for deployed frontends. Exact origins, no trailing slash.
- `db/seed_vehicles.sql` seeds six demo vehicles idempotently by plate number. `db/customers.sql` creates the customers table/indexes. `db/indexes.sql` adds performance indexes. `db/demo_bookings.sql` is demo-only.

## Security map

Stateless JWT via `JwtAuthFilter`, CSRF disabled. Public endpoints:

- `GET /api/health`
- `POST /api/auth/login`, `POST /api/auth/customer/signup`, `POST /api/auth/customer/login`
- `POST /api/bookings`
- `POST /api/bookings/lookup` (requires booking UUID **and** phone number)
- `POST /api/driver/trips/lookup` and `PATCH /api/driver/trips/{id}/stage` (require booking UUID **and** the assigned driver's phone)
- `GET /api/vehicles` and `GET /api/vehicles/{id}` (active vehicles only)
- `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs/**`

Everything else requires `Authorization: Bearer <token>` — notably `GET /api/bookings`, `GET/PATCH /api/bookings/{id}`, and all vehicle/driver writes. Add explicit matchers in `SecurityConfig` for any new public route.

JWT roles are stored lowercase (`owner`, `staff`, `customer`) and converted to `ROLE_<UPPERCASE>` authorities. Admin controllers enforce `hasAnyRole('OWNER','STAFF')` with `@PreAuthorize`; customer controllers use `hasRole('CUSTOMER')`.

## Frontend

The Next.js app lives in `frontend/` in this repo (root directory `frontend` on Vercel). It talks to this API via `NEXT_PUBLIC_API_BASE_URL`, stores admin/customer JWTs in `sessionStorage`, and requires the booking phone number for confirmation/tracking. Routes: `/`, `/fleet`, `/confirmation`, `/track`, `/account/*`, `/admin/*` (bookings, fleet, drivers, analytics, settings), `/driver/login`, `/driver/trip`. See `frontend/README.md`.

## Test dependency quirk

This project uses Spring Boot 4's per-module test starters (`spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, etc.) rather than the legacy single `spring-boot-starter-test`. Follow the existing `pom.xml` pattern when adding test support.
