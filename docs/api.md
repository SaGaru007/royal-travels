# API reference

**Base URL (local):** `http://localhost:8081`
**Base URL (production):** the Render service URL, for example
`https://royal-travels-api.onrender.com`
**Content type:** `application/json` unless stated otherwise
**OpenAPI:** `/v3/api-docs` · **Swagger UI:** `/swagger-ui.html`

The OpenAPI document is generated from the running application, so it is always
more current than this page. This page explains the contract, the rules behind
it, and the error behaviour that generated docs often omit.

---

## 1. Conventions

### 1.1 Paths

All application routes are under `/api`. The only exception is the Swagger UI
and OpenAPI document, which are served by springdoc at the root.

### 1.2 Authentication

Admin and customer routes require a bearer token:

```http
Authorization: Bearer <jwt>
```

- Tokens are HMAC-SHA signed and expire after **8 hours**.
- Roles are stored lowercase in the token (`owner`, `staff`, `customer`) and
  mapped to `ROLE_OWNER`, `ROLE_STAFF`, `ROLE_CUSTOMER`.
- There is no refresh token and no server-side session. Signing in again issues
  a new token.
- Rotating `JWT_SECRET` invalidates every issued token immediately.

### 1.3 Public routes

Only these routes are unauthenticated. Everything else requires a token.

| Method | Path |
|---|---|
| `GET` | `/api/health` |
| `POST` | `/api/auth/login` |
| `POST` | `/api/auth/customer/signup` |
| `POST` | `/api/auth/customer/login` |
| `POST` | `/api/bookings` |
| `POST` | `/api/bookings/lookup` |
| `GET` | `/api/vehicles` |
| `GET` | `/api/vehicles/{id}` |
| `POST` | `/api/driver/trips/lookup` |
| `PATCH` | `/api/driver/trips/{id}/stage` |
| `GET` | `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs/**` |
| `OPTIONS` | `/**` (CORS preflight) |

A new endpoint is **private by default**. Adding a public route requires an
explicit matcher in `SecurityConfig`.

### 1.4 Identifiers

All primary keys are UUID v4 strings. Booking references shown in the UI are
derived from the first 8 hex characters (`RT-XXXXXXXX`) but the API always uses
the full UUID.

### 1.5 Phone numbers

Phone numbers are accepted with or without `+` and with spaces. Validation
requires **10–15 digits**. Verification compares digits only and matches the
last 10 digits in either direction, so `+91 98765 43210`, `919876543210`, and
`9876543210` are treated as the same number.

### 1.6 Error format

Application errors use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)
`application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Invalid request",
  "status": 400,
  "detail": "Validation failed",
  "errors": {
    "phone": "Phone must contain 10-15 digits, optionally starting with +"
  }
}
```

`errors` is present only for Bean Validation failures.

Two exceptions to the format:

- **401 from the security filter chain** is produced before the controller and
  is a plain servlet error body (`{"timestamp": "...", "status": 401, ...}`).
- **429** is an RFC 7807 body produced by `RateLimitFilter`.

### 1.7 Rate limits

Fixed window, per client IP, applied to unauthenticated writes only:

| Route | Limit | Window |
|---|---|---|
| `POST /api/auth/login` | 10 | 5 minutes |
| `POST /api/auth/customer/login` | 10 | 5 minutes |
| `POST /api/auth/customer/signup` | 5 | 1 hour |
| `POST /api/bookings` | 20 | 10 minutes |
| `POST /api/bookings/lookup` | 60 | 10 minutes |
| `POST /api/driver/trips/lookup` | 60 | 10 minutes |

When exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 247
Content-Type: application/problem+json
```

```json
{
  "type": "about:blank",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Too many requests. Please try again in a moment.",
  "retryAfterSeconds": 247
}
```

The limiter is in-process and per instance. See
[ADR 0007](adr/0007-single-instance-cache-and-limiter.md).

---

## 2. Endpoint summary

| Method | Path | Auth | Success | Notes |
|---|---|---|---|---|
| `GET` | `/api/health` | — | 200 | Liveness + database check |
| `POST` | `/api/auth/login` | — | 200 | Admin login |
| `POST` | `/api/auth/customer/signup` | — | 201 | Create customer account |
| `POST` | `/api/auth/customer/login` | — | 200 | Customer login |
| `GET` | `/api/customer/me` | CUSTOMER | 200 | Profile |
| `GET` | `/api/customer/bookings` | CUSTOMER | 200 | Booking history |
| `POST` | `/api/bookings` | — | 201 | Create booking |
| `POST` | `/api/bookings/lookup` | — | 200 | Reference + phone |
| `GET` | `/api/bookings` | OWNER/STAFF | 200 | Paginated list |
| `GET` | `/api/bookings/{id}` | OWNER/STAFF | 200 | Single booking |
| `PATCH` | `/api/bookings/{id}` | OWNER/STAFF | 200 | Partial update |
| `GET` | `/api/vehicles` | — | 200 | Active fleet |
| `GET` | `/api/vehicles/{id}` | — | 200 | Single active vehicle |
| `GET` | `/api/admin/vehicles` | OWNER/STAFF | 200 | All vehicles |
| `POST` | `/api/admin/vehicles` | OWNER/STAFF | 201 | Create vehicle |
| `PUT` | `/api/admin/vehicles/{id}` | OWNER/STAFF | 200 | Full update |
| `DELETE` | `/api/admin/vehicles/{id}` | OWNER/STAFF | 204 | Delete |
| `GET` | `/api/admin/drivers` | OWNER/STAFF | 200 | Roster |
| `POST` | `/api/admin/drivers` | OWNER/STAFF | 201 | Add driver |
| `PUT` | `/api/admin/drivers/{id}` | OWNER/STAFF | 200 | Update driver |
| `DELETE` | `/api/admin/drivers/{id}` | OWNER/STAFF | 204 | Remove unassigned driver |
| `POST` | `/api/admin/password` | OWNER/STAFF | 204 | Change password |
| `POST` | `/api/driver/trips/lookup` | — | 200 | Trip sheet |
| `PATCH` | `/api/driver/trips/{id}/stage` | — | 200 | Start/complete trip |

---

## 3. Enumerations

| Field | Values |
|---|---|
| `serviceType` | `outstation`, `local`, `airport`, `callback` |
| `status` | `new`, `contacted`, `confirmed`, `completed`, `cancelled` |
| `paymentStatus` | `pending`, `paid` |
| `tripStage` | `assigned`, `started`, `completed` |
| Vehicle `status` | `active`, `maintenance`, `inactive` |
| Driver `status` | `available`, `on_trip`, `off_duty` |

The database enforces the same values with `CHECK` constraints, so an invalid
value cannot be written even by a direct SQL client.

---

## 4. Health

### `GET /api/health`

Public. Opens a real database connection with a 2-second validity timeout.

```json
{
  "status": "ok",
  "app": "RoyalTravels",
  "database": "up",
  "timestamp": "2026-11-06T10:15:30.123Z"
}
```

`status` is `ok` when the database is reachable and `degraded` otherwise. The
HTTP status remains `200` in both cases; monitoring should check the `database`
field, not only the status code. This endpoint is also used by Render's health
check and by an external keep-alive ping.

---

## 5. Authentication

### 5.1 Admin login

`POST /api/auth/login`

```json
{
  "email": "owner@example.com",
  "password": "correct horse battery staple"
}
```

`200 OK`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "name": "Owner",
  "role": "owner"
}
```

| Status | When |
|---|---|
| 200 | Credentials valid |
| 400 | Missing or malformed email/password |
| 401 | Unknown email **or** wrong password (same message) |
| 429 | More than 10 attempts in 5 minutes |

### 5.2 Customer signup

`POST /api/auth/customer/signup`

```json
{
  "name": "Ananya Rao",
  "email": "ananya@example.com",
  "phone": "+919876543210",
  "password": "a-strong-password"
}
```

`201 Created`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "name": "Ananya Rao",
  "email": "ananya@example.com",
  "role": "customer"
}
```

| Status | When |
|---|---|
| 201 | Account created |
| 400 | Validation failure (password must be 8–72 characters) |
| 409 | Email already registered |
| 429 | More than 5 signups per hour from one IP |

### 5.3 Customer login

`POST /api/auth/customer/login` — same body and response as signup, without
`name` in the request.

| Status | When |
|---|---|
| 200 | Credentials valid |
| 401 | Invalid email or password (same message) |
| 429 | More than 10 attempts in 5 minutes |

### 5.4 Current customer

`GET /api/customer/me` — requires `ROLE_CUSTOMER`.

```json
{
  "id": "8f4a...",
  "name": "Ananya Rao",
  "email": "ananya@example.com",
  "phone": "+919876543210",
  "createdAt": "2026-10-01T09:00:00Z"
}
```

### 5.5 Customer booking history

`GET /api/customer/bookings` — requires `ROLE_CUSTOMER`.

Returns every booking whose phone number matches the account's last 10 digits,
newest first. Guest bookings made before signup are included by design.

### 5.6 Change admin password

`POST /api/admin/password` — requires `OWNER` or `STAFF`.

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-strong-password"
}
```

