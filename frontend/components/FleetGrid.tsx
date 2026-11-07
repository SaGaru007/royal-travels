"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, Vehicle, getVehicles } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import FleetFilters from "./FleetFilters";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop";

const GROUP_ORDER = ["All", "Sedan", "MPV / SUV", "Van / Coach"];

function groupFor(category: string) {
  const value = category.toLowerCase();
  if (value.includes("sedan")) return "Sedan";
  if (value.includes("mpv") || value.includes("suv")) return "MPV / SUV";
  if (value.includes("van") || value.includes("coach")) return "Van / Coach";
  return "Other";
}

export default function FleetGrid({
  initialVehicles,
}: {
  /** Rendered on the server so the cards ship with the HTML. */
  initialVehicles?: Vehicle[];
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles ?? []);
  const [loading, setLoading] = useState(initialVehicles === undefined);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState("All");
  const [capacity, setCapacity] = useState("any");
  const [slow, setSlow] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getVehicles()
      .then((data) => setVehicles(data))
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the fleet. Please try again."
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // The server already embedded the catalogue; only fetch when it could not.
    if (initialVehicles !== undefined) return;
    load();
  }, []);

  // Free hosting sleeps when idle; after a few seconds say so instead of
  // leaving the visitor staring at a skeleton screen that looks broken.
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vehicle of vehicles) {
      const group = groupFor(vehicle.category);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return GROUP_ORDER.filter(
      (group) => group === "All" || counts.has(group)
    ).map((group) => ({
      value: group,
      label: group,
      count: group === "All" ? vehicles.length : counts.get(group) ?? 0,
    }));
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (activeGroup !== "All" && groupFor(vehicle.category) !== activeGroup) {
        return false;
      }
      if (capacity === "small") return vehicle.capacity <= 4;
      if (capacity === "medium")
        return vehicle.capacity >= 5 && vehicle.capacity <= 7;
      if (capacity === "large") return vehicle.capacity >= 8;
      return true;
    });
  }, [vehicles, activeGroup, capacity]);

  return (
    <section id="vehicles">
      <FleetFilters
        groups={groups}
        activeGroup={activeGroup}
        onGroupChange={setActiveGroup}
        capacity={capacity}
        onCapacityChange={setCapacity}
        total={vehicles.length}
        shown={filtered.length}
      />

      <div className="max-w-content mx-auto container-px pb-6">
        {loading && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="bg-white border border-line rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="h-44 bg-sage" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-sage rounded w-2/3" />
                    <div className="h-3 bg-sage/70 rounded w-1/2" />
                    <div className="h-20 bg-sage/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
            {slow && (
              <p className="text-center text-xs text-muted mt-4" role="status">
                Still loading — the server is waking up after being idle. This
                can take up to a minute; the page will fill in automatically.
              </p>
            )}
          </>
        )}

        {!loading && error && (
          <div className="max-w-md mx-auto text-center bg-white border border-line rounded-xl p-8">
            <p className="text-sm text-ink font-medium">Fleet unavailable</p>
            <p className="text-xs text-muted mt-2">{error}</p>
            <button onClick={load} className="btn-secondary mt-4 text-xs py-2.5">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center bg-white border border-line rounded-xl p-10">
            <p className="text-sm text-ink font-medium">
              No vehicles match those filters
            </p>
            <button
              onClick={() => {
                setActiveGroup("All");
                setCapacity("any");
              }}
              className="btn-secondary mt-4 text-xs py-2.5"
            >
              Reset filters
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {filtered.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white border border-line rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vehicle.imageUrl || FALLBACK_IMAGE}
                    alt={vehicle.name}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-medium bg-white/90 text-ink px-2.5 py-1 rounded-full">
                    {vehicle.category} • {vehicle.capacity} seats
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-semibold text-ink">{vehicle.name}</h3>
                  <p className="text-xs text-muted mb-3 font-mono">
                    {vehicle.plateNumber}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-ink/70 mb-4">
                    <span>👤 Up to {vehicle.capacity} guests</span>
                    <span>🧳 {vehicle.luggageCapacity || "Luggage on request"}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-4 mt-auto">
                    <span className="text-muted">
                      Outstation{" "}
                      <span className="font-semibold text-ink">
                        {formatMoney(vehicle.tariffPerKm)} / km
                      </span>
                    </span>
                    <span className="text-muted text-right">
                      4h / 40km{" "}
                      <span className="font-semibold text-ink">
                        {formatMoney(vehicle.tariffLocal)}
                      </span>
                    </span>
                  </div>

                  <a
                    href="/#booking"
                    className="bg-ink text-cream text-sm font-medium text-center py-3 rounded-md hover:bg-black transition-colors"
                  >
                    Reserve this vehicle →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
