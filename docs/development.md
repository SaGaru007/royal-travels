# Development guide

This guide takes a new contributor from a clean machine to a running local stack
and explains the conventions used in the repository.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| JDK | 21 (LTS) | `java -version` |
| Node.js | 18+ (20 recommended) | `node --version` |
| npm | 9+ (ships with Node) | `npm --version` |
| Git | Any recent | `git --version` |
| PostgreSQL client (optional) | Any recent | `psql --version` |
| Docker Desktop (optional) | Any recent | `docker --version` |

Maven does not need to be installed. The repository includes the Maven Wrapper
(`mvnw`, `mvnw.cmd`), which pins Maven 3.10.

On Windows, use PowerShell. The wrapper is script-only (`distributionType=only-script`),
so no wrapper jar is required.

---

## 2. Get the code

```powershell
git clone https://github.com/SaGaru007/RoyalTravels.git
cd RoyalTravels
```

The backend lives at the repository root. The frontend lives in `frontend/`.

---

## 3. Backend setup

### 3.1 Local configuration

The app reads all secrets from environment variables. For local development it
loads `config/application-local.properties` automatically because the default
profile is `local` and Spring Boot searches the working directory for
`application-local.properties`.

That file is gitignored. Create it with:

```properties
# Supabase session pooler
spring.datasource.url=jdbc:postgresql://<host>:5432/postgres
spring.datasource.username=postgres.<project-ref>
spring.datasource.password=<database-password>

# At least 32 bytes. Generate with: openssl rand -base64 48
app.jwt.secret=<48-random-characters>

# Optional: creates the first owner at startup if the email is absent
app.admin.email=owner@royaltravels.local
app.admin.password=<local-password>

# Optional: comma-separated frontend origins
app.cors.allowed-origins=http://localhost:3000
```

Notes:

- Do not commit this file. `.gitignore` already excludes it.
- `JWT_SECRET` has no default. A missing or short secret fails startup.
- The bootstrap owner is created only when both admin values are set and the
  email does not already exist. Changing the password in this file later does
  **not** change an existing account; use the admin settings page.
- The database schema must already exist. `ddl-auto=validate` will fail on a
  missing table or column. See [database.md](database.md).

### 3.2 Run

```powershell
.\mvnw.cmd spring-boot:run
```

Bash/Git Bash:

```bash
./mvnw spring-boot:run
```

| URL | Purpose |
|---|---|
| `http://localhost:8081/api/health` | Health + database check |
| `http://localhost:8081/api/vehicles` | Public fleet |
| `http://localhost:8081/swagger-ui.html` | Interactive API docs |
| `http://localhost:8081/v3/api-docs` | OpenAPI JSON |

Override the port with `PORT=9090` (PowerShell: `$env:PORT="9090"`).

### 3.3 Seed data

With `psql` installed and `DB_URL` set:

```powershell
psql "$env:DB_URL" -f db/seed_vehicles.sql
psql "$env:DB_URL" -f db/demo_bookings.sql   # demo environments only
```

Or paste the SQL into the Supabase SQL editor. Scripts are idempotent.

### 3.4 Build without running

```powershell
.\mvnw.cmd -DskipTests clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```

The jar includes an embedded Tomcat and serves the same API.

---

## 4. Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

