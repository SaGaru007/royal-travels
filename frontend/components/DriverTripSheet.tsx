"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  Booking,
  DriverTripResponse,
  getDriverTrip,
  postDriverLocation,
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

  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

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
      if (stage === "completed") stopSharing();
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

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    // Wake locks are best-effort; release failures are not worth surfacing.
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }

  async function keepScreenAwake() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      };
      if (nav.wakeLock) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      }
    } catch {
      // Unsupported or denied: sharing still works, the screen may sleep.
    }
  }

  function startSharing() {
    if (!trip) return;
    if (!("geolocation" in navigator)) {
      setShareError("This browser cannot share location. Ask dispatch to track the trip by phone.");
      return;
    }
    setShareError(null);
    setSharing(true);
    lastSentAtRef.current = 0;
    setLastSent(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // One report every 10 s is enough for a car at city speed and stays
        // well inside the endpoint's rate limit.
        const now = Date.now();
        if (now - lastSentAtRef.current < 10_000) return;
        lastSentAtRef.current = now;

        void postDriverLocation(trip.booking.id, {
          phone,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
          .then(() => setLastSent(new Date()))
          .catch((err) => {
            if (err instanceof ApiError && err.status === 409) {
              // Trip completed or cancelled elsewhere: no point continuing.
              stopSharing();
              setShareError(err.message);
            } else if (err instanceof ApiError && err.status === 429) {
              // Too many reports from this network; the next tick retries.
            } else {
              setShareError(
                err instanceof ApiError ? err.message : "Could not send your position."
              );
            }
          });
      },
      (geoError) => {
        stopSharing();
        setShareError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was blocked. Allow location for this site in your browser settings, then tap Share again."
            : "Could not read a GPS fix. Move to an open area and try again."
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );

    void keepScreenAwake();
  }

  // Never leave a watcher or a wake lock behind when the driver closes the page.
  useEffect(
    () => () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      wakeLockRef.current?.release().catch(() => undefined);
    },
    []
  );

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
                placeholder="+91 90000 00000"
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
            <div className="text-left border border-line rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Live location</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {sharing
                      ? lastSent
                        ? `Sharing · updated ${lastSent.toLocaleTimeString()}`
                        : "Waiting for a GPS fix…"
                      : "Let the customer watch you approach on the map."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sharing ? stopSharing : startSharing}
                  className={`shrink-0 text-xs py-2 px-3 rounded-md font-medium ${
                    sharing
                      ? "border border-line bg-white text-ink"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {sharing ? "Stop sharing" : "Share live location"}
                </button>
              </div>

              {sharing && (
                <p className="text-[11px] text-muted mt-2 leading-relaxed">
                  Keep this page open while sharing. It stops automatically when
                  you complete the trip, and the customer only sees your last
                  reported point.
                </p>
              )}

              {shareError && (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2"
                >
                  {shareError}
                </p>
              )}
            </div>

            <button
              onClick={() => changeStage("completed")}
              disabled={updating}
              className="w-full mt-4 bg-ink text-cream text-base font-semibold py-4 rounded-xl disabled:opacity-60"
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
        Location sharing works only while this trip sheet stays open. For
        changes, call the office on{" "}
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