| Status | When |
|---|---|
| 204 | Password changed |
| 400 | Current password wrong, or new password outside 8–72 characters |
| 401 | Token missing/expired, or the account no longer exists |

The current password is required so a stolen session token cannot lock the owner
out. Existing tokens are not revoked; they expire within 8 hours.

---

## 6. Bookings

### 6.1 Create a booking

`POST /api/bookings` — public, rate limited to 20 per 10 minutes.

Required fields: `serviceType`, `name`, `phone`. Everything else depends on the
service type and the business rules in
[product.md §5](product.md#5-business-rules).

```json
{
  "serviceType": "outstation",
  "name": "Ananya Rao",
  "phone": "+919876543210",
  "email": "ananya@example.com",
  "pickupLocation": "Indiranagar, Bengaluru",
  "dropLocation": "Coorg, Karnataka",
  "tripType": "round-trip",
  "pickupDate": "2026-12-12",
  "returnDate": "2026-12-14",
  "pickupTime": "06:00",
  "vehiclePreference": "SUV",
  "passengers": "4",
  "notes": "Two large suitcases"
}
```

`201 Created`:

```json
{
  "id": "3d6f0c1e-9a2b-4c7d-8e1f-2a3b4c5d6e7f",
  "createdAt": "2026-11-06T10:20:00.000Z",
  "serviceType": "outstation",
  "name": "Ananya Rao",
  "phone": "+919876543210",
  "email": "ananya@example.com",
  "pickupLocation": "Indiranagar, Bengaluru",
  "dropLocation": "Coorg, Karnataka",
  "tripType": "round-trip",
  "returnDate": "2026-12-14",
  "packageType": null,
  "transferType": null,
  "flightNumber": null,
  "pickupDate": "2026-12-12",
  "pickupTime": "06:00:00",
  "vehiclePreference": "SUV",
  "passengers": "4",
  "preferredCallTime": null,
  "notes": "Two large suitcases",
  "baseFare": null,
  "totalFare": null,
  "advanceAmount": null,
  "paymentStatus": "pending",
  "status": "new",
  "tripStage": "assigned",
  "driverId": null
}
```

Server-owned fields (`id`, `createdAt`, `status`, `paymentStatus`, `tripStage`,
fares, `driverId`) are ignored if sent by a client. They are not part of the
request record.

| Status | When |
|---|---|
| 201 | Booking created |
| 400 | Validation or business-rule failure |
| 409 | Identical booking from the same guest within 10 minutes |
| 429 | More than 20 requests per 10 minutes |

The `409` detail includes the first 8 characters of the original reference:

```json
{
  "title": "Request failed",
  "status": 409,
  "detail": "This booking was already received (reference 3D6F0C1E). Check your confirmation page, or call us if you need changes."
}
```

### 6.2 Confirm or track a booking

`POST /api/bookings/lookup` — public, rate limited to 60 per 10 minutes.

```json
{
  "id": "3d6f0c1e-9a2b-4c7d-8e1f-2a3b4c5d6e7f",
  "phone": "+919876543210"
}
```

Returns the full booking on a match. Returns `404` with `"Booking not found"` for
both a missing booking and a wrong phone — the response does not reveal which.

| Status | When |
|---|---|
| 200 | UUID exists and phone matches |
| 400 | Missing/invalid UUID or blank phone |
| 404 | Booking not found or phone mismatch |
| 429 | More than 60 lookups per 10 minutes |

### 6.3 List bookings (admin)

`GET /api/bookings` — requires `OWNER` or `STAFF`.

Query parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `status` | all | Exact status filter |
| `q` | all | Case-insensitive contains on name, email, or phone |
| `page` | `0` | Zero-based page number |
| `size` | `50` | Page size (frontend uses 100) |
| `sort` | `createdAt,desc` | Spring Data sort syntax |

Example:

```http
GET /api/bookings?status=confirmed&q=ananya&page=0&size=25&sort=createdAt,desc
```

Response is a Spring `Page`:

```json
{
  "content": [ { "...": "BookingResponse" } ],
  "totalElements": 42,
  "totalPages": 2,
  "number": 0,
  "size": 25,
  "first": true,
  "last": false,
  "empty": false
}
```

### 6.4 Get one booking (admin)

`GET /api/bookings/{id}` — requires `OWNER` or `STAFF`.
`200` with the booking, or `404`.

### 6.5 Update a booking (admin)

`PATCH /api/bookings/{id}` — requires `OWNER` or `STAFF`.

Only these fields are accepted. Omitted fields are unchanged.

```json
{
  "status": "confirmed",
  "paymentStatus": "paid",
  "tripStage": "assigned",
  "driverId": "b1c2d3e4-..."
}
```

| Field | Allowed values |
|---|---|
| `status` | `new`, `contacted`, `confirmed`, `completed`, `cancelled` |
| `paymentStatus` | `pending`, `paid` |
| `tripStage` | `assigned`, `started`, `completed` |
| `driverId` | A driver UUID, or `""` to unassign |

To unassign:

```json
{ "driverId": "" }
```

| Status | When |
|---|---|
| 200 | Updated |
| 400 | Invalid enum value or malformed UUID |
| 404 | Booking or driver not found |

There is no transition validation: an admin may move a booking from any status
to any other status. This is deliberate for a small agency where offline events
(payment received, customer no-show) do not arrive in order. The driver-facing
route, by contrast, refuses to restart a completed trip.

---

## 7. Fleet

### 7.1 Public fleet

`GET /api/vehicles` — public. Returns **active** vehicles only.

Response headers include:

```http
Cache-Control: max-age=60
```

The server also serves this from a 60-second in-process snapshot. Any admin
vehicle write invalidates the snapshot immediately.

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Executive Sedan",
    "category": "Sedan",
    "plateNumber": "KA-01-MJ-4210",
    "capacity": 4,
    "luggageCapacity": "3 bags",
    "tariffPerKm": 14.00,
    "tariffLocal": 1850.00,
    "imageUrl": "https://images.unsplash.com/...",
    "status": "active"
  }
]
```

### 7.2 Public vehicle

`GET /api/vehicles/{id}` — public. Returns the vehicle only if it is active;
otherwise `404`.

### 7.3 Admin fleet

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/admin/vehicles` | All vehicles, any status, sorted by name |
| `POST` | `/api/admin/vehicles` | Create, `201` |
| `PUT` | `/api/admin/vehicles/{id}` | Full update, `200` |
| `DELETE` | `/api/admin/vehicles/{id}` | `204`, or `409` if a driver references it |

