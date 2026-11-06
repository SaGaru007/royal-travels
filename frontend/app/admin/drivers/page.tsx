"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  ApiError,
  Driver,
  DriverPayload,
  DriverStatus,
  Vehicle,
  createDriver,
  deleteDriver,
  getAdminVehicles,
  getDrivers,
  updateDriver,
} from "@/lib/api";
import { clearAdminSession, getAdminToken } from "@/lib/auth";

const STATUSES: DriverStatus[] = ["available", "on_trip", "off_duty"];

const STATUS_STYLES: Record<DriverStatus, string> = {
  available: "bg-emerald-50 text-emerald-700",
  on_trip: "bg-amber-50 text-amber-700",
  off_duty: "bg-sage/70 text-ink/60",
};

interface FormState {
  name: string;
  phone: string;
  rating: string;
  tripsCompleted: string;
  licenseVerified: boolean;
  status: DriverStatus;
  vehicleId: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  rating: "5",
  tripsCompleted: "0",
  licenseVerified: false,
  status: "available",
  vehicleId: "",
};

function toForm(driver: Driver): FormState {
  return {
    name: driver.name,
    phone: driver.phone,
    rating: String(driver.rating ?? 5),
    tripsCompleted: String(driver.tripsCompleted ?? 0),
    licenseVerified: Boolean(driver.licenseVerified),
    status: driver.status,
    vehicleId: driver.vehicleId ?? "",
  };
}

