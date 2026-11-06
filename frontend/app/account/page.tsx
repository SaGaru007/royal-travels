"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, Booking, getCustomerBookings } from "@/lib/api";
import { formatTime } from "@/lib/format";
import {
  CustomerSession,
  clearCustomerSession,
  getCustomerSession,
} from "@/lib/customerAuth";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-50 text-amber-800 border-amber-200",
  contacted: "bg-blue-50 text-blue-800 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getCustomerSession();
    if (!current) {
      router.replace("/account/login");
      return;
    }
    setSession(current);

    let cancelled = false;
    (async () => {
      try {
        const data = await getCustomerBookings(current.token);
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearCustomerSession();
          router.replace("/account/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load your bookings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function signOut() {
    clearCustomerSession();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-content mx-auto container-px py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="font-serif text-3xl text-ink mt-2">
              {session ? session.name : "Your bookings"}
            </h1>
            <p className="text-sm text-muted mt-2">
              {session ? session.email : ""} — every ride booked with your phone number.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/#booking" className="btn-primary text-sm">
              Book a ride
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="text-sm border border-line rounded-md px-4 py-2.5 hover:bg-white"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-muted">Loading your bookings…</p>
        ) : bookings.length === 0 ? (
          <div className="mt-10 bg-white border border-line rounded-xl p-10 text-center">
            <p className="font-serif text-xl text-ink">No bookings yet</p>
            <p className="text-sm text-muted mt-2">
              When you book with this phone number, the ride will show up here automatically.
            </p>
            <Link href="/#booking" className="btn-primary inline-block mt-6 text-sm">
              Book your first ride
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white border border-line rounded-xl p-6 flex flex-wrap items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-muted">
                      {booking.serviceType}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[booking.status] ?? "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {booking.status}
                    </span>
                    {booking.paymentStatus === "paid" && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                        paid
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-ink mt-2 truncate">
                    {booking.pickupLocation || "Pickup"} → {booking.dropLocation || "Destination"}
                  </p>

                  <p className="text-xs text-muted mt-1">
                    {formatDate(booking.pickupDate)}
                    {booking.pickupTime ? ` · ${formatTime(booking.pickupTime)}` : ""} · Ref{" "}
                    <span className="font-mono">{booking.id.slice(0, 8)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {typeof booking.totalFare === "number" && booking.totalFare > 0 && (
                    <span className="text-sm font-semibold text-ink">
                      ₹{booking.totalFare.toLocaleString("en-IN")}
                    </span>
                  )}
                  <Link
                    href={`/track?id=${booking.id}`}
                    className="text-sm border border-line rounded-md px-4 py-2 hover:bg-cream"
                  >
                    Track
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
