"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  ApiError,
  Booking,
  BookingStatus,
  PaymentStatus,
  TripStage,
  getBookings,
  updateBooking,
} from "@/lib/api";
import { clearAdminSession, getAdminToken } from "@/lib/auth";
import { formatDate, formatDateTime, formatMoney, formatTime, shortReference } from "@/lib/format";

const STATUSES: BookingStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "completed",
  "cancelled",
];

const STATUS_STYLES: Record<BookingStatus, string> = {
  new: "bg-amber-50 text-amber-700",
  contacted: "bg-sky-50 text-sky-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-sage/70 text-ink/70",
  cancelled: "bg-red-50 text-red-700",
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [query, setQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

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
      const page = await getBookings(token, { size: 500 });
      setBookings(page.content);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(
          err instanceof ApiError ? err.message : "Could not load bookings."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, router]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: bookings.length };
    for (const status of STATUSES) base[status] = 0;
    for (const booking of bookings) {
      base[booking.status] = (base[booking.status] ?? 0) + 1;
    }
    return base;
  }, [bookings]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        booking.name,
        booking.phone,
        booking.email ?? "",
        shortReference(booking.id),
        booking.pickupLocation ?? "",
        booking.dropLocation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [bookings, statusFilter, query]);

  const revenue = useMemo(
    () =>
      bookings.reduce((sum, booking) => {
        if (booking.paymentStatus !== "paid") return sum;
        return sum + Number(booking.totalFare ?? booking.baseFare ?? 0);
      }, 0),
    [bookings]
  );

  async function patchBooking(
    id: string,
    payload: { status?: BookingStatus; paymentStatus?: PaymentStatus; tripStage?: TripStage }
  ) {
    const token = getAdminToken();
    if (!token) return;
    setUpdating(id);
    setError(null);
    try {
      const updated = await updateBooking(token, id, payload);
      setBookings((current) =>
        current.map((booking) => (booking.id === id ? updated : booking))
      );
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(
          err instanceof ApiError ? err.message : "Could not update the booking."
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "Reference",
        "Created",
        "Service",
        "Name",
        "Phone",
        "Email",
        "Pickup",
        "Drop",
        "Pickup date",
        "Pickup time",
        "Status",
        "Payment",
        "Fare",
      ],
      ...filtered.map((booking) => [
        shortReference(booking.id),
        booking.createdAt ?? "",
        booking.serviceType,
        booking.name,
        booking.phone,
        booking.email ?? "",
        booking.pickupLocation ?? "",
        booking.dropLocation ?? "",
        booking.pickupDate ?? "",
        booking.pickupTime ?? "",
        booking.status,
        booking.paymentStatus,
        String(booking.totalFare ?? booking.baseFare ?? ""),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `royal-travels-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <AdminTopbar label="Executive Dispatch Desk" />

      <div className="p-6">
        <p className="eyebrow">Live Booking Registry</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Chauffeur Bookings &amp; Dispatch
            </h1>
            <p className="text-sm text-muted mt-1 max-w-lg">
              Every reservation submitted through the website, newest first.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="btn-secondary text-sm py-2.5 disabled:opacity-50"
            >
              Export CSV
            </button>
            <button onClick={load} className="btn-gold text-sm py-2.5">
              Refresh
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Stat label="Total bookings" value={String(counts.all)} sub="All time" />
          <Stat label="New requests" value={String(counts.new)} sub="Awaiting contact" />
          <Stat label="Confirmed" value={String(counts.confirmed)} sub="Ready for dispatch" />
          <Stat label="Collected (paid)" value={formatMoney(revenue)} sub="Recorded payments" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
          <div className="flex flex-wrap gap-2">
            {(["all", ...STATUSES] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-sm px-4 py-2 rounded-md capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-gold text-ink font-medium"
                    : "bg-white border border-line text-ink/70 hover:bg-sage/50"
                }`}
              >
                {status} <span className="opacity-60">{counts[status] ?? 0}</span>
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guest, phone, reference…"
            className="text-sm border border-line rounded-md px-3 py-2 bg-white w-full sm:w-72"
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        <div className="bg-white border border-line rounded-xl overflow-x-auto">
          {loading ? (
            <p className="p-8 text-sm text-muted">Loading bookings…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-sm text-muted">
              {bookings.length === 0
                ? "No bookings yet. New website requests will appear here."
                : "No bookings match this filter."}
            </p>
          ) : (
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                  <th className="p-4 font-medium">Booking</th>
                  <th className="p-4 font-medium">Guest</th>
                  <th className="p-4 font-medium">Trip</th>
                  <th className="p-4 font-medium">Pickup</th>
                  <th className="p-4 font-medium">Payment</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Trip stage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-line last:border-0 align-top ${
                      updating === booking.id ? "opacity-60" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-medium text-ink">
                        {shortReference(booking.id)}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {formatDateTime(booking.createdAt)}
                      </div>
                      <span className="inline-block mt-2 text-[10px] bg-sage/70 text-ink/70 rounded px-2 py-1 capitalize">
                        {booking.serviceType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-ink">{booking.name}</div>
                      <div className="text-xs text-muted">{booking.phone}</div>
                      {booking.email && (
                        <div className="text-xs text-muted">{booking.email}</div>
                      )}
                    </td>
                    <td className="p-4 max-w-[220px]">
                      <div className="text-ink/80">
                        {booking.pickupLocation || "—"} →{" "}
                        {booking.dropLocation || "—"}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {booking.passengers ? `${booking.passengers} pax` : "Pax TBC"}
                        {booking.vehiclePreference
                          ? ` • ${booking.vehiclePreference}`
                          : ""}
                      </div>
                      {booking.flightNumber && (
                        <div className="text-xs text-muted">
                          Flight {booking.flightNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      <div className="text-ink/80">{formatDate(booking.pickupDate)}</div>
                      <div className="text-muted">{formatTime(booking.pickupTime)}</div>
                      {booking.tripType && (
                        <div className="text-muted capitalize">{booking.tripType}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        value={booking.paymentStatus}
                        disabled={updating === booking.id}
                        onChange={(event) =>
                          patchBooking(booking.id, {
                            paymentStatus: event.target.value as PaymentStatus,
                          })
                        }
                        className="text-xs border border-line rounded-md px-2 py-1.5 bg-cream"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                      <div className="text-[11px] text-muted mt-1">
                        {formatMoney(booking.totalFare ?? booking.baseFare)}
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={booking.status}
                        disabled={updating === booking.id}
                        onChange={(event) =>
                          patchBooking(booking.id, {
                            status: event.target.value as BookingStatus,
                          })
                        }
                        className={`text-xs font-medium rounded-md px-2 py-1.5 border border-transparent capitalize ${
                          STATUS_STYLES[booking.status]
                        }`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={booking.tripStage}
                        disabled={updating === booking.id}
                        onChange={(event) =>
                          patchBooking(booking.id, {
                            tripStage: event.target.value as TripStage,
                          })
                        }
                        className="text-xs border border-line rounded-md px-2 py-1.5 bg-cream capitalize"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="started">Started</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
