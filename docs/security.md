# Security

This document describes the security model, the controls that are implemented,
and the risks that are consciously accepted for a small-agency deployment. It is
written to be reviewed, not to reassure.

**Reporting a vulnerability:** follow [SECURITY.md](../SECURITY.md). Do not open a
public issue for a security defect.

---

## 1. Assets

| Asset | Why it matters | Where it lives |
|---|---|---|
| Customer personal data | Name, phone, email, route, travel times | `bookings` table |
| Customer credentials | Account takeover | `customers.password_hash` (BCrypt) |
| Admin credentials | Full operational control | `admins.password_hash` (BCrypt) |
| Booking state | Business commitments | `bookings` table |
| Driver phone numbers | Trip-sheet authorisation | `drivers.phone` |
| JWT signing secret | Can mint admin tokens | Render environment |
| Database credentials | Full data access | Render environment, local config |
| Payment state | Financial records | `bookings.payment_status` (no card data) |

There is **no card data** in this system. Payments are agreed and collected
offline. That keeps the platform out of PCI-DSS cardholder scope. Do not add card
fields without a PCI-compliant provider and a new threat model.

---

## 2. Actors and trust boundaries

| Actor | Trust | Can reach |
|---|---|---|
| Anonymous internet user | Untrusted | Public booking, lookup, fleet, driver trip sheet, login |
| Guest customer | Untrusted but holds a booking reference + phone | Their own booking only |
| Customer account holder | Authenticated, `ROLE_CUSTOMER` | Own profile and bookings matched by phone |
| Assigned driver | Untrusted but holds a booking reference + roster phone | That trip sheet and its stage |
| Admin (`staff`) | Trusted, authenticated | Bookings, fleet, drivers |
| Admin (`owner`) | Trusted, authenticated | Same as staff today; owner is the bootstrap role |
| Hosting provider | Trusted infrastructure | Everything (Render, Supabase, Vercel) |
| Repository contributor | Trusted to review | Source, not production secrets |

Trust boundaries:

```text
Browser (untrusted input)
   │  HTTPS + JWT
   ▼
Render edge / CORS / rate limit
   │
   ▼
Spring Security filter chain
   │
   ▼
Controllers → Services (authorization + business rules)
   │  JDBC over TLS
   ▼
Supabase PostgreSQL (constraints as the last line of defence)
```

---

## 3. Threat model

| Threat | Impact | Mitigation | Residual risk |
|---|---|---|---|
| Booking spam / resource exhaustion | Cost, noisy data | Per-IP rate limit (20/10 min) | Distributed IPs; in-process limiter |
| Admin password brute force | Account takeover | BCrypt, generic error, 10/5 min limit | No 2FA |
| Credential stuffing on customer login | Account takeover | BCrypt, generic error, 10/5 min limit | No breached-password check |
| Account enumeration | Privacy | Same error for unknown email and wrong password | Timing differences are not measured |
| SQL injection | Data breach | JPA parameter binding; no string-concatenated SQL | Raw SQL in `db/` runs as the DB owner by design |
| Mass assignment | Privilege escalation | DTO records exclude ids, roles, statuses, fares | New fields must be added deliberately |
| Booking ID guessing | Privacy breach | UUID + phone required for lookup | Phone numbers can be known to an attacker |
| Driver trip access by a stranger | Route/guest disclosure | Booking UUID + assigned driver phone | A leaked driver phone + reference is sufficient |
| Stolen JWT | Admin takeover for up to 8 h | Short-ish expiry, `sessionStorage`, HTTPS | No revocation list; rotate `JWT_SECRET` |
| XSS stealing the admin token | Admin takeover | React escaping; no `dangerouslySetInnerHTML` in app code | No CSP yet; token is readable by JS |
| CSRF | Unauthorised admin action | Bearer token is not sent automatically by browsers; CSRF disabled intentionally | A malicious same-origin script is XSS, not CSRF |
| Malicious file upload | RCE / malware | No upload feature | — |
| Dependency compromise | Supply chain | Pinned versions, CI build, Dependabot alerts | No SBOM or signature verification |
| Database exposure through Supabase PostgREST | Data leak | App uses JDBC only; no anon key in the frontend | **Verify** RLS/API exposure in the Supabase project |
| Secret leakage via Git | Full compromise | `config/application-local.properties` gitignored; env vars in provider | Secrets shared in chat must be rotated |
| Log leakage | PII exposure | Logs record errors, not request bodies | Provider log access is broad |
| Insider misuse | Data exposure | Single owner, password manager | No audit log |