Create/update body:

```json
{
  "name": "Executive Sedan",
  "category": "Sedan",
  "plateNumber": "KA-01-MJ-4210",
  "capacity": 4,
  "luggageCapacity": "3 bags",
  "tariffPerKm": 14.00,
  "tariffLocal": 1850.00,
  "imageUrl": "https://...",
  "status": "active"
}
```

Validation: `capacity` 1–100, `tariffPerKm >= 0`, `status` one of the three
values. `plateNumber` is unique at the database level; a duplicate returns `409`.

`PUT` is a full replacement. If `status` is omitted, the existing status is
preserved rather than silently reactivated.

---

## 8. Drivers

All routes require `OWNER` or `STAFF`.

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/admin/drivers` | Roster sorted by name |
| `POST` | `/api/admin/drivers` | Add driver, `201` |
| `PUT` | `/api/admin/drivers/{id}` | Update, `200` |
| `DELETE` | `/api/admin/drivers/{id}` | `204`, or `409` if assigned to a booking |

Body:

```json
{
  "name": "Ravi Kumar",
  "phone": "+919812345678",
  "rating": 4.8,
  "tripsCompleted": 120,
  "licenseVerified": true,
  "status": "available",
  "vehicleId": "a1b2c3d4-..."
}
```

| Field | Rules |
|---|---|
| `name` | Required, max 120 |
| `phone` | Required, 10–15 digits, unique |
| `rating` | 0.0–5.0, defaults to 5.0 |
| `tripsCompleted` | ≥ 0, defaults to 0 |
| `licenseVerified` | Defaults to `false` |
| `status` | `available`, `on_trip`, `off_duty`; defaults to `available` |
| `vehicleId` | Optional; must reference an existing vehicle |

`409` is returned for a duplicate phone and for deleting a driver who is still
assigned to bookings. Reassign those trips first.

---

## 9. Driver trip sheet

These routes are public but are authorised by **the booking reference plus the
phone number of the driver assigned to that booking**. They are rate limited like
the customer lookup.

### 9.1 Open a trip sheet

`POST /api/driver/trips/lookup`

```json
{
  "id": "3d6f0c1e-9a2b-4c7d-8e1f-2a3b4c5d6e7f",
  "phone": "+919812345678"
}
```

`200 OK`:

```json
{
  "booking": { "...": "BookingResponse" },
  "driverName": "Ravi Kumar"
}
```

| Status | When |
|---|---|
| 200 | Booking exists, a driver is assigned, and the phone matches |
| 400 | Missing/invalid UUID or blank phone |
| 404 | No booking, no assigned driver, or wrong phone (same message) |
| 429 | More than 60 lookups per 10 minutes |

### 9.2 Start or complete a trip

`PATCH /api/driver/trips/{id}/stage`

```json
{
  "phone": "+919812345678",
  "stage": "started"
}
```

Allowed stages: `started`, `completed`.

Effects:

| Stage | Booking | Driver |
|---|---|---|
| `started` | `tripStage=started`; `status=confirmed` unless already completed | `status=on_trip` |
| `completed` | `tripStage=completed`; `status=completed` | `status=available`; `tripsCompleted` incremented once |

| Status | When |
|---|---|
| 200 | Stage updated |
| 400 | Invalid stage or phone missing |
| 404 | Trip/driver/phone mismatch |
| 409 | Trying to start a trip that is already completed |

The customer's `/track` page picks up the change on its next 30-second refresh.

---

## 10. Status codes used

| Code | Meaning in this API |
|---|---|
| 200 | Read or update succeeded |
| 201 | Resource created |
| 204 | Deleted or password changed; no body |
| 400 | Validation, malformed JSON, bad enum, bad UUID, business rule |
| 401 | Missing/expired token, or invalid credentials |
| 403 | Authenticated but wrong role |
| 404 | Not found, or deliberately indistinguishable from a wrong secret |
| 409 | Duplicate phone/email/booking, or a delete blocked by references |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error (details are not leaked to clients) |

---

## 11. Examples

### 11.1 Create a booking with curl

```bash
curl -X POST http://localhost:8081/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "airport",
    "name": "Ananya Rao",
    "phone": "+919876543210",
    "pickupLocation": "HSR Layout, Bengaluru",
    "dropLocation": "Kempegowda International Airport",
    "transferType": "Departure",
    "flightNumber": "6E 2247",
    "pickupDate": "2026-12-02",
    "pickupTime": "04:30",
    "passengers": "2"
  }'
