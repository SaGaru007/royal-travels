"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  ApiError,
  Booking,
  Vehicle,
  getAdminVehicles,
  getBookings,
} from "@/lib/api";
import { clearAdminSession, getAdminToken } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

const SEGMENT_COLORS: Record<string, string> = {
  outstation: "#C89239",
  local: "#17140F",
  airport: "#E3B15C",
  callback: "#B9B2A0",
};

const SEGMENT_LABELS: Record<string, string> = {
  outstation: "Outstation",
  local: "Local rental",
  airport: "Airport transfer",
  callback: "Callback",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [page, fleet] = await Promise.all([
        getBookings(token, { size: 500 }),
        getAdminVehicles(token),
      ]);
      setBookings(page.content);
      setVehicles(fleet);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(
      (booking) => booking.status === "confirmed" || booking.status === "completed"
    ).length;
    const paidRevenue = bookings.reduce(
      (sum, booking) =>
        booking.paymentStatus === "paid"
          ? sum + Number(booking.totalFare ?? booking.baseFare ?? 0)
          : sum,
      0
    );
    const conversion = total === 0 ? 0 : Math.round((confirmed / total) * 100);
    return [
      { label: "Total bookings", value: String(total), sub: "All website requests" },
      { label: "Conversion", value: `${conversion}%`, sub: "Confirmed or completed" },
      { label: "Collected revenue", value: formatMoney(paidRevenue), sub: "Paid bookings only" },
      {
        label: "Active fleet",
        value: `${vehicles.filter((vehicle) => vehicle.status === "active").length}/${vehicles.length}`,
        sub: "Bookable vehicles",
      },
    ];
  }, [bookings, vehicles]);

  const trend = useMemo(() => {
    const months: { key: string; label: string; outstation: number; local: number; airport: number }[] = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date),
        outstation: 0,
        local: 0,
        airport: 0,
      });
    }
    const index = new Map(months.map((month) => [month.key, month]));
    for (const booking of bookings) {
      const created = new Date(booking.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const bucket = index.get(`${created.getFullYear()}-${created.getMonth()}`);
      if (!bucket) continue;
      if (booking.serviceType === "outstation") bucket.outstation += 1;
      if (booking.serviceType === "local") bucket.local += 1;
      if (booking.serviceType === "airport") bucket.airport += 1;
    }
    return months;
  }, [bookings]);

  const segments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      counts.set(booking.serviceType, (counts.get(booking.serviceType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({
      name: SEGMENT_LABELS[type] ?? type,
      value: count,
      color: SEGMENT_COLORS[type] ?? "#B9B2A0",
    }));
  }, [bookings]);

  const routes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      if (!booking.pickupLocation || !booking.dropLocation) continue;
      const key = `${booking.pickupLocation} → ${booking.dropLocation}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [bookings]);

  const paidTotal = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <AdminTopbar label="Executive Dispatch Desk" />
      <div className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Operational Intelligence</p>
            <h1 className="text-2xl font-bold text-ink mt-2">
              Analytics &amp; Revenue
            </h1>
            <p className="text-sm text-muted mt-1 max-w-lg">
              Live figures from the bookings database. No demo numbers.
            </p>
          </div>
          <button onClick={load} className="btn-secondary text-sm py-2.5">
            Refresh
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-line rounded-xl p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted mb-2">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs mt-1 text-muted">{stat.sub}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted bg-white border border-line rounded-xl p-6">
            Loading analytics…
          </p>
        ) : bookings.length === 0 ? (
          <p className="mt-6 text-sm text-muted bg-white border border-line rounded-xl p-6">
            No bookings yet. Charts will populate as requests arrive.
          </p>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2 bg-white border border-line rounded-xl p-6">
                <h2 className="font-semibold text-ink mb-1">
                  Booking volume (last 6 months)
                </h2>
                <p className="text-xs text-muted mb-4">
                  Outstation vs local vs airport requests
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1DACB" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6B6558" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6B6558" />
                      <Tooltip />
                      <Area type="monotone" dataKey="outstation" stroke="#C89239" fill="#E3B15C" fillOpacity={0.3} name="Outstation" />
                      <Area type="monotone" dataKey="local" stroke="#17140F" fill="#17140F" fillOpacity={0.1} name="Local" />
                      <Area type="monotone" dataKey="airport" stroke="#6B6558" fill="#6B6558" fillOpacity={0.1} name="Airport" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-line rounded-xl p-6">
                <h2 className="font-semibold text-ink mb-1">Service mix</h2>
                <p className="text-xs text-muted mb-4">Share of all bookings</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={segments} dataKey="value" innerRadius={40} outerRadius={65}>
                        {segments.map((segment) => (
                          <Cell key={segment.name} fill={segment.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2">
                  {segments.map((segment) => (
                    <li key={segment.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-ink/70">
                        <span className="w-2 h-2 rounded-full" style={{ background: segment.color }} />
                        {segment.name}
                      </span>
                      <span className="font-medium text-ink">
                        {segment.value}
                        <span className="text-muted">
                          {" "}
                          ({paidTotal ? Math.round((segment.value / paidTotal) * 100) : 0}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white border border-line rounded-xl p-6 mt-6">
              <h2 className="font-semibold text-ink mb-1">Top routes</h2>
              <p className="text-xs text-muted mb-4">
                Most requested pickup → drop pairs
              </p>
              {routes.length === 0 ? (
                <p className="text-sm text-muted">
                  Route data appears once bookings include pickup and drop locations.
                </p>
              ) : (
                <div className="space-y-3">
                  {routes.map(([route, count], index) => (
                    <div key={route} className="flex items-center gap-4 border border-line rounded-lg p-4">
                      <span className="w-7 h-7 rounded-full bg-ink text-cream text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-ink">{route}</span>
                      <span className="text-xs text-muted">
                        <b className="text-ink">{count}</b>{" "}
                        {count === 1 ? "booking" : "bookings"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-line rounded-xl p-6 mt-6">
              <h2 className="font-semibold text-ink mb-1">Fleet status</h2>
              <p className="text-xs text-muted mb-4">Current availability across registered vehicles</p>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted">No vehicles registered yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="border border-line rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink">{vehicle.name}</span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                            vehicle.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : vehicle.status === "maintenance"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-sage/70 text-ink/60"
                          }`}
                        >
                          {vehicle.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{vehicle.category} • {vehicle.capacity} seats</p>
                      <p className="text-xs text-ink/70 mt-2">
                        {formatMoney(vehicle.tariffPerKm)}/km outstation
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
