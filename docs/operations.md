# Operations runbook

This is the day-to-day operating guide for RoyalTravels. It assumes the
deployment in [deployment.md](deployment.md) is complete.

---

## 1. Service ownership

| Area | Owner | Responsibility |
|---|---|---|
| Product and bookings | Agency owner | Booking policy, pricing, customer communication |
| Platform | Repository owner / engineer | API, database, deployments, incidents |
| Dispatch | Agency staff | Assigning drivers, updating statuses, confirming payments |
| Data protection | Agency owner | Privacy requests, retention decisions |

For a solo-operated pilot, one person may hold several roles. The important
thing is that each responsibility has a name, not that it has a team.

### Support hours

There is no 24/7 on-call rotation. State the real support window publicly, for
example "09:00–21:00 IST, WhatsApp". Outside those hours, the booking form still
accepts requests; dispatch follows up the next morning. Do not promise instant
confirmation unless someone is actually watching the dashboard.

---

## 2. Service expectations

These are honest targets for a free-tier pilot, not contractual SLAs.

| Expectation | Target | Reality |
|---|---|---|
| API availability | Best effort | Render free sleeps when idle |
| First-request latency after idle | < 90 s | JVM + cold container |
| Warm request latency | < 500 ms for list/read | Singapore region; India users |
| Booking write durability | No acknowledged write lost | Supabase PostgreSQL |
| Recovery after API crash | < 10 minutes | Render restart or redeploy |
| Recovery after bad deploy | < 15 minutes | Roll back previous image |
| Data loss window | Last manual/Supabase backup | Free tier has no guaranteed PITR |

If the business needs better numbers, the upgrade path is a paid Render instance
and Supabase Pro, not more code.

---

## 3. Monitoring

### 3.1 What to watch

| Signal | Source | Action threshold |
|---|---|---|
| API health | `GET /api/health` every 10 min | `database != "up"` for 2 checks |
| Response failures | Render logs (5xx) | Any sustained 5xx |
| Cold starts | Render events | Frequent long wakes during business hours |
| Database size | Supabase dashboard | > 70% of 500 MB |
| Backup age | Supabase backups / local dumps | > 7 days |
| Auth failures | Render logs, 401 spikes | Sudden spike suggests brute force |
| Rate limits | 429 count | Legitimate customers blocked |
| Frontend errors | Vercel logs / browser reports | New error boundary hits |

### 3.2 Minimum setup

1. **Uptime monitor** — cron-job.org or UptimeRobot, `/api/health`, 10-minute
   interval, email alert after 2 failures.
2. **Render notifications** — deploy failures and service restarts to email.
3. **Supabase notifications** — project pause, storage, and billing notices.
4. **Vercel notifications** — failed production deployments.

There is no metrics backend, APM, or log aggregation. Logs are retained by the
providers for their own windows. If an incident needs evidence, copy the relevant
log lines into the incident record before they age out.

### 3.3 Manual health check

```powershell
Invoke-RestMethod https://<service>.onrender.com/api/health | ConvertTo-Json
```

Expected:

```json
{ "status": "ok", "app": "RoyalTravels", "database": "up", "timestamp": "..." }
```

---

## 4. Routine operations

### Daily (business days)

- [ ] Open `/admin` and review new bookings.
- [ ] Contact new requests; move them to `contacted` or `confirmed`.
- [ ] Assign drivers for tomorrow's trips.
- [ ] Confirm each driver received the WhatsApp brief.
- [ ] Check the uptime monitor has no unresolved alerts.

### Weekly

- [ ] Review `cancelled` and stale `new` bookings; close or follow up.
- [ ] Reconcile `paymentStatus` against actual payments received.
- [ ] Review driver roster: availability, licence flags, vehicle links.
- [ ] Check Supabase database size and backup status.
- [ ] Scan Render logs for repeated 5xx or auth errors.
- [ ] Export a CSV backup of `bookings`.

### Monthly

- [ ] Restore the latest backup into a scratch project (restore drill).
- [ ] Review rate-limit behaviour; adjust only with evidence.
- [ ] Review fleet pricing and retire vehicles no longer in service.
- [ ] Review admin accounts; remove anyone who should no longer have access.
- [ ] Rotate the admin password if staff changed.
- [ ] Review dependency updates (`mvn versions:display-dependency-updates`,
      `npm outdated`).

### Quarterly

- [ ] Rotate the database password and `JWT_SECRET`.
- [ ] Full restore drill, documented.
- [ ] Review this runbook against what actually happened.
- [ ] Review privacy/retention requests and delete data no longer needed.
- [ ] Re-evaluate free-tier limits against real volume.

---

## 5. Incident management

### 5.1 Severity

