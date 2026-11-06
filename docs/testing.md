# Testing

## 1. Strategy

The project optimises for **confidence per minute of maintenance**, not for a
large test count. The test portfolio is intentionally small:

| Layer | What exists | Runs where |
|---|---|---|
| Build gates | Backend package, TypeScript check, Next.js production build | Local + CI |
| Context test | Spring context boots against the live database | Local, manually |
| End-to-end smoke | 43 HTTP checks across public, admin, driver, customer | Local or staging |
| Manual QA | Browser, mobile, WhatsApp, Maps | Before a release |

There is no unit-test suite yet. That is a known gap, listed in
[roadmap.md](roadmap.md), not an accident.

Why this shape: the application's risk is concentrated in HTTP contracts,
authorization boundaries, and database constraints. An end-to-end suite that
exercises the real Spring context and the real Postgres schema catches those
failures better than isolated mocks would. The trade-off is speed and the need
for a database.

---

## 2. Build gates

Run these before every pull request and before every deploy.

### 2.1 Backend

```powershell
.\mvnw.cmd -DskipTests clean package
```

This compiles all Java, runs the annotation processors, and produces
`target/api-0.0.1-SNAPSHOT.jar`. It does **not** need the database because tests
are skipped.

To boot the context test against the configured database:

```powershell
.\mvnw.cmd test
```

`RoyalTravelsApplicationTests` loads the full Spring context, which means:

- Hibernate validates every entity against the live schema.
- Spring Security and the filter chain initialise.
- A missing environment variable (`JWT_SECRET`) fails the test.

It is an integration test in disguise. It uses the same remote Supabase database
as development, so never run it against production data with destructive
expectations. It performs no writes.

### 2.2 Frontend

```powershell
cd frontend
npx tsc --noEmit
npm run build
```

`next build` also runs type checking and linting, and it exercises static
generation for all 20 routes. A page that calls `useSearchParams` without a
`Suspense` boundary fails here rather than in production.

### 2.3 CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push and
pull request:

| Job | Steps |
|---|---|
| Backend | Java 21, Maven cache, `./mvnw -B -DskipTests package`, upload jar |
| Frontend | Node 20, `npm ci`, `npm run build` with a dummy API URL |

Tests are not run in CI because the context test needs live database
credentials. Do not add database secrets to a public repository's CI. When the
suite moves to Testcontainers, CI can run it with an ephemeral database.

---

## 3. End-to-end smoke suite

**File:** [`scripts/e2e-smoke.mjs`](../scripts/e2e-smoke.mjs)
**Checks:** 43
**Runtime:** ~5–15 seconds against a warm local API

### 3.1 What it covers

| Area | Checks |
|---|---|
| Health | `status: ok`, database `up` |
| Public fleet | List returns vehicles, `Cache-Control: max-age=60` |
| Booking creation | `201`, server-generated id, `createdAt`, starts `new`/`pending` |
| Booking lookup | Correct phone succeeds; wrong phone `404` |
| Validation | Bad service type/name/phone → `400` with field errors |
| Authorization | Admin list without a token → `401` |
| CORS | Preflight from the web origin returns the matching allow-origin |
| Admin auth | Wrong password rejected; login returns a 3-part JWT |
| Admin list | Paginated page shape, search finds the new booking |
| Admin update | Status/payment update; invalid enum → `400` |
| Fleet CRUD | Create, update, delete a vehicle |
| OpenAPI | `/v3/api-docs` returns OpenAPI 3.x |
| Driver roster | List, create, duplicate phone → `409` |
| Assignment | Assign driver; response exposes `driverId` |
| Driver trip sheet | Assigned phone succeeds; wrong phone `404` |
| Driver stage | Start sets `tripStage=started`; complete sets `status=completed` |
| Driver deletion | Assigned driver → `409`; after unassign → `204` |
| Password change | Wrong current password → `400` |
| Customer accounts | Signup/login returns a `customer` token |
| Customer history | Sees bookings made with the same phone |
| Role isolation | Customer token on an admin route → `403` |
| Customer auth | Missing token → `401` |

### 3.2 How to run

The API must be running and the database reachable.

```powershell
$env:API_BASE_URL="http://localhost:8081"
$env:ADMIN_EMAIL="owner@royaltravels.local"
$env:ADMIN_PASSWORD="<local password>"
node scripts/e2e-smoke.mjs
```

Expected output ends with:

```text
43 passed, 0 failed  (http://localhost:8081)
```

Exit code is `0` on success and `1` on any failure, so it works as a deploy gate.

### 3.3 Test data and cleanup

The suite creates:

| Data | Value |
|---|---|
| Booking | Phone `+919999000111`, name `E2E Smoke <timestamp>` |
| Driver | Phone `+919999000444`, deleted at the end |
| Vehicle | Plate `E2E-<timestamp>`, deleted at the end |
| Customer | `e2e.customer@example.com`, reused on later runs |

