"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, Booking, lookupBooking } from "@/lib/api";
import { getLastBooking } from "@/lib/bookingSession";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  shortReference,
  whatsappLink,
} from "@/lib/format";

const STAGES = [
  { key: "received", label: "Request received", hint: "Your booking is in our queue." },
  { key: "contacted", label: "Concierge contacted", hint: "Our team has reached out to confirm details." },
  { key: "confirmed", label: "Trip confirmed", hint: "Vehicle and driver are being assigned." },
  { key: "started", label: "Trip started", hint: "Your chauffeur is on the journey." },
  { key: "completed", label: "Trip completed", hint: "Thank you for travelling with Royal Travels." },
];

function stageIndex(booking: Booking) {
  if (booking.status === "cancelled") return -1;
  if (booking.status === "completed" || booking.tripStage === "completed") return 4;
  if (booking.tripStage === "started") return 3;
  if (booking.status === "confirmed") return 2;
  if (booking.status === "contacted") return 1;
  return 0;
}

export default function LiveTracking() {
  const params = useSearchParams();
  const bookingId = params.get("id") ?? "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = getLastBooking();
    if (cached && (!bookingId || cached.id === bookingId)) {
      setBooking(cached);
    }
    setChecking(false);
  }, [bookingId]);

  // While a trip is live, poll the same secure lookup so the customer sees the
  // driver's start/completion without reloading. 30s is far below the lookup
  // rate limit and is plenty for status changes (this is not GPS).
  useEffect(() => {
    if (!booking || !phone) return;
    if (booking.status === "completed" || booking.status === "cancelled") return;

    const timer = window.setInterval(async () => {
      try {
        setBooking(await lookupBooking(booking.id, phone));
      } catch {
        // A transient network error must not wipe the screen; the next tick retries.
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [booking?.id, booking?.status, booking?.tripStage, phone]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setBooking(await lookupBooking(bookingId, phone));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("No booking matches that reference and phone number.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the booking service. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted">
        Loading booking status…
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-content mx-auto container-px py-16">
        <div className="max-w-md mx-auto bg-white border border-line rounded-xl p-8">
          <p className="eyebrow">Track Reservation</p>
          <h1 className="text-2xl font-bold text-ink mt-2">Find your booking</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Enter the same phone number you used when booking to protect your
            reservation details.
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
                placeholder="Open this page from your confirmation link"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Phone number
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
              />
            </label>
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
              {loading ? "Checking…" : "View status"}
            </button>
          </form>
          <p className="text-xs text-muted mt-4">
            Need to make a booking?{" "}
            <Link href="/#booking" className="text-goldDeep font-medium hover:underline">
              Start here
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const reference = shortReference(booking.id);
  const current = stageIndex(booking);
  const cancelled = booking.status === "cancelled";

  return (
    <div className="max-w-content mx-auto container-px py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-goldDeep">
            ROYAL TRAVELS
          </p>
          <h1 className="text-2xl font-bold text-ink mt-1">Booking status</h1>
          <p className="text-sm text-muted mt-1">
            Reference {reference}
          </p>
        </div>
        <Link href={`/confirmation?id=${booking.id}`} className="btn-secondary text-xs py-2.5">
          View confirmation
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start mt-8">
        <div className="space-y-5">
          <div className="bg-white border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-semibold tracking-wide text-goldDeep">
                TRIP PROGRESSION
              </p>
              <span
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                  cancelled
                    ? "bg-red-50 text-red-700"
                    : "bg-sage/70 text-ink/70"
                }`}
              >
                {cancelled ? "Cancelled" : STAGES[Math.max(current, 0)].label}
              </span>
            </div>

            {cancelled ? (
              <p className="text-sm text-ink/70 leading-relaxed">
                This booking was cancelled. If this is unexpected, call our
                concierge at <b>+91 99867 80221</b>.
              </p>
            ) : (
              <ol className="space-y-3">
                {STAGES.map((stage, index) => {
                  const done = index < current;
                  const active = index === current;
                  return (
                    <li key={stage.key} className="flex items-start gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          done
                            ? "bg-ink text-cream"
                            : active
                            ? "bg-gold text-ink"
                            : "bg-sage text-muted"
                        }`}
                      >
                        {done ? "✓" : active ? "➜" : "○"}
                      </span>
                      <div className="pt-0.5">
                        <p className={`text-sm ${active ? "font-semibold text-ink" : "text-ink/70"}`}>
                          {stage.label}
                        </p>
                        <p className="text-xs text-muted">{stage.hint}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-5 bg-gold/10 border border-gold/40 rounded-lg p-4">
              <p className="text-xs font-semibold text-goldDeep uppercase tracking-wide mb-1">
                Live status
              </p>
              <p className="text-xs text-ink/70 leading-relaxed">
                This page refreshes automatically every 30 seconds while the trip
                is active, so driver start/completion updates appear without a
                reload. Live GPS location sharing is not enabled yet.
              </p>
            </div>
          </div>

          <div className="bg-white border border-line rounded-xl p-6">
            <p className="text-[11px] font-semibold tracking-wide text-goldDeep mb-4">
              ITINERARY
            </p>
            <div className="space-y-4 border-l-2 border-gold/50 pl-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Pickup
                </p>
                <p className="font-medium text-ink text-sm mt-0.5">
                  {booking.pickupLocation || "To be confirmed"}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(booking.pickupDate)} • {formatTime(booking.pickupTime)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Destination
                </p>
                <p className="font-medium text-ink text-sm mt-0.5">
                  {booking.dropLocation || "To be confirmed"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-line rounded-xl p-5">
            <p className="text-[11px] font-semibold tracking-wide text-goldDeep mb-3">
              RESERVATION
            </p>
            <dl className="space-y-3 text-sm">
              <Row label="Guest" value={booking.name} />
              <Row label="Phone" value={booking.phone} />
              <Row label="Service" value={booking.serviceType} />
              <Row label="Passengers" value={booking.passengers || "—"} />
              <Row
                label="Vehicle"
                value={booking.vehiclePreference || "Assigned by concierge"}
              />
              <Row label="Payment" value={booking.paymentStatus === "paid" ? "Paid" : "Pay after confirmation"} />
              <Row label="Estimated fare" value={formatMoney(booking.totalFare ?? booking.baseFare)} />
              <Row label="Booked at" value={formatDateTime(booking.createdAt)} />
            </dl>
          </div>

          <div className="bg-white border border-line rounded-xl p-5">
            <p className="text-[11px] font-semibold tracking-wide text-goldDeep mb-2">
              NEED HELP?
            </p>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Our dispatch desk is available 24x7 for changes or questions.
            </p>
            <a
              href={whatsappLink(
                `Hello Royal Travels, I need an update on booking ${reference}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full text-xs py-2.5 mb-2"
            >
              💬 WhatsApp dispatch
            </a>
            <a href="tel:+919986780221" className="btn-secondary w-full text-xs py-2.5">
              📞 Call +91 99867 80221
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-ink text-xs font-medium text-right break-words">{value}</dd>
    </div>
  );
}