---

## 4. Implemented controls

### 4.1 Authentication

- Admin login: email + password against `admins`, BCrypt comparison.
- Customer login: same mechanism against `customers`.
- JWT: HMAC-SHA, 8-hour expiry, subject = email, claim `role`.
- Password length is capped at 72 characters because BCrypt ignores bytes beyond
  that; rejecting is safer than silently truncating.
- No default production password. `ADMIN_EMAIL`/`ADMIN_PASSWORD` are optional,
  and the bootstrap only creates an account when both are set.
- Error messages do not distinguish an unknown email from a wrong password.

### 4.2 Authorization

- Every route is authenticated unless explicitly listed as public in
  `SecurityConfig`.
- Admin routes use `@PreAuthorize("hasAnyRole('OWNER','STAFF')")`.
- Customer routes use `@PreAuthorize("hasRole('CUSTOMER')")`.
- Customer booking history is scoped to the authenticated email's phone number.
- Driver stage updates require the assigned driver's phone, not just a booking
  reference.
- `driverId` can only be set by an admin, and must reference an existing driver.

### 4.3 Input handling

- Bean Validation on every request record: required fields, sizes, patterns,
  date constraints.
- Business rules in services: service type, pickup/drop requirements, date order,
  no past pickup dates.
- Enum values are validated by regex **and** enforced by database `CHECK`
  constraints.
- Malformed JSON and bad UUIDs return `400`, not a stack trace.
- Unexpected errors return a generic RFC 7807 body; details are logged server
  side only.

### 4.4 Data protection

- BCrypt password hashes (cost factor from Spring Security defaults).
- Password hashes are never included in any DTO.
- `Admin.passwordHash` is annotated `@JsonIgnore` as defence in depth.
- Booking lookup returns one booking, never a list, and requires the phone.
- The same `404` is returned for "not found" and "wrong secret".
- CORS allows only configured origins; credentials are not used.
- HTTPS is terminated by Render/Vercel; HSTS is provider-managed.

### 4.5 Abuse protection

| Route | Limit |
|---|---|
| Admin login | 10 / 5 min |
| Customer login | 10 / 5 min |
| Customer signup | 5 / 1 hour |
| Booking creation | 20 / 10 min |
| Booking lookup | 60 / 10 min |
| Driver trip lookup | 60 / 10 min |

- Duplicate booking guard: same guest + phone + service + pickup date/time within
  10 minutes returns `409` with the original reference.
- The limiter bounds its memory by evicting expired windows above 50,000 tracked
  clients.

### 4.6 Infrastructure

- Stateless API; no session store to steal.
- Database not publicly reachable except through Supabase's managed endpoint.
- Secrets live in Render environment variables, never in the image.
- `application-prod.properties` suppresses error messages and binding details.
- Render health checks and restarts.
- No shell, no cron, and no admin server inside the container.
- CI builds from source; the Docker image is multi-stage and contains no Maven
  cache or source tree at runtime.

### 4.7 Privacy

- Guest checkout collects only what is needed to provide the trip.
- The tracking page does not expose the driver's phone or exact location.
- Driver trip sheet exposes the guest's phone only to the assigned driver.
- `robots.txt` disallows `/admin`, `/account`, `/driver`, `/confirmation`, and
  `/track`.
- No third-party analytics, advertising pixels, or social embeds.

---

## 5. Accepted risks and known gaps

These are known and accepted for the current stage. They are listed so nobody
mistakes them for oversights.

| Risk | Why accepted | Trigger to fix |
|---|---|---|
| No 2FA for admins | Small team, strong unique password, low account count | More than 2 admins, or any suspicious login |
| No audit log | Not required for a pilot | Real customer disputes or compliance request |
| JWT cannot be revoked individually | Short expiry; rotate secret for emergencies | Multiple admins or a suspected token theft |
| Admin token in `sessionStorage` | Separate-origin SPA without cookie infrastructure | Move to `HttpOnly` cookies + CSRF tokens if XSS becomes a concern |
| No CSP / security headers in the app | Provider defaults; static pages | Add headers in `next.config.mjs` or at the CDN |
| Public Swagger UI | Useful for demos and support | Disable in production or protect with auth |
| Public health details | Needed for uptime checks | Restrict to status only if it attracts scanning |
| In-process rate limit | One instance | Second instance or sustained abuse |
| `X-Forwarded-For` is trusted | Render sets it; limiter is abuse mitigation | Direct-to-origin exposure, or strict attribution |
| No dependency scanning in CI | Dependabot covers alerts | Add `mvn dependency-check` / `npm audit` gate |
| Supabase PostgREST may expose `public` | App does not use it; no anon key shipped | Verify and revoke anon access; see §7 |
| Manual database backups | Free tier | Paid PITR or scheduled dumps |
| No formal penetration test | Cost | Before handling a large customer base |