| Severity | Definition | Examples | Response |
|---|---|---|---|
| **SEV-1** | Customers cannot book or staff cannot dispatch | API down, database down, login broken | Drop everything; restore service first |
| **SEV-2** | Major feature degraded | Fleet page empty, driver trip sheet failing, WhatsApp link wrong | Fix within the business day |
| **SEV-3** | Minor or cosmetic | One analytics chart wrong, slow page | Next planned release |
| **SEV-4** | Question or request | "How do I add a driver?" | Normal support |

### 5.2 Process

1. **Detect** — monitor alert, staff report, or customer message.
2. **Declare** — state the severity and who is handling it. For a solo operator,
   write it down anyway; it prevents panic and preserves history.
3. **Mitigate** — restore service before finding the root cause. Roll back first
   if the last deploy is the likely cause.
4. **Communicate** — tell affected staff what is happening and what to do
   (for example, "take bookings by phone until 11:30").
5. **Resolve** — confirm with a real end-to-end check, not only a health probe.
6. **Record** — write a short postmortem within 48 hours for SEV-1/SEV-2.
7. **Prevent** — add a test, a monitor, or a documentation change.

### 5.3 Postmortem template

```markdown
## Incident — <date> — <short title>

**Severity:** SEV-1
**Duration:** 10:05–10:42 IST (37 min)
**Impact:** New bookings returned 503; admin console could not load.

**Timeline (IST)**
- 10:05 First alert / report
- 10:09 Confirmed API health degraded, database down
- 10:15 Supabase project restored
- 10:30 API warm, booking test passed
- 10:42 Monitoring stable for 10 minutes; incident closed

**Root cause**
<One paragraph, no blame.>

**What went well**
- ...

**What went poorly**
- ...

**Action items**
| Action | Owner | Due |
|---|---|---|
| Add database-down alert | | |
| Document manual booking fallback | | |
```

---

## 6. Incident runbooks

### 6.1 API is down or returning 5xx

1. Check `GET /api/health`.
2. Open Render → service → **Logs**. Look for:
   - `OutOfMemoryError` → memory (§6.6)
   - `Connection refused` / `timeout` → database (§6.2)
   - `Schema-validation` → schema drift (§6.7)
   - application stack trace → note the first `Caused by`.
3. If the last deploy is the likely cause, **roll back** (deployment.md §10).
4. Otherwise restart the service.
5. Verify with a real booking lookup and the admin list, not only health.
6. Record the incident.

### 6.2 Database unreachable / health `degraded`

1. Open the Supabase dashboard. Is the project paused or over quota?
2. Resume the project if paused.
3. **Database → Settings → Database** — confirm the password has not been reset.
4. Confirm the Render `DB_PASSWORD` matches.
5. If the pooler is down, check the Supabase status page.
6. Restart the API after the database is reachable.
7. If data is missing or corrupt, go to restore (§7).

### 6.3 Customers see "Cannot reach the API"

1. Open the API health URL directly in a browser.
2. If it is asleep, wait 60–90 seconds and retry.
3. If it is up, check the Vercel environment variable and rebuild:
   `NEXT_PUBLIC_API_BASE_URL` must point at the live API, with no trailing slash.
4. Check the browser console: CORS errors mean §6.4, not a dead API.

### 6.4 CORS errors in the browser

1. Read the blocked origin from the console.
2. Render → Environment → `CORS_ALLOWED_ORIGINS`.
3. Add the exact origin (`https://…`, no trailing slash, no path).
4. Redeploy the API.
5. Hard-refresh the browser; preflight responses are cached for an hour.

### 6.5 Login fails / everyone is logged out

1. `401` on a previously valid token: the token expired (8 h) or
   `JWT_SECRET` changed. Sign in again.
2. Unknown email/password: confirm the account exists in `admins`.
3. If the owner password is lost:
   - Option A: set a new `ADMIN_EMAIL`/`ADMIN_PASSWORD` for an email that does
     not exist yet, redeploy, sign in as the new owner, then remove the old row.
   - Option B: generate a BCrypt hash and update `admins.password_hash` directly.
4. Never email or chat a password. Use a password manager share.

### 6.6 Render restarts / out of memory

1. Logs show `OutOfMemoryError`, `Killed`, or repeated restarts.
2. Set `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=60` and redeploy.
3. Check for a traffic spike or a runaway loop.
4. If it persists at normal traffic, move to a paid instance with more RAM.

### 6.7 Startup fails schema validation

The error names the missing or mismatched column. Either:

- add the column with SQL matching the entity, or
- revert the entity change.