`.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build (also type-checks and lints) |
| `npm start` | Serve the production build |
| `npm run lint` | Next.js lint |

`NEXT_PUBLIC_*` values are inlined at build time. Restart `npm run dev` after
changing `.env.local`, and rebuild for production.

---

## 5. Project structure

```text
src/main/java/com/example/demo/
├── RoyalTravelsApplication.java      entry point
├── SecurityConfig.java               filter chain, CORS, BCrypt
├── JwtService.java                   sign/parse JWTs
├── JwtAuthFilter.java                bearer token → SecurityContext
├── RateLimitFilter.java              public write-route throttling
├── AdminBootstrap.java               first owner creation
├── HealthController.java             health + DB probe
├── Booking.java / BookingRepository.java / BookingService.java / BookingController.java
├── Vehicle.java / VehicleRepository.java / VehicleService.java / VehicleController.java
├── Driver.java / DriverRepository.java / DriverService.java / DriverController.java
├── DriverTripController.java         public driver trip sheet
├── Customer.java / CustomerRepository.java / CustomerService.java / CustomerController.java
├── Admin.java / AdminRepository.java / AdminController.java
├── AuthController.java / AuthService.java
├── dto/                              request/response records
└── exception/GlobalExceptionHandler.java
```

```text
frontend/
├── app/                              routes (App Router)
├── components/                       public and admin components
├── lib/
│   ├── api.ts                        typed API client
│   ├── auth.ts                       admin session
│   ├── customerAuth.ts               customer session
│   ├── bookingSession.ts             last booking cache
│   └── format.ts                     money/date/time/WhatsApp helpers
└── public/                           static assets
```

---

## 6. Conventions

### 6.1 Java

- Package: `com.example.demo` for all application classes, even though Maven
  coordinates are `com.royaltravels:api`.
- One public class per file; constructor injection, no field injection.
- Controllers are thin: map HTTP, validate, delegate, choose status codes.
- Business rules live in services; repositories contain queries only.
- Return DTO records, never entities.
- Prefer `ResponseStatusException` for expected failures; the global handler
  turns it into RFC 7807.
- Use `@Transactional(readOnly = true)` for reads.
- Keep comments for **why**, not **what**. The existing code follows this.

### 6.2 TypeScript / React

- App Router only; no `pages/`.
- Interactive files start with `"use client"`; data fetching happens in the
  browser through `lib/api.ts`.
- One API function per endpoint in `lib/api.ts`; components never call `fetch`
  directly.
- Use the shared `ApiError` for messages and field errors.
- Tailwind utility classes; no separate CSS modules unless a page needs
  something Tailwind cannot express.
- Every icon-only button needs an `aria-label`.
- Wrap `useSearchParams` consumers in `Suspense` (required by the production
  build).
- Format money with `formatMoney`, dates with `formatDate`, times with
  `formatTime`. Do not hand-roll `toLocaleString` in a component.

### 6.3 Naming

| Thing | Convention | Example |
|---|---|---|
| REST paths | plural nouns | `/api/bookings`, `/api/admin/drivers` |
| DB tables/columns | snake_case | `pickup_location`, `trip_stage` |
| Java fields | camelCase | `pickupLocation` |
| DTO records | `XxxRequest` / `XxxResponse` | `BookingRequest` |
| Enum values | lowercase snake | `round-trip` is free text; statuses are `on_trip` |
| React components | PascalCase files | `DriverTripSheet.tsx` |

---

## 7. Common tasks

### 7.1 Add an API endpoint

1. Add the DTO record in `dto/` with Bean Validation.
2. Add the service method and business rules.
3. Add the controller method with `@PreAuthorize` if it is not public.
4. If public, add an explicit matcher in `SecurityConfig`.
5. Add an E2E check in `scripts/e2e-smoke.mjs`.
6. Update [api.md](api.md) and the README endpoint table.
7. Run the build gates.

### 7.2 Add a database column

1. Write an idempotent SQL file in `db/`.
2. Apply it to the development database.
3. Add the field to the entity and the DTO, with the `from(...)` mapping.
4. Update [database.md](database.md).
5. Restart and confirm Hibernate validation passes.
6. Deploy the SQL before the code that needs it.

### 7.3 Add an enum value

Change all of the following in one pull request:

1. Database `CHECK` constraint (SQL file + apply).
2. DTO `@Pattern` (and any service set/constant).
3. TypeScript union in `frontend/lib/api.ts`.
4. Admin dropdown/badge or form control.
5. E2E check.
6. `docs/api.md` and `docs/database.md`.

### 7.4 Add a page

1. Create `frontend/app/<route>/page.tsx`.
2. If it needs state or browser APIs, add `"use client"`.
3. Add an API function in `lib/api.ts` rather than calling `fetch` inline.
4. Add the route to the header/sidebar if it is user-facing.
5. Consider `robots.ts` if the route should not be indexed.
6. Verify with `npm run build`; all routes must pre-render.

### 7.5 Change a rate limit

1. Edit `LIMITS` in `RateLimitFilter`.
2. Update [api.md §1.7](api.md#17-rate-limits), the README, and `AGENTS.md`.
3. Verify with a burst test against a local API.
4. Consider whether the limit is per IP and per instance.

---

## 8. Git workflow

### 8.1 Branches

| Branch | Purpose |
|---|---|
| `main` | Deployable; protected by review and CI |
| `feat/<short-name>` | New feature |
| `fix/<short-name>` | Bug fix |
| `docs/<short-name>` | Documentation only |
| `chore/<short-name>` | Tooling, dependencies |

### 8.2 Commits

Use imperative, scoped messages. Conventional Commits style is preferred:

```text
feat(driver): add trip sheet stage updates
fix(booking): reject duplicate submissions within 10 minutes
docs(deploy): document Render memory tuning
test(e2e): cover driver assignment and password guard
```

One logical change per commit. Do not mix a refactor with a behaviour change.

### 8.3 Pull requests

1. Branch from `main`.
2. Make the change; run the gates.
3. Open a PR using the template.
4. CI must be green.
5. Squash-merge or merge with a clear message.
6. Delete the branch.
7. Render/Vercel deploy automatically from `main`.

If you are the only contributor, still open a PR for non-trivial changes. It
creates a reviewable record and forces the CI gate.

---

## 9. Debugging

| Problem | Check |
|---|---|
| Backend will not start | `JWT_SECRET` missing/short, DB unreachable, schema mismatch |
| `Schema-validation: missing column` | Entity and database disagree; add SQL, don't change `ddl-auto` |
| Frontend cannot reach the API | `NEXT_PUBLIC_API_BASE_URL`, API running, CORS |
| CORS error | `app.cors.allowed-origins` / `CORS_ALLOWED_ORIGINS` exact origin |
| `401` on every admin call | Token expired (8 h) or `JWT_SECRET` changed |
| `403` on admin call | Token is a customer token, or role is wrong |
| `429` while testing | Rate limiter; wait for the window or restart the API (memory limiter) |
| Booking form 400 | Read the `errors` object; validation mirrors the backend |
| Production build fails on `useSearchParams` | Wrap the component in `Suspense` |
| Images do not load | `next.config.mjs` `remotePatterns` allow-list |
| Vercel build compiles the wrong folder | Project Root Directory must be `frontend` |

Useful commands:

```powershell
# Tail backend logs when running via spring-boot:run (console output)
.\mvnw.cmd spring-boot:run

# Check the API by hand
Invoke-RestMethod http://localhost:8081/api/health | ConvertTo-Json

# Find a class or string
Select-String -Path src\**\*.java -Pattern "driverId"
```

---

## 10. Windows notes

- Use `.\mvnw.cmd`, not `mvnw`.
- Use `Copy-Item`, not `cp`, in PowerShell (Git Bash accepts `cp`).
- Environment variables: `$env:NAME="value"` for the current session.
- If a process holds port 8081:

```powershell
Get-NetTCPConnection -LocalPort 8081 | Select-Object OwningProcess
Stop-Process -Id <pid> -Force
```

- If a process holds port 3000, stop the Node process running Next.js.
- Line endings: `.gitattributes` normalises text; do not fight it.

---

## 11. Where to ask

- Architecture and decisions: [architecture.md](architecture.md) and
  [adr/](adr/README.md).
- API contract: [api.md](api.md) and the running Swagger UI.
- Deployment: [deployment.md](deployment.md).
- Security concerns: [SECURITY.md](../SECURITY.md).
- Contribution rules: [CONTRIBUTING.md](../CONTRIBUTING.md).
