"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  Booking,
  DriverTripResponse,
  getDriverTrip,
  updateDriverStage,
} from "@/lib/api";
import { formatDate, formatTime, shortReference } from "@/lib/format";

const STAGE_LABEL: Record<string, string> = {
  assigned: "Assigned",
  started: "In progress",
  completed: "Completed",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function DriverTripSheet() {
  const params = useSearchParams();
  const bookingId = params.get("id") ?? "";

  const [phone, setPhone] = useState("");
  const [trip, setTrip] = useState<DriverTripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setTrip(await getDriverTrip(bookingId, phone));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          "No trip found. Check the booking reference and use the phone number dispatch has on file for you."
        );
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the dispatch service. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function changeStage(stage: "started" | "completed") {
    if (!trip) return;
    const prompt =
      stage === "started"
        ? "Start this trip now? The customer will see that you are on the way."
        : "Mark this trip completed? This cannot be undone from the driver page.";
    if (!window.confirm(prompt)) return;

    setUpdating(true);
    setError(null);
    try {
      setTrip(await updateDriverStage(trip.booking.id, { phone, stage }));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not update the trip. Check your connection and try again.");
      }
    } finally {
      setUpdating(false);
    }
  }

  const mapsLink = useMemo(() => {
    if (!trip) return "#";
    const { pickupLocation, dropLocation } = trip.booking;
    const destination = dropLocation || pickupLocation || "";
    const origin = pickupLocation || "";
    if (!destination) return "#";
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }, [trip]);

  if (!trip) {
    return (
      <div className="max-w-md mx-auto container-px py-16">
        <div className="bg-white border border-line rounded-xl p-8">
          <p className="eyebrow">Driver Trip Sheet</p>
          <h1 className="text-2xl font-bold text-ink mt-2">Open your trip</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Enter the booking reference from the WhatsApp message and the phone
            number dispatch has on file for you.
          </p>
          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Booking reference
              </span>
              <input
                value={bookingId ? shortReference(bookingId) : ""}
                readOnly
                className="w-full rounded-md border border-line bg-sage/40 px-3 py-2.5 text-sm font-mono text-ink"
                placeholder="Open the link dispatch sent you"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Your phone number
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
              />
            </label>
            {!bookingId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                This page needs the booking link from dispatch. Ask the office to
                resend it on WhatsApp.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !bookingId}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Opening trip…" : "Open trip sheet"}
            </button>
          </form>
          <p className="text-xs text-muted mt-5 text-center">
            Need help? Call dispatch on{" "}
            <a href="tel:+919986780221" className="text-ink underline underline-offset-2">
              +91 99867 80221
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const booking = trip.booking;
  const completed = booking.tripStage === "completed";
  const started = booking.tripStage === "started";

  return (
    <div className="max-w-lg mx-auto container-px py-10 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-goldDeep">
            ROYAL TRAVELS · DRIVER
          </p>
          <h1 className="text-xl font-bold text-ink mt-1">
            {trip.driverName}
          </h1>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1.5 rounded-full ${
            completed
              ? "bg-sage/70 text-ink/60"
              : started
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gold/20 text-goldDeep"
          }`}
        >
          {STAGE_LABEL[booking.tripStage] ?? booking.tripStage}
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white border border-line rounded-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted">Guest</p>
            <p className="text-lg font-semibold text-ink mt-0.5">{booking.name}</p>
            <p className="text-xs text-muted">{booking.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted">Reference</p>
            <p className="text-sm font-mono font-medium text-ink mt-0.5">
              {shortReference(booking.id)}
            </p>
            <p className="text-[11px] text-muted capitalize mt-1">
              {booking.serviceType} · {STATUS_LABEL[booking.status] ?? booking.status}
            </p>
          </div>
        </div>

        <div className="space-y-4 border-l-2 border-gold/50 pl-4 mt-6">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-goldDeep">Pickup</p>
            <p className="font-medium text-ink text-sm mt-0.5">
              {booking.pickupLocation || "To be confirmed"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Drop</p>
            <p className="font-medium text-ink text-sm mt-0.5">
              {booking.dropLocation || "To be confirmed"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Date</p>
              <p className="text-sm font-medium text-ink mt-0.5">
                {formatDate(booking.pickupDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Pickup time</p>
              <p className="text-sm font-medium text-ink mt-0.5">
                {formatTime(booking.pickupTime)}
              </p>
            </div>
          </div>
          {booking.flightNumber && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Flight</p>
              <p className="text-sm font-medium text-ink mt-0.5">{booking.flightNumber}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Passengers / vehicle</p>
            <p className="text-sm font-medium text-ink mt-0.5">
              {[booking.passengers, booking.vehiclePreference]
                .filter(Boolean)
                .join(" · ") || "See dispatch"}
            </p>
          </div>
          {booking.notes && (
            <div className="bg-cream border border-line rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
                Guest notes
              </p>
              <p className="text-sm text-ink/80 leading-relaxed">{booking.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}
          className="btn-secondary text-sm py-3 text-center"
        >
          📞 Call guest
        </a>
        <a
          href={`https://wa.me/${booking.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-3 text-center"
        >
          💬 WhatsApp guest
        </a>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-3 text-center col-span-2"
        >
          📍 Open route in Google Maps
        </a>
      </div>

      <div className="bg-white border border-line rounded-xl p-6 text-center">
        {completed ? (
          <>
            <span className="text-3xl">✅</span>
            <p className="text-lg font-semibold text-ink mt-2">Trip completed</p>
            <p className="text-sm text-muted mt-1">
              Dispatch and the customer have been updated. Thank you.
            </p>
          </>
        ) : started ? (
          <>
            <p className="text-sm text-muted mb-4">
              The customer can see that this trip is in progress.
            </p>
            <button
              onClick={() => changeStage("completed")}
              disabled={updating}
              className="w-full bg-ink text-cream text-base font-semibold py-4 rounded-xl disabled:opacity-60"
            >
              {updating ? "Updating…" : "✓ Complete Trip"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Tap below when you leave for the pickup. The customer&apos;s tracking
              page updates on its next refresh.
            </p>
            <button
              onClick={() => changeStage("started")}
              disabled={updating}
              className="w-full bg-gold text-ink text-base font-semibold py-4 rounded-xl disabled:opacity-60"
            >
              {updating ? "Updating…" : "▶ Start Trip"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-muted text-center leading-relaxed">
        Live GPS sharing is not enabled yet — status updates are shared with the
        customer and dispatch. For changes, call the office on{" "}
        <a href="tel:+919986780221" className="text-ink underline underline-offset-2">
          +91 99867 80221
        </a>
        .
      </p>

      <p className="text-center text-xs">
        <Link href="/" className="text-muted hover:text-ink">
          ← Royal Travels
        </Link>
      </p>
    </div>
  );
}