Do not set `ddl-auto=update`. See [database.md §4](database.md#4-schema-change-policy).

### 6.8 Rate limiting blocks real customers

1. Confirm the `429` is from the API, not a provider.
2. Read `Retry-After`; the window is short (5–10 minutes).
3. Look for a client retry loop or a shared office IP.
4. Adjust the limit in `RateLimitFilter` only with evidence, and update
   [api.md](api.md) and the README at the same time.

### 6.9 Duplicate bookings

1. The API should reject identical submissions within 10 minutes with `409`.
2. If duplicates exist, check whether the name, phone, service, date, or time
   differed in a way that made them legitimately distinct.
3. Merge duplicates in the admin UI: keep the confirmed one, cancel the other,
   and note why.
4. Do not delete rows to hide the problem; cancelled records are useful history.

### 6.10 Driver cannot open the trip sheet

1. Confirm a driver is assigned to the booking (admin booking row).
2. Confirm the driver's stored phone matches the number they typed (last 10
   digits).
3. Confirm the booking reference is the full UUID from the confirmation/admin
   URL, not the short `RT-` display reference.
4. Check for `404` (not assigned/mismatch) versus `429` (rate limit).

### 6.11 WhatsApp opens the wrong number or no chat

1. The link is `https://wa.me/<digits>?text=...`.
2. Confirm the driver's phone in the roster has 10–15 digits and the correct
   country code.
3. If the driver has no WhatsApp account on that number, the app will offer SMS
   or fail; that is a WhatsApp limitation, not an API bug.
4. The message is pre-filled; a human must press send. This is intentional.

---

## 7. Backup and restore operations

Procedure and commands live in [database.md §6](database.md#6-backup-and-restore).

Operational rules:

- Take a backup **before** any schema change, bulk update, or data cleanup.
- Store backups outside the repository. They contain personal data.
- Encrypt backups at rest; do not email dumps.
- Test a restore quarterly.
- Delete backups older than the retention policy (90 days is a reasonable
  default for a small agency).

---

## 8. Secret rotation

| Secret | Where | Rotation impact |
|---|---|---|
| `DB_PASSWORD` | Supabase + Render + local config | Brief downtime; update all three |
| `JWT_SECRET` | Render | All admin/customer sessions invalidated |
| `ADMIN_PASSWORD` | Admin UI or env bootstrap | No downtime |
| Vercel/GitHub tokens | Provider settings | Deployment access only |
| WhatsApp number | `frontend/lib/format.ts` | Requires frontend rebuild |

Rotation procedure:

1. Generate the new value with a password manager.
2. Update the provider environment variable.
3. Update any local copy (never commit it).
4. Redeploy/restart.
5. Verify login and a booking.
6. Record the rotation date; do not record the secret.

---

## 9. Capacity and cost

| Resource | Current usage | Watch at | Action |
|---|---|---|---|
| Supabase storage | 500 MB free | 350 MB | Archive old bookings; upgrade |
| Render RAM | 512 MB | Repeated restarts | Tune heap; upgrade |
| Render hours | 750/month | N/A for one service | One service fits |
| Vercel bandwidth | 100 GB/month | 70 GB | Optimise images; upgrade |
| Admin JWT sessions | 8 h | — | Expected behaviour |

Cost control principles:

- Do not add a paid dependency until the free tier is the measured constraint.
- Prefer a manual workflow over a paid API when the volume is low.
- Keep one environment. Staging is a scratch Supabase project used only for
  risky schema work, not a permanently running second stack.

---

## 10. Customer support workflow

| Request | Action |
|---|---|
| "Where is my booking?" | Ask for the booking reference and phone; use `/track` or admin lookup |
| "Change my pickup time" | Admin edits the booking; note the request; inform the driver |
| "Cancel" | Set `status=cancelled`; inform the driver; record any refund decision offline |
| "I paid but it shows pending" | Verify the payment; set `paymentStatus=paid`; never mark paid without evidence |
| "I did not receive a confirmation" | Resend the reference and the `/track` link; confirm the phone number |
| "Delete my data" | Verify identity; delete/anonymise; record the request |
| "The driver did not arrive" | Check trip stage and driver phone; call the driver; update the customer |
| "The website is down" | Follow §6.1; take the booking by phone and enter it later |

Never ask a customer to send a password. Never send a database export or another
customer's data.

---

## 11. Operational debt register

Known gaps that operations should be aware of:

| Gap | Risk | Planned mitigation |
|---|---|---|
| No automated DB migrations | Schema drift | Adopt Flyway when the schema stabilises |
| No automated tests in CI | Regressions reach main | Testcontainers integration suite |
| In-process rate limit | Bypass across instances | Edge limiter or Redis |
| No metrics/tracing | Slow diagnosis | Add Micrometer + a free metrics tier |
| Manual backups | Data loss window | Paid Supabase PITR or scheduled dumps |
| No email/SMS notifications | Staff must watch the dashboard | Add a free transactional email tier |
| Legal pages missing | Compliance risk | Publish Privacy, Terms, Refund pages before launch |
| Single admin bootstrap | Account recovery is manual | Documented recovery path; consider a second owner |

Review this table every quarter and remove anything that is no longer true.