```

### 11.2 Admin login and list bookings

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"..."}' | jq -r .token)

curl -s "http://localhost:8081/api/bookings?status=new&size=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 11.3 Assign a driver

```bash
curl -X PATCH http://localhost:8081/api/bookings/<booking-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"driverId":"<driver-id>"}'
```

### 11.4 Driver opens and starts a trip

```bash
curl -X POST http://localhost:8081/api/driver/trips/lookup \
  -H "Content-Type: application/json" \
  -d '{"id":"<booking-id>","phone":"+919812345678"}'

curl -X PATCH http://localhost:8081/api/driver/trips/<booking-id>/stage \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919812345678","stage":"started"}'
```

---

## 12. Versioning and compatibility

The API is currently unversioned (`/api`, not `/api/v1`). For a single-client
deployment this is acceptable, but it means a breaking change must be coordinated
with the frontend in the same release.

Rules for changing the contract:

1. **Additive changes are safe**: new optional request fields, new response
   fields, new enum values (after updating both the Bean Validation pattern and
   the database `CHECK` constraint).
2. **Removing or renaming a field is breaking** and requires a coordinated
   frontend release.
3. **Changing validation** is a behaviour change; document it in `CHANGELOG.md`.
4. Update this document, the OpenAPI output, and the E2E suite together.

If external integrators are added later, introduce `/api/v1` and keep `/api` as
an alias until clients migrate.
