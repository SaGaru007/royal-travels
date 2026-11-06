"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, BookingCreate, createBooking } from "@/lib/api";
import { saveLastBooking } from "@/lib/bookingSession";

const tabs = [
  { id: "outstation", label: "Outstation (Round / One-Way)", icon: "🧭" },
  { id: "local", label: "Local City (Hourly / Full Day)", icon: "🕐" },
  { id: "airport", label: "Airport Transfer", icon: "✈" },
  { id: "callback", label: "Request Quick Callback", icon: "📞" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function BookingBar() {
  const router = useRouter();
  const [active, setActive] = useState<TabId>("airport");
  const [tripType, setTripType] = useState("one-way");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    const payload: BookingCreate = {
      serviceType: active,
      name: value("name"),
      phone: value("phone"),
      email: value("email") || undefined,
      notes: value("notes") || undefined,
    };

    if (active !== "callback") {
      payload.pickupLocation = value("pickupLocation") || undefined;
      payload.pickupDate = value("pickupDate") || undefined;
      payload.pickupTime = value("pickupTime") || undefined;
      payload.vehiclePreference = value("vehiclePreference") || undefined;
      payload.passengers = value("passengers") || undefined;
    }

    if (active === "outstation") {
      payload.tripType = tripType;
      payload.dropLocation = value("dropLocation") || undefined;
      payload.returnDate = value("returnDate") || undefined;
    }
    if (active === "local") {
      payload.packageType = value("packageType") || undefined;
    }
    if (active === "airport") {
      payload.transferType = value("transferType") || undefined;
      payload.dropLocation = value("dropLocation") || undefined;
      payload.flightNumber = value("flightNumber") || undefined;
    }
    if (active === "callback") {
      payload.preferredCallTime = value("preferredCallTime") || undefined;
    }

    try {
      const booking = await createBooking(payload);
      saveLastBooking(booking);
      router.push(`/confirmation?id=${booking.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = err.errors
          ? Object.entries(err.errors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(" • ")
          : "";
        setError(fieldErrors ? `${err.message} — ${fieldErrors}` : err.message);
      } else {
        setError("Could not submit the booking. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div id="booking" className="relative z-10 max-w-content mx-auto container-px -mt-16 scroll-mt-24">
      <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActive(tab.id);
                setError(null);
              }}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 text-sm py-4 border-b-2 transition-colors ${
                active === tab.id
                  ? "border-ink text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Full name">
              <input name="name" required className="field-input" placeholder="Your name" autoComplete="name" />
            </Field>
            <Field label="Phone number">
              <input
                name="phone"
                required
                type="tel"
                pattern="^\+?[0-9]{10,15}$"
                title="Enter 10-15 digits, optionally starting with +"
                className="field-input"
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </Field>
            <Field label="Email (optional)">
              <input name="email" type="email" className="field-input" placeholder="you@example.com" autoComplete="email" />
            </Field>

            {active === "outstation" && (
              <>
                <Field label="Trip type">
                  <select
                    name="tripType"
                    className="field-input"
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                  >
                    <option value="one-way">One-way</option>
                    <option value="round">Round trip</option>
                  </select>
                </Field>
                <Field label="Pickup city / address">
                  <input name="pickupLocation" required className="field-input" placeholder="Pickup location" />
                </Field>
                <Field label="Destination city / address">
                  <input name="dropLocation" required className="field-input" placeholder="Destination" />
                </Field>
                <Field label="Pickup date">
                  <input name="pickupDate" required type="date" min={today()} className="field-input" />
                </Field>
                <Field label="Pickup time">
                  <TimeSelect name="pickupTime" />
                </Field>
                {tripType === "round" && (
                  <Field label="Return date">
                    <input name="returnDate" required type="date" min={today()} className="field-input" />
                  </Field>
                )}
                <Field label="Preferred vehicle">
                  <input name="vehiclePreference" className="field-input" placeholder="e.g. Innova, sedan" />
                </Field>
                <Field label="Passengers">
                  <input name="passengers" className="field-input" placeholder="e.g. 4" inputMode="numeric" />
                </Field>
              </>
            )}

            {active === "local" && (
              <>
                <Field label="Package">
                  <select name="packageType" className="field-input" defaultValue="8h/80km">
                    <option value="4h/40km">4 hours / 40 km</option>
                    <option value="8h/80km">8 hours / 80 km</option>
                  </select>
                </Field>
                <Field label="Pickup city / address">
                  <input name="pickupLocation" required className="field-input" placeholder="Pickup location" />
                </Field>
                <Field label="Pickup date">
                  <input name="pickupDate" required type="date" min={today()} className="field-input" />
                </Field>
                <Field label="Pickup time">
                  <TimeSelect name="pickupTime" />
                </Field>
                <Field label="Preferred vehicle">
                  <input name="vehiclePreference" className="field-input" placeholder="e.g. Innova, sedan" />
                </Field>
                <Field label="Passengers">
                  <input name="passengers" className="field-input" placeholder="e.g. 4" inputMode="numeric" />
                </Field>
              </>
            )}

            {active === "airport" && (
              <>
                <Field label="Transfer type">
                  <select name="transferType" className="field-input" defaultValue="Pickup from Airport (Flight)">
                    <option>Pickup from Airport (Flight)</option>
                    <option>Drop to Airport</option>
                  </select>
                </Field>
                <Field label="Airport / pickup location">
                  <input name="pickupLocation" required className="field-input" placeholder="e.g. BLR / DEL Terminal 2" />
                </Field>
                <Field label="City address / hotel">
                  <input name="dropLocation" required className="field-input" placeholder="Hotel / residence destination" />
                </Field>
                <Field label="Pickup date">
                  <input name="pickupDate" required type="date" min={today()} className="field-input" />
                </Field>
                <Field label="Pickup time">
                  <TimeSelect name="pickupTime" />
                </Field>
                <Field label="Flight number">
                  <input name="flightNumber" className="field-input" placeholder="e.g. AI 504" />
                </Field>
                <Field label="Preferred vehicle">
                  <input name="vehiclePreference" className="field-input" placeholder="e.g. Innova, sedan" />
                </Field>
                <Field label="Passengers">
                  <input name="passengers" className="field-input" placeholder="e.g. 4" inputMode="numeric" />
                </Field>
              </>
            )}

            {active === "callback" && (
              <>
                <Field label="Preferred callback time">
                  <input name="preferredCallTime" className="field-input" placeholder="e.g. Today after 6 PM" />
                </Field>
                <div className="hidden lg:block" />
              </>
            )}

            <div className="md:col-span-2 lg:col-span-3">
              <Field label="Notes / special requests (optional)">
                <textarea name="notes" rows={2} className="field-input" placeholder="Child seat, extra luggage, hotel instructions..." />
              </Field>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="submit" disabled={submitting} className="btn-gold h-[46px] disabled:opacity-60">
              {submitting
                ? "Submitting..."
                : active === "callback"
                ? "Request Callback ➤"
                : active === "airport"
                ? "Book Airport Ride ➤"
                : active === "local"
                ? "Book Local Ride ➤"
                : "Book Outstation Ride ➤"}
            </button>
            <p className="text-xs text-muted">
              Fare confirmed by our concierge. No payment is taken online.
            </p>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          border: 1px solid #e1dacb;
          border-radius: 0.375rem;
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          background: #fafaf7;
          color: #17140f;
        }
        .field-input:focus {
          outline: 2px solid #e3b15c;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Half-hour slots rendered in 12-hour form; the form value stays 24-hour
// ("14:30") because that is what the API expects.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours24 = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const meridiem = hours24 < 12 ? "AM" : "PM";
  return {
    value: `${String(hours24).padStart(2, "0")}:${minutes}`,
    label: `${String(hours12).padStart(2, "0")}:${minutes} ${meridiem}`,
  };
});

function TimeSelect({ name }: { name: string }) {
  return (
    <select name={name} required defaultValue="" className="field-input">
      <option value="" disabled>
        Select time
      </option>
      {TIME_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
