# Royal Travels — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS. The public site and the
admin dispatch console both read and write the RoyalTravels Spring Boot API in
`E:\projectsSpringboot\RoyalTravels` (or your deployed copy of it).

## Run locally

The backend must be running on `http://localhost:8081`.

```bash
npm install
copy .env.local.example .env.local   # Windows
npm run dev
```

Open http://localhost:3000.

Default local admin account (created by the backend bootstrap on first start):

- Email: `owner@royaltravels.local`
- Password: `RoyalTravels@2026`

You can change these with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the backend
environment. The frontend never stores these values.

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Spring Boot API. Defaults to `http://localhost:8081`. |

Set `NEXT_PUBLIC_API_BASE_URL` in Vercel (or `.env.local` for local work) and
restart the dev server after changing it.

## What is wired to the API

Public:

- Booking form (`components/BookingBar.tsx`) → `POST /api/bookings`
- Confirmation page (`/confirmation?id=…`) → cached booking plus
  `POST /api/bookings/lookup` when the phone number is needed
- Track page (`/track?id=…`) → same phone-verified lookup, real status steps
- Fleet page (`/fleet`) and home fleet prices → `GET /api/vehicles`

Admin (JWT in `sessionStorage`, login at `/admin/login`):

- `/admin/bookings` → `GET /api/bookings`, `PATCH /api/bookings/{id}`,
  CSV export, status/payment/trip-stage updates
- `/admin/fleet` → `GET /api/admin/vehicles`, create, edit, status changes,
  delete
- `/admin/analytics` → derived from live bookings and vehicles
- `/admin/settings` → session and API configuration details

Not implemented yet (shown honestly in the UI): driver login/trip sheets, live
GPS, online payments, and public UUID-only booking access. Confirmation and
tracking require the booking phone number by design.

## Project structure

- `app/` — routes: home, fleet, confirmation, track, admin, driver placeholders
- `components/` — public page sections and admin components
- `lib/api.ts` — typed API client, one function per endpoint
- `lib/auth.ts` — admin session storage
- `lib/bookingSession.ts` — last booking cache used by confirmation
- `lib/format.ts` — INR/date formatting and the concierge WhatsApp link

## Build

```bash
npm run build
npm start
```

The admin routes are statically generated but read the session and fetch data
client-side, so no API URL is baked into HTML beyond the public env variable.

## Deploy (free tier)

Recommended zero-cost combination:

1. **Database** — existing Supabase PostgreSQL project.
2. **Backend** — Render free web service (Docker) or Railway free trial.
3. **Frontend** — Vercel Hobby.

See `E:\projectsSpringboot\RoyalTravels\DEPLOYMENT.md` for the exact environment
variables, CORS setting, and step-by-step deploy notes.
