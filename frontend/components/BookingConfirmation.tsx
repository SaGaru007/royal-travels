"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

const SERVICE_LABELS: Record<string, string> = {
  outstation: "Outstation Journey",
  local: "Local City Rental",
  airport: "Airport Transfer",
  callback: "Callback Request",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-sage text-ink/70 border-line",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function BookingConfirmation() {
  const params = useSearchParams();
  const bookingId = params.get("id") ?? "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const cached = getLastBooking();
    if (cached && (!bookingId || cached.id === bookingId)) {
      setBooking(cached);
    }
    setChecking(false);
  }, [bookingId]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError(null);
    setLookingUp(true);
    try {
      const found = await lookupBooking(bookingId, phone);
      setBooking(found);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLookupError(
          "No booking matches that reference and phone number. Check both and try again."
        );
      } else if (err instanceof ApiError) {
        setLookupError(err.message);
      } else {
        setLookupError("Could not reach the booking service. Please try again.");
      }
    } finally {
      setLookingUp(false);
    }
  }

  async function copyReference() {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(shortReference(booking.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const route = useMemo(() => {
    if (!booking) return { from: "", to: "" };
    return {
      from: booking.pickupLocation || "To be confirmed by concierge",
      to: booking.dropLocation || "To be confirmed by concierge",
    };
  }, [booking]);

  if (checking) {
    return (
      <div className="max-w-content mx-auto container-px py-24 text-center text-sm text-muted">
        Loading your reservation…
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-content mx-auto container-px py-16">
        <div className="max-w-md mx-auto bg-white border border-line rounded-xl p-8">
          <p className="eyebrow">Reservation Access</p>
          <h1 className="text-2xl font-bold text-ink mt-2">
            Look up your booking
          </h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            For your privacy, confirmation details require the phone number used
            when the booking was created.
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
                placeholder="+91 90000 00000"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
              />
            </label>
            {lookupError && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {lookupError}
              </p>
            )}
            <button
              type="submit"
              disabled={lookingUp || !bookingId}
              className="btn-primary w-full disabled:opacity-60"
            >
              {lookingUp ? "Checking…" : "View reservation"}
            </button>
          </form>
          <p className="text-xs text-muted mt-4">
            New here?{" "}
            <Link href="/#booking" className="text-goldDeep font-medium hover:underline">
              Make a booking
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const reference = shortReference(booking.id);
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.new;
  const fare =
    booking.totalFare ??
    booking.baseFare ??
    null;

  return (
    <div className="max-w-content mx-auto container-px py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-line rounded-lg px-5 py-3 text-xs">
        <span className="text-ink/80">
          <span className="text-goldDeep font-medium">●</span> Reservation
          received <span className="text-muted">| Reference: {reference}</span>
        </span>
        <span className="text-ink/70">
          📞 Priority Concierge Desk: <b>+91 99867 80221</b>
        </span>
      </div>

      <div className="text-center max-w-lg mx-auto mt-12 mb-10">
        <div className="w-14 h-14 rounded-full bg-white border border-line shadow-sm flex items-center justify-center mx-auto">
          <span className="text-emerald-600 text-2xl">✓</span>
        </div>
        <p className="eyebrow mt-5">Booking request received</p>
        <h1 className="text-4xl font-bold text-ink mt-2">
          Your Journey is Reserved
        </h1>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Our dispatch desk has your itinerary and will call you shortly to
          confirm the vehicle, driver, and final fare. No payment has been taken
          online.
        </p>

        <div className="bg-white border border-line rounded-xl px-5 py-4 mt-6 flex items-start gap-3 text-left">
          <span className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-base shrink-0">
            🕐
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Concierge callback within 15 minutes
            </p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              We will confirm your itinerary on{" "}
              <b className="text-ink">{booking.phone}</b>. Keep this reference
              handy: <b className="text-ink">{reference}</b>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div className="space-y-5">
          <div className="bg-white border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-5 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-goldDeep">
                  Your reservation
                </p>
                <p className="text-lg font-bold text-ink">{reference}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium border rounded-full px-2.5 py-1 ${statusClass}`}>
                  {booking.status.toUpperCase()}
                </span>
                <button
                  onClick={copyReference}
                  className="text-xs border border-line rounded-md px-3 py-2 hover:bg-sage/50"
                >
                  {copied ? "✓ Copied" : "📋 Copy Ref"}
                </button>
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-wide text-muted mb-3">
              {SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}
            </p>
            <div className="space-y-4 border-l-2 border-gold/50 pl-4 mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-goldDeep">
                  Pickup
                </p>
                <p className="font-semibold text-ink text-sm mt-0.5">
                  {route.from}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Destination
                </p>
                <p className="font-semibold text-ink text-sm mt-0.5">
                  {route.to}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 bg-sage/50 rounded-lg p-4 mb-5">
              <Detail
                label="Pickup date & time"
                value={`${formatDate(booking.pickupDate)} • ${formatTime(booking.pickupTime)}`}
              />
              <Detail
                label="Passengers / vehicle"
                value={[booking.passengers, booking.vehiclePreference]
                  .filter(Boolean)
                  .join(" • ") || "Concierge will assign"}
              />
              {booking.tripType && (
                <Detail
                  label="Trip type"
                  value={
                    booking.tripType === "round"
                      ? `Round trip • return ${formatDate(booking.returnDate)}`
                      : "One-way"
                  }
                />
              )}
              {booking.packageType && (
                <Detail label="Package" value={booking.packageType} />
              )}
              {booking.transferType && (
                <Detail label="Transfer" value={booking.transferType} />
              )}
              {booking.flightNumber && (
                <Detail label="Flight" value={booking.flightNumber} />
              )}
              {booking.preferredCallTime && (
                <Detail label="Preferred call time" value={booking.preferredCallTime} />
              )}
              <Detail
                label="Booking placed"
                value={formatDateTime(booking.createdAt)}
              />
            </div>

            {booking.notes && (
              <div className="bg-cream border border-line rounded-lg p-4 mb-5">
                <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
                  Special requests
                </p>
                <p className="text-sm text-ink/80 leading-relaxed">{booking.notes}</p>
              </div>
            )}

            <div className="border-t border-line pt-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Estimated fare</span>
                <span className="text-xl font-bold text-goldDeep">
                  {formatMoney(fare)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Payment status</span>
                <span className="text-xs font-semibold bg-gold/20 text-goldDeep px-2 py-1 rounded">
                  {booking.paymentStatus === "paid" ? "Paid" : "Pay after confirmation"}
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed pt-1">
                Final fare is confirmed by our concierge before the trip. We do
                not collect card or UPI details on this website.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-line rounded-xl p-6">
            <p className="text-[11px] uppercase tracking-wide text-goldDeep mb-1">
              Track this booking
            </p>
            <h2 className="font-semibold text-ink text-lg mb-2">
              Need an update?
            </h2>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              View the current status of this reservation. Live driver GPS is
              not enabled yet; status updates appear as our team confirms your
              trip.
            </p>
            <Link
              href={`/track?id=${booking.id}`}
              className="btn-secondary w-full text-xs py-2.5"
            >
              View booking status →
            </Link>
          </div>

          <div className="bg-white border border-line rounded-xl p-6">
            <p className="text-[11px] uppercase tracking-wide text-goldDeep mb-1">
              24x7 Royal Concierge
            </p>
            <h3 className="font-semibold text-ink mb-2">
              Need itinerary changes?
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Flight delayed or need a child seat? Message our dispatch desk with
              your reference number.
            </p>
            <div className="space-y-2">
              <a
                href={whatsappLink(
                  `Hello Royal Travels, I need help with booking ${reference} (${booking.name}).`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-xs py-2.5"
              >
                💬 Chat on WhatsApp
              </a>
              <a
                href="tel:+919986780221"
                className="btn-secondary w-full text-xs py-2.5"
              >
                📞 Call +91 99867 80221
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
