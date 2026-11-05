#!/usr/bin/env node
/**
 * End-to-end smoke test against a running API.
 *
 *   API_BASE_URL=http://localhost:8081 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node scripts/e2e-smoke.mjs
 *
 * Exercises the whole public + admin surface the way the frontend does and
 * prints a PASS/FAIL line per check. Exits non-zero on the first failure so it
 * can be used as a post-deploy gate.
 */

const BASE = (process.env.API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(path, { method = "GET", body, token, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, headers: res.headers, json, text };
}

const phone = "+919999000111";
const stamp = Date.now();
let bookingId = null;

// ---------------------------------------------------------------- public API
const health = await call("/api/health");
check("health endpoint returns ok", health.status === 200 && health.json?.status === "ok", JSON.stringify(health.json));
check("health reports database up", health.json?.database === "up");

const vehicles = await call("/api/vehicles");
check("public fleet lists vehicles", vehicles.status === 200 && Array.isArray(vehicles.json) && vehicles.json.length > 0,
  `count=${vehicles.json?.length}`);
check("fleet response is cacheable", (vehicles.headers.get("cache-control") ?? "").includes("max-age=60"),
  vehicles.headers.get("cache-control") ?? "missing");

const created = await call("/api/bookings", {
  method: "POST",
  body: {
    serviceType: "airport",
    name: `E2E Smoke ${stamp}`,
    phone,
    email: "e2e@example.com",
    pickupLocation: "Bengaluru",
    dropLocation: "Kempegowda Airport",
    transferType: "Departure",
    flightNumber: "6E 1234",
    pickupDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    pickupTime: "10:30",
    passengers: "2",
  },
});
bookingId = created.json?.id ?? null;
check("create booking returns 201", created.status === 201, `status=${created.status} ${created.text.slice(0, 120)}`);
check("booking has server-generated id", typeof bookingId === "string" && bookingId.length === 36);
check("booking has createdAt timestamp", Boolean(created.json?.createdAt));
check("booking starts as new/pending", created.json?.status === "new" && created.json?.paymentStatus === "pending");

const lookupOk = await call("/api/bookings/lookup", {
  method: "POST",
  body: { id: bookingId, phone },
});
check("lookup with correct phone succeeds", lookupOk.status === 200 && lookupOk.json?.id === bookingId);

const lookupBad = await call("/api/bookings/lookup", {
  method: "POST",
  body: { id: bookingId, phone: "+919999000000" },
});
check("lookup with wrong phone is rejected", lookupBad.status === 404);

const invalid = await call("/api/bookings", {
  method: "POST",
  body: { serviceType: "teleport", name: "", phone: "abc" },
});
check("invalid booking rejected with 400", invalid.status === 400);
check("validation errors are field-mapped", Boolean(invalid.json?.errors), JSON.stringify(invalid.json?.errors ?? {}));

const noAuth = await call("/api/bookings");
check("admin list requires auth", noAuth.status === 401);

const preflight = await call("/api/bookings", {
  method: "OPTIONS",
  headers: {
    Origin: "http://localhost:3000",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
});
check("CORS preflight allowed for the web origin",
  preflight.status === 200 && preflight.headers.get("access-control-allow-origin") === "http://localhost:3000",
  `status=${preflight.status} origin=${preflight.headers.get("access-control-allow-origin")}`);

// --------------------------------------------------------------- admin API
if (!EMAIL || !PASSWORD) {
  console.log("SKIP  admin checks — set ADMIN_EMAIL and ADMIN_PASSWORD");
} else {
  const badLogin = await call("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: "definitely-wrong" },
  });
  check("wrong password rejected", badLogin.status === 401 || badLogin.status === 403, `status=${badLogin.status}`);

  const login = await call("/api/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  const token = login.json?.token;
  check("admin login returns a token", login.status === 200 && typeof token === "string" && token.split(".").length === 3,
    `status=${login.status}`);

  const list = await call("/api/bookings?size=5", { token });
  check("admin can list bookings", list.status === 200 && Array.isArray(list.json?.content), `status=${list.status}`);
  check("list is paginated", typeof list.json?.totalElements === "number" && list.json?.pageable?.pageSize === 5);

  const search = await call(`/api/bookings?q=${stamp}`, { token });
  check("admin search finds the new booking",
    search.status === 200 && (search.json?.content ?? []).some((b) => b.id === bookingId));

  const patched = await call(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    token,
    body: { status: "contacted", paymentStatus: "paid" },
  });
  check("admin can update booking status", patched.status === 200 && patched.json?.status === "contacted" && patched.json?.paymentStatus === "paid");

  const badPatch = await call(`/api/bookings/${bookingId}`, { method: "PATCH", token, body: { status: "hacked" } });
  check("invalid status value rejected", badPatch.status === 400);

  const adminVehicles = await call("/api/admin/vehicles", { token });
  check("admin can list all vehicles", adminVehicles.status === 200 && (adminVehicles.json?.length ?? 0) > 0);

  const newVehicle = await call("/api/admin/vehicles", {
    method: "POST",
    token,
    body: {
      name: "E2E Test Van",
      category: "Van",
      plateNumber: `E2E-${stamp}`,
      capacity: 8,
      luggageCapacity: "6 bags",
      tariffPerKm: 22.5,
      tariffLocal: 3000,
      status: "active",
    },
  });
  check("admin can create a vehicle", newVehicle.status === 201 && Boolean(newVehicle.json?.id), `status=${newVehicle.status}`);

  const vehicleId = newVehicle.json?.id;
  if (vehicleId) {
    const updated = await call(`/api/admin/vehicles/${vehicleId}`, {
      method: "PUT",
      token,
      body: {
        name: "E2E Test Van (updated)",
        category: "Van",
        plateNumber: `E2E-${stamp}`,
        capacity: 10,
        luggageCapacity: "8 bags",
        tariffPerKm: 25,
        tariffLocal: 3200,
        status: "maintenance",
      },
    });
    check("admin can update a vehicle", updated.status === 200 && updated.json?.capacity === 10);

    const removed = await call(`/api/admin/vehicles/${vehicleId}`, { method: "DELETE", token });
    check("admin can delete a vehicle", removed.status === 204, `status=${removed.status}`);
  }

  const docs = await call("/v3/api-docs");
  check("OpenAPI contract is served", docs.status === 200 && docs.json?.openapi?.startsWith("3."));
}

console.log(`\n${passed} passed, ${failed} failed  (${BASE})`);
process.exit(failed === 0 ? 0 : 1);