---

## 6. Secure development

### 6.1 Rules

- Never commit secrets. `config/application-local.properties`, `.env`, and
  `.env.local` are gitignored.
- New public routes require an explicit `SecurityConfig` matcher and a review.
- New request fields are added to DTO records, never to entities directly from
  the controller.
- New enum values require the database `CHECK`, DTO pattern, UI union, and E2E
  check to change together.
- Do not log request bodies, tokens, passwords, or full phone numbers.
- Do not add `dangerouslySetInnerHTML` without a sanitizer and a review.
- Keep dependencies current; review Dependabot pull requests weekly.
- Security-relevant changes need a second pair of eyes if a second person is
  available; otherwise write down the reasoning in the pull request.

### 6.2 Review checklist

- [ ] Route added to `SecurityConfig` with the correct public/private decision.
- [ ] `@PreAuthorize` present on every admin/customer controller method.
- [ ] Input validated with Bean Validation and service rules.
- [ ] No entity returned directly from a controller.
- [ ] No secret or PII in logs or error messages.
- [ ] Database constraint added for any new enum or uniqueness rule.
- [ ] E2E coverage for the new route or rule.
- [ ] This document updated if the risk profile changed.

---

## 7. Supabase exposure check

Supabase projects can expose the `public` schema through an auto-generated REST
API. RoyalTravels does not use that API — it connects with JDBC and a database
password — but the exposure may still exist at the Supabase project level.

Verify once per environment:

1. Supabase → **Project Settings → API**. If the project exposes a REST API with
   an anon key, that key should not be published or used.
2. Supabase → **Authentication → Policies**. Tables in `public` should have RLS
   enabled, or the anon/authenticated roles should have no privileges.
3. If the app is the only client, revoke `anon` and `authenticated` access to the
   application tables:

```sql
-- Review before running. This affects only the PostgREST roles.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
```

4. Confirm the API still works; it uses the database owner role, not anon.
5. Record the check in the deployment checklist.

If a future feature uses Supabase client libraries, do not skip this: enable RLS
and write explicit policies first.

---

## 8. Incident response for security events

1. **Contain**
   - Rotate `JWT_SECRET` to invalidate all sessions.
   - Rotate the admin password.
   - If the database is involved, rotate `DB_PASSWORD` and restrict access.
2. **Assess**
   - Which data could have been accessed?
   - Which accounts and time window?
   - Preserve logs before they age out.
3. **Notify**
   - Inform affected customers if personal data was exposed, as required by
     applicable law and the privacy policy.
   - Do not speculate publicly; state facts and next steps.
4. **Recover**
   - Patch the cause, redeploy, and verify with the E2E suite.
5. **Learn**
   - Write a postmortem, add a regression test, and update this document.

Legal note: this is engineering guidance, not legal advice. For an Indian
business handling personal data, review the Digital Personal Data Protection Act
obligations with a qualified advisor before launch.

---

## 9. Production hardening checklist

- [ ] Unique, strong admin password; stored in a password manager.
- [ ] `JWT_SECRET` is 32+ random bytes and unique to production.
- [ ] Database password rotated after any sharing.
- [ ] `CORS_ALLOWED_ORIGINS` contains only real origins.
- [ ] `SPRING_PROFILES_ACTIVE=prod` (error details suppressed).
- [ ] Swagger disabled or accepted as a public demo surface.
- [ ] Supabase REST exposure reviewed (§7).
- [ ] Rate limits verified with a small burst test.
- [ ] Uptime monitor alerts to a monitored inbox.
- [ ] Backups taken and a restore tested.
- [ ] Privacy, Terms, and Refund pages published.
- [ ] Admin access reviewed; remove former staff.
- [ ] Dependabot alerts enabled on GitHub.
- [ ] No secrets in the repository history:
      `git log -p | findstr /i "password secret"` (review hits manually).
