# Roadmap

The roadmap is ordered by **operational value per unit of risk**, not by how
interesting a feature is to build. Items move only when the item above them is
done or the business constraint changes.

---

## 1. Status

| Area | Status |
|---|---|
| Public booking, tracking, fleet | Shipped |
| Customer accounts | Shipped |
| Admin auth, bookings, fleet, drivers, analytics | Shipped |
| Driver roster, WhatsApp handoff, trip sheet | Shipped |
| Rate limiting, fleet cache, indexes | Shipped |
| CI build, E2E suite, documentation | Shipped |
| Production deployment | **Pending** — runbook ready, providers not provisioned |
| Legal pages (Privacy, Terms, Refund) | **Missing** — required before real customers |
| Payments, GPS, automated notifications | Not built, labelled as future work |

---

## 2. Now — launch readiness (0–1 month)

These are prerequisites for a real pilot, not feature work.

### 2.1 Deploy and verify

- Provision Render, Vercel, and the production environment variables.
- Follow [deployment.md](deployment.md) end to end.
- Run the safe smoke checks and one real booking.
- Enable the uptime monitor.
- Record the production URLs in the README.

### 2.2 Security and legal hygiene

- Rotate the database password, admin password, and `JWT_SECRET`.
- Confirm the Supabase PostgREST exposure is closed
  ([security.md §7](security.md#7-supabase-exposure-check)).
- Publish Privacy Policy, Terms of Service, Cancellation, and Refund pages.
- Publish a real business address, phone, and email.
- Add a cookie/tracking statement only if tracking is ever added (today there is
  none).

### 2.3 Operational readiness

- Add the real fleet and real drivers; retire demo data.
- Train dispatch on the booking lifecycle and driver handoff.
- Write the "website down" fallback: take bookings by phone.
- Take the first backup and test a restore.

### 2.4 Test foundation

- Add JUnit tests for `BookingService` (business rules, duplicate guard) and
  `DriverService` (phone match, stage transitions).
- Add a Testcontainers PostgreSQL profile so the context test does not need the
  shared database.
- Run those tests in CI.

**Exit criteria:** a real customer can book, be dispatched, be driven, and track
the trip; the owner can restore a backup; no secret is shared in chat.

---

## 3. Next — reliability and daily workflow (1–3 months)

### 3.1 Automated schema migrations

Replace manual SQL with Flyway.

- Baseline the existing schema.
- Move `db/*.sql` into versioned migrations.
- Keep `ddl-auto=validate`.
- Add a migration check to CI.

This is the highest-value engineering item because schema drift is the most
likely cause of a failed deploy.

### 3.2 Notifications

Drivers and staff currently rely on a human pressing send.

| Option | Cost | Recommendation |
|---|---|---|
| Telegram bot | Free, unlimited | Best free automatic channel |
| Email (transactional free tier) | Free/cheap | Good for booking confirmations |
| WhatsApp Business Cloud API | Paid per message | Only when volume justifies it |
| Web push (PWA) | Free | Requires driver install and permission |

Start with Telegram for driver assignment and email for customer confirmation.
Keep the WhatsApp click-to-chat button as a fallback.

### 3.3 Browser test suite

Add Playwright for the three journeys that matter:

1. Guest booking → confirmation.
2. Tracking with the correct and wrong phone.
3. Admin login → assign driver → driver starts/completes → tracking updates.

Run it in CI against a seeded Testcontainers stack.

### 3.4 Payment links

The platform should not store card data. The low-risk approach:

1. Create a Razorpay/Stripe payment link per booking from the admin console.
2. Send the link to the customer.
3. Receive a webhook, verify the signature, and set `paymentStatus=paid`.
4. Reconcile against the provider dashboard.

Do not add card fields to the booking form. That changes the PCI scope and
requires a new threat model.

### 3.5 Observability

- Add Micrometer metrics and expose a protected `/actuator` surface, or send
  metrics to a free tier.
- Track booking creation rate, lookup failures, 5xx rate, and cold starts.
- Add an alert when `/api/health` reports `database != "up"` twice.

**Exit criteria:** a schema change can be deployed without manual SQL; a driver
gets an automatic notification; a regression in the main journey is caught
before production.

---

## 4. Later — scale and depth (3–6+ months)

| Item | Why later | Trigger |
|---|---|---|
| Live GPS | Privacy, battery, consent, map cost | Customers ask for ETA, and drivers consent |
| WhatsApp Business API | Paid, verification, templates | Message volume makes manual sends a bottleneck |
| 2FA for admins | Small team today | More than two admins, or a suspicious login |
| Audit log | Small team today | Disputes or compliance requirement |
| Customer OTP login | Email/password is sufficient now | Customers cannot remember passwords |
| Invoicing / GST | Offline today | Business needs compliant invoices |
| Multi-tenant / branches | One agency today | Second agency or location |
| Mobile PWA | The web app works on phones | Repeat usage justifies install prompts |
| Read replica / CDN for fleet | Traffic is small | Measured latency or load |
| Redis-backed limits | One instance today | Second API instance |

---

## 5. Explicit non-goals

These are not planned, even later, without a new business decision:

- A public marketplace with multiple operators bidding on rides.
- Dynamic surge pricing or an algorithmic fare engine.
- Self-hosted PostgreSQL or Kubernetes for a single small agency.
- A native iOS/Android app before the PWA is proven.
- Storing card numbers or becoming a payment processor.
- A fake "live GPS" animation that implies tracking that does not exist.

---

## 6. Prioritisation rules

When choosing what to build next:

1. **Legal/compliance before features.** A missing privacy policy is a bigger
   risk than a missing chart.
2. **Data safety before convenience.** Backups, migrations, and restore drills
   outrank dashboards.
3. **Revenue path before polish.** Assignment and confirmation matter more than
   animation.
4. **Free before paid.** Use a manual or free channel until volume proves the
   need.
5. **One instance until measured.** Do not add Redis or microservices on
   speculation.
6. **Honesty over demo.** If it is not built, label it; never mock it.

---

## 7. Known limitations (accepted for now)

- No automated tests in CI; the E2E suite is manual.
- No schema migration tool.
- In-process rate limiter and cache.
- No email/SMS/WhatsApp automation.
- No GPS, payments, invoices, or 2FA.
- Free-tier cold starts and manual backups.
- Legal pages are not in the repository yet.

These are documented so that a reviewer sees a deliberate scope, not an
overlooked one.
