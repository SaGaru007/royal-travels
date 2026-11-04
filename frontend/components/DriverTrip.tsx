"use client";

import { useState } from "react";

type TripStage = "assigned" | "started" | "completed";

export default function DriverTrip() {
  const [stage, setStage] = useState<TripStage>("assigned");

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-sm mx-auto px-4 py-6 lg:max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-goldDeep">
              ROYAL TRAVELS
            </p>
            <h1 className="text-lg font-bold text-ink">Current Trip</h1>
          </div>
          <span
            className={`text-xs font-medium px-3 py-2 rounded-full ${
              stage === "assigned"
                ? "bg-sage/70 text-ink/70"
                : stage === "started"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gold/20 text-goldDeep"
            }`}
          >
            {stage === "assigned"
              ? "Assigned"
              : stage === "started"
              ? "In Progress"
              : "Completed"}
          </span>
        </div>

        {/* Customer + route */}
        <div className="bg-white border border-line rounded-xl p-6 mb-5">
          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
            Customer
          </p>
          <p className="text-lg font-semibold text-ink mb-5">Ananya Iyer</p>

          <div className="space-y-4 border-l-2 border-gold/50 pl-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-goldDeep">
                Pickup
              </p>
              <p className="font-medium text-ink text-base mt-0.5">
                Bengaluru Airport T2, Valet Point 4
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Drop
              </p>
              <p className="font-medium text-ink text-base mt-0.5">
                The Leela Palace, Old Airport Road
              </p>
            </div>
          </div>
        </div>

        {/* Big action area */}
        <div className="bg-white border border-line rounded-xl p-6 mb-5 text-center">
          {stage === "assigned" && (
            <>
              <p className="text-sm text-muted mb-5">
                Tap below when you're starting this trip. Your location will
                be shared with the customer and dispatch.
              </p>
              <button
                onClick={() => setStage("started")}
                className="w-full bg-gold text-ink text-lg font-semibold py-6 rounded-xl"
              >
                ▶ Start Trip
              </button>
            </>
          )}

          {stage === "started" && (
            <>
              <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-medium mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sharing your location
              </div>
              <button
                onClick={() => setStage("completed")}
                className="w-full bg-ink text-cream text-lg font-semibold py-6 rounded-xl"
              >
                ✓ Complete Trip
              </button>
            </>
          )}

          {stage === "completed" && (
            <>
              <span className="text-4xl">✅</span>
              <p className="text-lg font-semibold text-ink mt-3">
                Trip Completed
              </p>
              <p className="text-sm text-muted mt-1">
                Great work. Location sharing has stopped.
              </p>
            </>
          )}
        </div>

        {stage !== "completed" && (
          <div className="grid grid-cols-2 gap-3">
            <button className="border border-line bg-white text-ink text-sm font-medium py-4 rounded-xl">
              📞 Call Customer
            </button>
            <button className="border border-line bg-white text-ink text-sm font-medium py-4 rounded-xl">
              📍 Open in Maps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}