The invalid-booking check sends a payload that is rejected before persistence, so
it does not create a second row.

Bookings cannot be deleted through the API. Remove them with:

```powershell
psql "$env:DB_URL" -f scripts/cleanup-test-data.sql
```

The cleanup script is scoped to the known test phone numbers and email. It does
not touch real bookings.

**Never run the E2E suite against a production database that holds real customer
data.** Use a staging Supabase project, or accept that test rows will exist and
clean them immediately.

### 3.4 Adding a check

1. Add the HTTP call with the shared `call()` helper.
2. Use `check("behaviour in plain English", condition, detail)`.
3. Assert on status **and** the response body. A `200` with the wrong state is a
   failure.
4. If the check creates data, either delete it in the same run or add it to
   `scripts/cleanup-test-data.sql`.
5. Update the count in this document and the README.

Do not add a check that depends on another check's ordering unless the
dependency is explicit in the script.

---

## 4. Manual QA checklist

Automated checks cannot see layout, mobile behaviour, or a real WhatsApp handoff.
Run this before a release that touches the UI.

### Public site

- [ ] Home page loads on a 360 px-wide viewport; mobile menu opens and closes.
- [ ] Booking form: all four service types show the correct fields.
- [ ] Time picker shows 12-hour time with AM/PM.
- [ ] Required-field errors appear inline, not only in a toast.
- [ ] Successful booking shows the reference and a working confirmation link.
- [ ] `/fleet` filters by category and capacity.
- [ ] `/track` rejects a wrong phone and accepts the right one.
- [ ] `/track` updates within 30 seconds after an admin/driver change.
- [ ] Unknown URL shows the custom 404 page.
- [ ] No console errors.

### Admin

- [ ] Login with the owner account; wrong password shows a readable message.
- [ ] Refresh keeps the session (same tab); a new tab requires login.
- [ ] Bookings list paginates, searches by name/phone/email, filters by status.
- [ ] Status, payment, and trip stage update without a full reload.
- [ ] Driver dropdown assigns and unassigns.
- [ ] **WhatsApp driver** opens `wa.me` with the assigned driver's number and a
      complete message including the trip-sheet link.
- [ ] CSV export downloads and opens in Excel with correct columns.
- [ ] Fleet create/edit/delete; deleting a driver-linked vehicle is blocked.
- [ ] Drivers create/edit; duplicate phone is rejected; assigned driver cannot
      be deleted.
- [ ] Analytics numbers match the booking list.
- [ ] Settings password change works; a wrong current password is rejected.

### Driver

- [ ] `/driver/trip` loads on a phone-sized viewport.
- [ ] Wrong phone is rejected with a clear message.
- [ ] Guest call and WhatsApp links use the guest's number.
- [ ] Google Maps opens the correct route.
- [ ] Start trip changes the stage; complete trip changes the status.
- [ ] Completing twice does not double-count trips.

### Cross-cutting

- [ ] Browser console has no CORS or mixed-content errors.
- [ ] Pages load with the API asleep (clear error, not a blank screen).
- [ ] Keyboard navigation reaches the primary actions.
- [ ] Screen-reader labels exist on icon-only buttons.

---

## 5. Test environments

| Environment | Database | Purpose |
|---|---|---|
| Local | Supabase project (shared) | Development and E2E |
| Staging (optional) | Scratch Supabase project | Risky schema changes, production-like E2E |
| Production | Supabase project | Real customers; **no destructive tests** |

There is no permanently running staging stack because of free-tier limits. For a
risky schema change, create a temporary Supabase project, apply the SQL, boot the
API against it, and delete the project afterwards.

---

## 6. Known gaps

| Gap | Risk | Plan |
|---|---|---|
| No unit tests | Service rules can regress without HTTP coverage | Add focused JUnit tests for `BookingService` and `DriverService` |
| No Testcontainers | Tests depend on a remote database | Add `spring-boot-testcontainers` + PostgreSQL container |
| CI does not run tests | Regressions caught later | Run unit + Testcontainers suites in CI |
| No browser automation | UI regressions need a human | Add Playwright for booking, tracking, and login |
| No load test | Capacity unknown | k6 or Gatling against staging before a campaign |
| No accessibility audit | WCAG compliance unknown | axe DevTools pass, then fix critical issues |
| No contract test | Frontend/API drift | Generate types from OpenAPI, or add schemathesis |

None of these block a pilot with manual dispatch. They do block calling the
platform "enterprise-ready".

---

## 7. Definition of done

A change is done when:

- [ ] It compiles and the frontend builds.
- [ ] New behaviour has an E2E check, or a written reason why not.
- [ ] Existing E2E checks still pass.
- [ ] Database changes are committed as idempotent SQL and applied.
- [ ] Docs affected by the change are updated.
- [ ] No secrets, tokens, or real customer data are in the diff.
- [ ] The change is described in `CHANGELOG.md` if user-visible.