function toPayload(form: FormState): DriverPayload {
  return {
    name: form.name.trim(),
    phone: form.phone.replace(/[^\d+]/g, ""),
    rating: form.rating === "" ? undefined : Number(form.rating),
    tripsCompleted:
      form.tripsCompleted === "" ? undefined : Number(form.tripsCompleted),
    licenseVerified: form.licenseVerified,
    status: form.status,
    vehicleId: form.vehicleId || null,
  };
}

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [roster, fleet] = await Promise.all([
        getDrivers(token),
        getAdminVehicles(token),
      ]);
      setDrivers(roster);
      setVehicles(fleet);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not load the driver roster.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, router]);

  useEffect(() => {
    load();
  }, [load]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const stats = useMemo(() => {
    const available = drivers.filter((driver) => driver.status === "available").length;
    const onTrip = drivers.filter((driver) => driver.status === "on_trip").length;
    const verified = drivers.filter((driver) => driver.licenseVerified).length;
    return { available, onTrip, verified };
  }, [drivers]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setError(null);
  }

  function openEdit(driver: Driver) {
    setForm(toForm(driver));
    setEditingId(driver.id);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        await createDriver(token, toPayload(form));
      } else if (editingId) {
        await updateDriver(token, editingId, toPayload(form));
      }
      setEditingId(null);
      await load();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not save the driver.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(driver: Driver, status: DriverStatus) {
    const token = getAdminToken();
    if (!token) return;
    setError(null);
    try {
      const updated = await updateDriver(token, driver.id, {
        ...toPayload(toForm(driver)),
        status,
      });
      setDrivers((current) =>
        current.map((item) => (item.id === driver.id ? updated : item))
      );
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not update the driver.");
      }
    }
  }

  async function remove(driver: Driver) {
    if (!window.confirm(`Remove ${driver.name} from the roster?`)) return;
    const token = getAdminToken();
    if (!token) return;
    setError(null);
    try {
      await deleteDriver(token, driver.id);
      setDrivers((current) => current.filter((item) => item.id !== driver.id));
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not remove the driver.");
      }
    }
  }

  const inputClass =
    "w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm text-ink";

  return (
    <div>
      <AdminTopbar label="Executive Dispatch Desk" />
      <div className="p-6">
        <p className="eyebrow">Chauffeur Roster</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-ink">Drivers</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Assign a driver to a booking, then send the trip to their WhatsApp in
              one click. Drivers open the same trip sheet on their phone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="btn-secondary text-sm py-2.5">
              Refresh
            </button>
            <button onClick={openNew} className="btn-gold text-sm py-2.5">
              + Add Driver
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Stat label="Roster size" value={String(drivers.length)} sub="Registered chauffeurs" />
          <Stat label="Available" value={String(stats.available)} sub="Ready for dispatch" />
          <Stat label="On trip" value={String(stats.onTrip)} sub="Currently driving" />
          <Stat label="License verified" value={String(stats.verified)} sub="Documents checked" />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {editingId && (
          <form onSubmit={save} className="bg-white border border-line rounded-xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">
                {editingId === "new" ? "Add driver" : "Edit driver"}
              </h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Full name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Ramesh Kumar"
                />
              </Field>
              <Field label="WhatsApp number">
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Assigned vehicle">
                <select
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">No vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} · {vehicle.plateNumber}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as DriverStatus })
                  }
                  className={`${inputClass} capitalize`}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rating (0-5)">
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Trips completed">
                <input
                  type="number"
                  min={0}
                  value={form.tripsCompleted}
                  onChange={(e) => setForm({ ...form, tripsCompleted: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={form.licenseVerified}
                onChange={(e) =>
                  setForm({ ...form, licenseVerified: e.target.checked })
                }
                className="h-4 w-4 accent-gold"
              />
              License and background check verified
            </label>
            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={saving} className="btn-gold text-sm py-2.5 disabled:opacity-60">
                {saving ? "Saving…" : "Save driver"}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-2.5">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3 mt-6">
          {loading && (
            <p className="text-sm text-muted bg-white border border-line rounded-xl p-6">
              Loading roster…
            </p>
          )}
          {!loading && drivers.length === 0 && (
            <div className="text-sm text-muted bg-white border border-line rounded-xl p-6">
              No drivers yet. Add your first chauffeur to start assigning trips.
            </div>
          )}
          {drivers.map((driver) => {
            const vehicle = driver.vehicleId
              ? vehicleById.get(driver.vehicleId)
              : undefined;
            return (
              <div
                key={driver.id}
                className="bg-white border border-line rounded-xl p-5 flex flex-wrap md:flex-nowrap items-center gap-5"
              >
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink text-sm">{driver.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[driver.status]}`}
                    >
                      {driver.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-1">{driver.phone}</div>
                </div>

                <div className="min-w-[160px] text-xs text-ink/70">
                  <div>{vehicle ? `${vehicle.name} · ${vehicle.plateNumber}` : "No vehicle assigned"}</div>
                  <div className="text-muted mt-0.5">
                    {driver.licenseVerified ? "✓ License verified" : "License not verified"}
                  </div>
                </div>

                <div className="min-w-[140px] text-xs text-ink/70">
                  <div>★ {Number(driver.rating ?? 0).toFixed(1)} rating</div>
                  <div className="text-muted mt-0.5">
                    {driver.tripsCompleted ?? 0} trips completed
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={driver.status}
                    onChange={(event) =>
                      quickStatus(driver, event.target.value as DriverStatus)
                    }
                    className="text-xs border border-line rounded-md px-2 py-1.5 bg-cream capitalize"
                    aria-label={`Status for ${driver.name}`}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => openEdit(driver)}
                    className="text-xs border border-line rounded-md px-3 py-1.5 hover:bg-sage/50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(driver)}
                    className="text-xs text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-line rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-ink mb-2">How driver handoff works</h2>
          <ol className="text-sm text-ink/70 space-y-2 list-decimal list-inside">
            <li>Add the driver here with the WhatsApp number they actually use.</li>
            <li>On the Bookings page, pick that driver in the row&apos;s driver column.</li>
            <li>Click <b>WhatsApp driver</b> — the full trip message opens, pre-filled.</li>
            <li>Press Send in WhatsApp. The message includes a link to the driver trip sheet.</li>
            <li>The driver marks the trip started/completed, which updates customer tracking.</li>
          </ol>
          <p className="text-xs text-muted mt-4">
            This uses WhatsApp&apos;s free click-to-chat link, so there is no Business
            API, template approval, or per-message charge. Automatic sending without
            pressing Send requires the paid WhatsApp Business Cloud API.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <p className="text-[11px] uppercase tracking-wide text-muted mb-2">{label}</p>
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs mt-1 text-muted">{sub}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
