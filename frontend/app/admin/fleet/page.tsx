"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  ApiError,
  Vehicle,
  VehiclePayload,
  VehicleStatus,
  createVehicle,
  deleteVehicle,
  getAdminVehicles,
  updateVehicle,
} from "@/lib/api";
import { clearAdminSession, getAdminToken } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

const STATUSES: VehicleStatus[] = ["active", "maintenance", "inactive"];

interface FormState {
  name: string;
  category: string;
  plateNumber: string;
  capacity: string;
  luggageCapacity: string;
  tariffPerKm: string;
  tariffLocal: string;
  imageUrl: string;
  status: VehicleStatus;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "Sedan",
  plateNumber: "",
  capacity: "4",
  luggageCapacity: "",
  tariffPerKm: "",
  tariffLocal: "",
  imageUrl: "",
  status: "active",
};

function toForm(vehicle: Vehicle): FormState {
  return {
    name: vehicle.name,
    category: vehicle.category,
    plateNumber: vehicle.plateNumber,
    capacity: String(vehicle.capacity),
    luggageCapacity: vehicle.luggageCapacity ?? "",
    tariffPerKm: String(vehicle.tariffPerKm ?? ""),
    tariffLocal:
      vehicle.tariffLocal === null || vehicle.tariffLocal === undefined
        ? ""
        : String(vehicle.tariffLocal),
    imageUrl: vehicle.imageUrl ?? "",
    status: vehicle.status,
  };
}

function toPayload(form: FormState): VehiclePayload {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    plateNumber: form.plateNumber.trim(),
    capacity: Number(form.capacity),
    luggageCapacity: form.luggageCapacity.trim() || undefined,
    tariffPerKm: Number(form.tariffPerKm),
    tariffLocal: form.tariffLocal ? Number(form.tariffLocal) : undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    status: form.status,
  };
}

