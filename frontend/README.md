# RoyalTravels — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS. This app renders the public
site, the admin dispatch console, and the driver trip sheet, and talks to the
RoyalTravels Spring Boot API in the repository root.

The full product and engineering documentation is in
[`../docs/`](../docs/README.md).

---

## Run locally

The backend must be running on `http://localhost:8081`.

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>.

```bash
# Bash
cp .env.local.example .env.local
```

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Spring Boot API. Defaults to `http://localhost:8081`. |

`NEXT_PUBLIC_*` values are inlined at build time. Restart the dev server after
changing the file, and redeploy for a production change.

### Local admin account

The backend creates one owner on first start if `ADMIN_EMAIL` / `ADMIN_PASSWORD`
are set and that email does not exist. Local development uses the values in the
backend's `config/application-local.properties`. The frontend never stores those
values; the JWT returned by login is kept in `sessionStorage`.

> Never reuse the local development password in production. Change the owner
> password at `/admin/settings` after the first production login.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build; also type-checks and lints |
| `npm start` | Serve the production build |
| `npm run lint` | Next.js lint |

Minimum gate before a pull request:

```powershell
npx tsc --noEmit
npm run build
```

`next build` must generate all 20 routes. A page that reads `useSearchParams`
without a `Suspense` boundary fails here rather than in production.

---

## Routes

| Route | Audience | Purpose |
|---|---|---|
| `/` | Public | Landing page, services, fleet preview, booking form |
| `/fleet` | Public | Full fleet with category/capacity filters |
| `/confirmation?id=` | Public | Booking confirmation using the cached booking |
| `/track?id=` | Public | Phone-verified tracking, refreshes every 30 seconds |
| `/account/login` | Customer | Sign in |
| `/account/signup` | Customer | Create an account |
| `/account` | Customer | Profile and booking history |
| `/admin/login` | Admin | JWT login |
| `/admin` | Admin | Dashboard and pipeline summary |
| `/admin/bookings` | Admin | List, search, status/payment/stage, driver assignment, CSV |
| `/admin/fleet` | Admin | Fleet CRUD |
| `/admin/drivers` | Admin | Driver roster |
| `/admin/analytics` | Admin | Volume, status mix, routes, utilisation |
| `/admin/settings` | Admin | Password change and session details |
| `/driver/login` | Driver | Entry point explaining the trip-sheet flow |
| `/driver/trip?id=` | Driver | Phone-verified trip sheet and start/complete |

`/admin`, `/account`, `/driver`, `/confirmation`, and `/track` are disallowed in
`robots.ts`. They are not secret; they are simply not useful to search engines.

---

## What is wired to the API

Public:

- Booking form → `POST /api/bookings`
- Confirmation → cached booking + `POST /api/bookings/lookup` when the phone is
  needed
- Tracking → `POST /api/bookings/lookup`, then polls every 30 seconds
- Fleet and home prices → `GET /api/vehicles`

Customer:

- Signup/login → `POST /api/auth/customer/signup|login`
- Profile → `GET /api/customer/me`
- My bookings → `GET /api/customer/bookings`

Admin (`sessionStorage` JWT, login at `/admin/login`):

- Bookings → `GET /api/bookings`, `PATCH /api/bookings/{id}`, CSV export
- Fleet → `/api/admin/vehicles` CRUD
- Drivers → `/api/admin/drivers` CRUD
- Password → `POST /api/admin/password`
- Analytics → derived from live bookings and vehicles

Driver:

- Trip sheet → `POST /api/driver/trips/lookup`
- Start/complete → `PATCH /api/driver/trips/{id}/stage`

---

## Project structure

```text
frontend/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── error.tsx, not-found.tsx, robots.ts
│   ├── fleet/, confirmation/, track/
│   ├── account/ (login, signup, profile)
│   ├── admin/ (login, dashboard, bookings, fleet, drivers, analytics, settings)
│   └── driver/ (login, trip)
├── components/
│   ├── BookingBar.tsx, BookingConfirmation.tsx, LiveTracking.tsx
│   ├── Header.tsx, Footer.tsx, Hero.tsx, Fleet*.tsx, ...
│   ├── DriverTripSheet.tsx
│   └── admin/ (AdminShell, AdminSidebar, AdminTopbar, layout)
├── lib/
│   ├── api.ts             typed API client
│   ├── auth.ts            admin session
│   ├── customerAuth.ts    customer session
│   ├── bookingSession.ts  last booking cache
│   └── format.ts          INR/date/12-hour time/short reference/WhatsApp
├── public/
├── next.config.mjs
└── tailwind.config.ts
```

---

## Implementation notes

- Every page is statically pre-rendered; data is fetched in the browser. There is
  no Next.js API route or server session.
- `lib/api.ts` is the only place that calls `fetch`. It converts the API's RFC
  7807 errors into `ApiError` with a message and optional field errors.
- Admin and customer JWTs live in `sessionStorage`, so they end when the tab
  closes.
- Time is displayed in 12-hour format with AM/PM (`TimeSelect`, `formatTime`).
- The fleet response is cached by the browser for 60 seconds; the API also
  caches it in-process.
- Driver access is passwordless: booking reference + the assigned driver's phone.
- The WhatsApp handoff uses `wa.me` click-to-chat; a human presses send. This is
  deliberate and documented in
  [ADR 0005](../docs/adr/0005-whatsapp-click-to-chat.md).
- The UI does not fake payments or GPS. Those features are labelled as coming
  soon.

---

## Deploy (free tier)

1. **Database** — existing Supabase PostgreSQL project.
2. **Backend** — Render free web service (Docker), per `../render.yaml`.
3. **Frontend** — Vercel Hobby, with **Root Directory `frontend`** and
   `NEXT_PUBLIC_API_BASE_URL` set to the Render URL.

The exact steps, CORS setting, verification, and rollback are in
[`../docs/deployment.md`](../docs/deployment.md). A short version is in
[`../DEPLOYMENT.md`](../DEPLOYMENT.md).
