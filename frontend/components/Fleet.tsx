import Link from "next/link";
import type { Vehicle } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * Homepage preview of the live catalogue. One card per category (Sedan,
 * MPV/SUV, Van/Coach) so a growing fleet does not push the page down, and no
 * copy about vehicles the business has not listed.
 */
function groupFor(category: string) {
  const value = category.toLowerCase();
  if (value.includes("sedan")) return "Sedan";
  if (value.includes("mpv") || value.includes("suv")) return "MPV / SUV";
  if (value.includes("van") || value.includes("coach")) return "Van / Coach";
  return "Other";
}

function pickOnePerGroup(vehicles: Vehicle[]) {
  const picked = new Map<string, Vehicle>();
  for (const vehicle of vehicles) {
    const group = groupFor(vehicle.category);
    if (!picked.has(group)) picked.set(group, vehicle);
  }
  return [...picked.values()].slice(0, 3);
}

export default function Fleet({ vehicles }: { vehicles: Vehicle[] }) {
  const featured = pickOnePerGroup(vehicles);

  return (
    <section id="fleet" className="py-24">
      <div className="max-w-content mx-auto container-px">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow">Our Fleet</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
              Vehicles available with a chauffeur
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted">
            This list comes straight from our dispatch system, so it reflects
            what is on the road today. Rates are indicative; your final quote is
            confirmed by the concierge before the trip.
          </p>
        </div>

        {featured.length === 0 ? (
          <div className="bg-white border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink font-medium">
              The fleet list is being updated
            </p>
            <p className="text-xs text-muted mt-2">
              Call or WhatsApp us and dispatch will confirm what is available
              for your dates.
            </p>
            <Link href="/fleet" className="btn-secondary mt-4 text-xs py-2.5">
              See full availability
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((vehicle) => (
              <div
                key={vehicle.id}
                className="rounded-xl border border-line bg-white p-7 flex flex-col"
              >
                <div className="flex items-center justify-between text-xs text-muted mb-3">
                  <span>{vehicle.category}</span>
                  <span>Up to {vehicle.capacity} passengers</span>
                </div>
                <h3 className="font-semibold text-lg text-ink mb-2">
                  {vehicle.name}
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  {vehicle.luggageCapacity
                    ? `Luggage: ${vehicle.luggageCapacity}`
                    : "Luggage allowance confirmed at booking."}
                </p>
                <dl className="space-y-2 mb-6 text-xs">
                  <div className="flex items-center justify-between gap-3 bg-sage/60 rounded px-3 py-2">
                    <dt className="text-ink/70">Outstation</dt>
                    <dd className="text-ink font-medium">
                      {formatMoney(vehicle.tariffPerKm)} / km
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-sage/60 rounded px-3 py-2">
                    <dt className="text-ink/70">Local package (4h / 40km)</dt>
                    <dd className="text-ink font-medium">
                      {formatMoney(vehicle.tariffLocal)}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/#booking"
                  className="mt-auto w-full py-3 rounded-md text-sm font-medium text-center bg-white border border-line text-ink hover:bg-sage/50 transition-colors"
                >
                  Reserve this vehicle
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted mt-6">
          Looking for something specific? Call{" "}
          <a href={SITE.telHref} className="text-ink underline underline-offset-2">
            {SITE.phoneDisplay}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