export default function FleetInventoryPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState("All");

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
      setVehicles(await getAdminVehicles(token));
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not load the fleet.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, router]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vehicle of vehicles) {
      const value = vehicle.category.toLowerCase();
      const key = value.includes("sedan")
        ? "Sedan"
        : value.includes("mpv") || value.includes("suv")
        ? "MPV / SUV"
        : value.includes("van") || value.includes("coach")
        ? "Van / Coach"
        : "Other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [
      { label: "All", count: vehicles.length },
      ...["Sedan", "MPV / SUV", "Van / Coach", "Other"]
        .filter((key) => counts.has(key))
        .map((key) => ({ label: key, count: counts.get(key) ?? 0 })),
    ];
  }, [vehicles]);

  const filtered = useMemo(() => {
    if (group === "All") return vehicles;
    return vehicles.filter((vehicle) => {
      const value = vehicle.category.toLowerCase();
      const key = value.includes("sedan")
        ? "Sedan"
        : value.includes("mpv") || value.includes("suv")
        ? "MPV / SUV"
        : value.includes("van") || value.includes("coach")
        ? "Van / Coach"
        : "Other";
      return key === group;
    });
  }, [vehicles, group]);

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const avgTariff =
    vehicles.length === 0
      ? 0
      : vehicles.reduce((sum, v) => sum + Number(v.tariffPerKm), 0) / vehicles.length;

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setError(null);
  }

  function openEdit(vehicle: Vehicle) {
    setForm(toForm(vehicle));
    setEditingId(vehicle.id);
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
        await createVehicle(token, toPayload(form));
      } else if (editingId) {
        await updateVehicle(token, editingId, toPayload(form));
      }
      setEditingId(null);
      await load();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not save the vehicle.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(vehicle: Vehicle, status: VehicleStatus) {
    const token = getAdminToken();
    if (!token) return;
    setError(null);
    try {
      const updated = await updateVehicle(token, vehicle.id, {
        ...toPayload(toForm(vehicle)),
        status,
      });
      setVehicles((current) =>
        current.map((item) => (item.id === vehicle.id ? updated : item))
      );
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not update the vehicle.");
      }
    }
  }

  async function remove(vehicle: Vehicle) {
    if (!window.confirm(`Delete ${vehicle.name} (${vehicle.plateNumber})?`)) return;
    const token = getAdminToken();
    if (!token) return;
    setError(null);
    try {
      await deleteVehicle(token, vehicle.id);
      setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Could not delete the vehicle.");
      }
    }
  }

  return (
    <div>
      <AdminTopbar label="Executive Dispatch Desk" />
      <div className="p-6">
        <p className="eyebrow">Master Fleet Registry</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-ink">Fleet Inventory</h1>
            <p className="text-sm text-muted mt-1 max-w-lg">
              Vehicles shown here appear on the public fleet page when active.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="btn-secondary text-sm py-2.5">
              Refresh
            </button>
            <button onClick={openNew} className="btn-gold text-sm py-2.5">
              + Add Vehicle
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Stat label="Fleet size" value={String(vehicles.length)} sub="Registered vehicles" />
          <Stat label="Active" value={String(activeCount)} sub="Bookable online" />
          <Stat label="In maintenance" value={String(maintenanceCount)} sub="Not published" />
          <Stat label="Avg outstation rate" value={`${formatMoney(avgTariff)} / km`} sub="Across fleet" />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {editingId && (
          <form
            onSubmit={save}
            className="bg-white border border-line rounded-xl p-6 mt-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">
                {editingId === "new" ? "Add vehicle" : "Edit vehicle"}
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
              <Field label="Name">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              </Field>
              <Field label="Category">
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
              </Field>
              <Field label="Plate number">
                <input required value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="input" />
              </Field>
              <Field label="Capacity (seats)">
                <input required type="number" min={1} max={100} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input" />
              </Field>
              <Field label="Luggage capacity">
                <input value={form.luggageCapacity} onChange={(e) => setForm({ ...form, luggageCapacity: e.target.value })} className="input" placeholder="e.g. 4 large bags" />
              </Field>
              <Field label="Outstation rate (₹/km)">
                <input required type="number" min={0} step="0.01" value={form.tariffPerKm} onChange={(e) => setForm({ ...form, tariffPerKm: e.target.value })} className="input" />
              </Field>
              <Field label="Local package (₹, 4h/40km)">
                <input type="number" min={0} step="0.01" value={form.tariffLocal} onChange={(e) => setForm({ ...form, tariffLocal: e.target.value })} className="input" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })} className="input capitalize">
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="Image URL">
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="input" placeholder="https://…" />
              </Field>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={saving} className="btn-gold text-sm py-2.5 disabled:opacity-60">
                {saving ? "Saving…" : "Save vehicle"}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-2.5">
                Cancel
              </button>
            </div>
            <style jsx>{`
              .input {
                width: 100%;
                border: 1px solid #e1dacb;
                border-radius: 0.375rem;
                padding: 0.6rem 0.75rem;
                font-size: 0.875rem;
                background: #f6f2ea;
                color: #17140f;
              }
            `}</style>
          </form>
        )}

        <div className="flex flex-wrap gap-2 mt-6 mb-4">
          {groups.map((item) => (
            <button
              key={item.label}
              onClick={() => setGroup(item.label)}
              className={`text-sm px-4 py-2 rounded-md transition-colors ${
                group === item.label
                  ? "bg-gold text-ink font-medium"
                  : "bg-white border border-line text-ink/70 hover:bg-sage/50"
              }`}
            >
              {item.label} <span className="opacity-60">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading && <p className="text-sm text-muted bg-white border border-line rounded-xl p-6">Loading fleet…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted bg-white border border-line rounded-xl p-6">
              No vehicles in this group.
            </p>
          )}
          {filtered.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white border border-line rounded-xl p-5 flex flex-wrap md:flex-nowrap items-center gap-5"
            >
              <div className="min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink text-sm">{vehicle.name}</span>
                  <span className="text-[10px] bg-gold/20 text-goldDeep px-2 py-0.5 rounded-full capitalize">
                    {vehicle.status}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1 font-mono">
                  {vehicle.plateNumber}
                </div>
              </div>

              <div className="min-w-[140px]">
                <div className="text-sm text-ink">{vehicle.category}</div>
                <div className="text-xs text-muted">
                  👤 {vehicle.capacity} pax
                </div>
              </div>

              <div className="min-w-[140px] text-xs text-ink/70">
                🧳 {vehicle.luggageCapacity || "—"}
              </div>

              <div className="min-w-[200px] text-xs text-ink/70">
                {formatMoney(vehicle.tariffPerKm)}/km outstation
                <br />
                {formatMoney(vehicle.tariffLocal)} local
              </div>

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={vehicle.status}
                  onChange={(event) =>
                    quickStatus(vehicle, event.target.value as VehicleStatus)
                  }
                  className="text-xs border border-line rounded-md px-2 py-1.5 bg-cream capitalize"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  onClick={() => openEdit(vehicle)}
                  className="text-xs border border-line rounded-md px-3 py-1.5 hover:bg-sage/50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(vehicle)}
                  className="text-xs text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
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
      <p className="text-xs text-muted mt-1">{sub}</p>
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
