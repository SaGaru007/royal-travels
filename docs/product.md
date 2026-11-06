# Product overview

## 1. The problem

A small cab and travel agency runs on phone calls and WhatsApp. That works until
it does not:

- Booking details arrive in free-form messages, so pickup times, flight numbers,
  and addresses get lost or retyped.
- The same customer submits the same trip twice because a mobile form was slow,
  creating duplicate work for dispatch.
- Whoever answers the phone cannot see the live pipeline of requests, who is
  driving which trip, or how much of the fleet is available.
- Customers have no way to check a booking without calling again.
- Driver assignment happens in a group chat, with no confirmation that the
  driver actually saw the trip.

RoyalTravels replaces that with a small, honest operations platform: a
customer-facing booking site, a phone-verified tracking page, an admin dispatch
console, and a passwordless driver trip sheet.

## 2. Who uses it

| Persona | Needs | What the product gives them |
|---|---|---|
| **Guest customer** | Book a cab quickly without creating an account | A single, service-aware booking form, a reference, and a confirmation page |
| **Returning customer** | See past bookings without calling | Optional email/password account with booking history |
| **Customer in transit** | Know whether the trip is assigned, started, or completed | `/track` page with a 30-second refresh, protected by booking reference + phone |
| **Dispatch / owner** | See every request, assign drivers, keep status accurate | Admin dashboard with pipeline, search, driver roster, CSV export, analytics |
| **Driver** | Know where to go, who to call, and mark progress | `/driver/trip` with guest details, maps link, call/WhatsApp buttons, start/complete |
| **Agency owner** | Know the system is not lying to them | Honest labels for unimplemented features; no fake payments or fake GPS |

## 3. Scope

### In scope (implemented)

- Public booking requests for four service types: outstation, local, airport,
  and callback.
- Server-side validation and business rules; no client-side trust.
- Duplicate-submission protection with a 10-minute window.
- Booking confirmation and tracking by **booking reference (UUID) + phone**.
- Optional customer accounts (email + password) with booking history.
- Admin authentication with `owner` and `staff` roles, JWT sessions, and
  self-service password change.
- Admin booking pipeline: paginated list, search, status/payment/trip-stage
  updates, CSV export.
- Fleet catalogue and admin fleet CRUD.
- Driver roster and booking assignment.
- Free WhatsApp click-to-chat handoff to the assigned driver.
- Passwordless driver trip sheet with start/complete actions.
- Analytics derived from real bookings and fleet data.
- Health endpoint that checks the database, not just the JVM.
- Rate limiting on the unauthenticated write routes.
- 60-second in-process cache for the public fleet list.
- Responsive UI, custom error and 404 pages.

### Out of scope (intentionally, for this release)

- Card/UPI payments and fare calculation. Bookings are **requests**; the
  concierge confirms the fare and collects payment offline.
- Live GPS location sharing. The `bookings.current_lat` / `current_lng` columns
  exist but are unused.
- Automated WhatsApp/SMS/email notifications. WhatsApp opens with a pre-filled
  message; a human presses send.
- Driver accounts and passwords. Drivers authenticate a trip with the booking
  reference plus the phone number dispatch has on file.
- Multi-tenant agencies, sub-accounts, or per-branch reporting.
- Refunds, invoices, GST documents, and accounting integrations.
- Native mobile apps.

Anything in this list is shown as "coming soon" in the UI where relevant. It is
not mocked.

## 4. Core journeys

### 4.1 Guest booking

1. The visitor chooses a service type and fills the booking form.
2. The browser posts to `POST /api/bookings`.
3. The API validates the payload, applies business rules, and rejects an
   identical submission from the same guest within 10 minutes.
4. The API returns `201` with the booking id, reference, and server-generated
   `createdAt`.
5. The confirmation page caches the response and shows the reference.

No account is required. Contact details are the only personal data collected.

### 4.2 Track a booking

1. The customer opens `/track` with the booking id from their confirmation.
2. The page asks for the phone number used on the booking.
3. `POST /api/bookings/lookup` returns the booking only when the last 10 digits
   match.
4. The page renders a status timeline and refreshes every 30 seconds.

A leaked URL alone reveals nothing.

### 4.3 Dispatch a booking

1. An admin signs in at `/admin/login`.
2. The dashboard lists bookings with status, payment, trip stage, and driver.
3. The admin moves the booking through `new → contacted → confirmed →
   completed` (or `cancelled`).
4. The admin assigns a driver from the roster.
5. **WhatsApp driver** opens WhatsApp with a complete trip brief addressed to
   the driver's saved number, including a trip-sheet link.
6. The driver opens the trip sheet, calls or messages the guest, opens the route
   in Google Maps, and marks the trip started/completed.
7. The customer's `/track` page reflects the new stage on its next refresh.

### 4.4 Customer account (optional)

1. Sign up with name, email, phone, and password (8–72 characters).
2. The account is linked to bookings by phone number, so guest bookings made
   earlier appear automatically.
3. Sign in at `/account/login` to see "My bookings".

### 4.5 Admin password rotation

1. Sign in at `/admin/settings`.
2. Enter the current password and a new password.
3. The API verifies the current password before changing the hash.
4. Existing JWTs remain valid until they expire (8 hours); rotate if a session
   is suspected compromised.

## 5. Business rules

These are enforced by the API, not only by the UI.

| Rule | Behaviour |
|---|---|
| Service type | One of `outstation`, `local`, `airport`, `callback` |
| Pickup date | Required for outstation/local/airport; cannot be in the past |
| Pickup location | Required for every service except callback |
| Drop location | Required for outstation and airport |
| Round trip | Return date required for outstation round trips |
| Date order | Return date cannot precede pickup date |
| Duplicate submission | Same name + phone + service + pickup date/time within 10 minutes → `409` with the original reference |
| Phone format | 10–15 digits, optional leading `+` |
| Password length | 8–72 characters (BCrypt input limit) |
| Booking status | `new`, `contacted`, `confirmed`, `completed`, `cancelled` |
| Payment status | `pending`, `paid` |
| Trip stage | `assigned`, `started`, `completed` |
| Vehicle status | `active`, `maintenance`, `inactive` |
| Driver status | `available`, `on_trip`, `off_duty` |
| Driver deletion | Blocked while the driver is assigned to any booking |
| Vehicle deletion | Blocked while a driver references the vehicle |
| Driver trip completion | Marks booking `completed`, driver `available`, increments completed trips |

## 6. Success measures

The platform is successful when, for a pilot agency:

- Every booking request reaches the dashboard without being retyped.
- Duplicate submissions trend toward zero.
- A dispatcher can assign a driver in under a minute.
- A customer can self-serve status without calling.
- The owner can answer "how many trips this week?" from the analytics page.

These are operational measures, not vanity metrics. There is no analytics
tracking script, cookie banner, or third-party pixel in the product.

## 7. Product principles

1. **Guest-first.** Requiring an account to book a cab loses customers. Accounts
   are an optional convenience.
2. **Honest UI.** If a feature is not built, the interface says so. A fake
   payment screen is worse than no payment screen.
3. **One source of truth.** Booking state lives in the database, not in a
   WhatsApp thread.
4. **Small operational surface.** One API, one web app, one managed database.
   The agency should not need a DevOps team.
5. **Free where free is honest.** Click-to-chat WhatsApp and free-tier hosting
   are deliberate cost decisions, documented with their trade-offs.
