import Link from "next/link";
import { SITE } from "@/lib/site";

const items = [
  {
    icon: "🚗",
    title: "Chauffeur on every booking",
    body: "Self-drive is not offered. Each trip is assigned to a driver from our roster, so you can work or rest on the way.",
  },
  {
    icon: "📍",
    title: "Live trip tracking",
    body: "When the driver starts your trip, they can share their position from the trip sheet and you can follow it on the tracking page.",
  },
  {
    icon: "🪪",
    title: "Driver records on file",
    body: "Every chauffeur has a phone number and licence status recorded with dispatch before they are assigned a trip.",
  },
  {
    icon: "📞",
    title: "One number for everything",
    body: "Booking, changes and on-trip help all go through the dispatch line. No ticket queues, no chatbots.",
  },
];

export default function FleetInclusions() {
  return (
    <section className="bg-sage/60 py-20">
      <div className="max-w-content mx-auto container-px">
        <p className="eyebrow">How we operate</p>
        <h2 className="mt-3 text-3xl font-bold text-ink max-w-lg">
          What you can expect on every Royal Travels trip
        </h2>
        <p className="mt-3 text-sm text-muted max-w-xl">
          No promises about things we cannot verify. This is how the service
          actually works, from the first call to the drop-off.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {items.map((it) => (
            <div key={it.title} className="bg-white border border-line rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-sage flex items-center justify-center text-lg mb-4">
                {it.icon}
              </div>
              <h3 className="font-semibold text-ink text-sm mb-2">{it.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted mt-8">
          Questions before booking? Call{" "}
          <a href={SITE.telHref} className="text-ink underline underline-offset-2">
            {SITE.phoneDisplay}
          </a>{" "}
          or{" "}
          <Link href="/#booking" className="text-ink underline underline-offset-2">
            send a request
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
