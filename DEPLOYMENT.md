# Deploying RoyalTravels for zero recurring cost

The stack is already split into pieces that each have a usable free tier:

| Piece | Service | Free tier notes |
|---|---|---|
| Database | **Supabase** (existing PostgreSQL) | Free project, 500 MB database. No change needed. |
| Backend API | **Render** Web Service (Docker) | Free instance; sleeps after ~15 minutes of inactivity, first request then takes ~30–60 s to wake. |
| Frontend | **Vercel** Hobby | Free for personal/non-commercial projects. A commercial business site technically needs a paid plan; for an internal/brochure launch Hobby works. |
| Domain | Provider of your choice | Optional; both Render and Vercel give free `*.onrender.com` / `*.vercel.app` URLs. |

There is no paid dependency required to get a working end-to-end deployment.
If Render's cold start is unacceptable, the same Docker image runs on any small
VPS or on Railway/Fly trial credits without code changes.

---

## 1. Backend environment variables

Set these in the Render dashboard (or any host). Never commit them.

| Variable | Example / source |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | `jdbc:postgresql://aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres` |
| `DB_USERNAME` | Supabase pooler user, e.g. `postgres.<project-ref>` |
| `DB_PASSWORD` | Supabase database password |
| `JWT_SECRET` | Random 32+ byte string. Generate with `openssl rand -base64 48` (or any 48+ char random value). |
| `ADMIN_EMAIL` | Owner login email, e.g. `owner@yourdomain.com` |
| `ADMIN_PASSWORD` | Strong owner password |
| `CORS_ALLOWED_ORIGINS` | Your Vercel URL, e.g. `https://royal-travels.vercel.app` |
| `PORT` | Render sets this automatically; the app also defaults to `8081`. |

Notes:

- Use the Supabase **session pooler** host on port `5432` (the value already in
  `config/application-local.properties`). If your network only allows IPv4,
  the pooler is required.
- `ddl-auto=validate`: the schema must already exist. It does. Do not switch to
  `update` against this database.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are only used on startup to create the owner
  if that email is absent. Changing the env var later does not change an
  existing password.
- Rotate the Supabase password and admin password before launch if the current
  development values were ever shared. Update `config/application-local.properties`
  and the host env vars together.

## 2. Deploy the backend on Render

1. Push this repository to GitHub (the included `Dockerfile` is used).
2. Render → **New → Web Service** → connect the repo.
3. Runtime: **Docker**. Root directory: repository root.
4. Health check path: `/api/health`.
5. Add the environment variables from the table above.
6. Deploy. Wait for `Started RoyalTravelsApplication`, then open
   `https://<service>.onrender.com/api/health` and confirm
   `{"status":"ok","app":"RoyalTravels"}`.

The free instance sleeps when idle. A cold start is normal; the health check
will wake it.

## 3. Deploy the frontend on Vercel

1. Use this repository (the frontend lives in `frontend/`).
2. Vercel → **Add New Project** → import `SaGaru007/RoyalTravels`.
3. Framework preset: Next.js. **Root directory: `frontend`.**
4. Environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<service>.onrender.com`
5. Deploy, then copy the deployment URL into the backend's
   `CORS_ALLOWED_ORIGINS` and redeploy the backend (or edit the env var and
   restart the service).
6. Open the site, submit a test booking, then sign in at `/admin/login` with
   the owner account.

## 4. Post-deploy smoke test

```text
GET  /api/health                     -> 200 {"status":"ok"}
GET  /api/vehicles                   -> 6 seeded vehicles
POST /api/bookings                   -> 201 with id and createdAt
POST /api/bookings/lookup            -> 200 when UUID + phone match, 404 otherwise
POST /api/auth/login                 -> 200 with token
GET  /api/bookings        (Bearer)   -> 200 page of bookings
PATCH /api/bookings/{id}  (Bearer)   -> 200 with updated status
GET  /api/admin/vehicles  (Bearer)   -> 200 all vehicles
```

Also check the browser console for CORS errors: the frontend origin must be in
`CORS_ALLOWED_ORIGINS`, exactly as `https://…` with no trailing slash.

## 5. Operational notes

- **No online payments**: bookings are requests; the concierge confirms fare and
  payment offline. Do not add card fields without a PCI-compliant provider.
- **Driver trip sheet, no GPS**: assigned drivers open `/driver/trip` with the
  booking reference + their phone, and can mark the trip started/completed.
  Live GPS sharing is still labelled as coming soon.
- **Rotate the owner password** from `/admin/settings` immediately after the
  first production login; an admin password typed into a chat or committed to
  local config should be treated as compromised.
- **Backups**: Supabase free tier includes limited backups. Export the
  `bookings` table periodically until a paid backup policy exists.
- **Logs**: Render keeps recent logs; the app writes to stdout.
- **Uptime**: free Render services sleep. If you need always-on, a small VPS or
  Render Starter instance is the next step.

## 6. Alternative hosts

The backend is a standard Docker image:

```bash
docker build -t royal-travels-api .
docker run --rm -p 8081:8081 --env-file .env royal-travels-api
```

Any container host (Railway, Fly.io, Koyeb, a VPS) works with the same env
variables. Vercel can host the Next.js frontend unchanged, or any Node host can
run `npm run build && npm start`.
