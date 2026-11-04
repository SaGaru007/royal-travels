const items = [
  { icon: "🛂", title: "All-India Permit & FASTag", body: "Interstate commercial licensing and seamless electronic toll transit with pre-loaded accounts. Zero border delays." },
  { icon: "📡", title: "24/7 Monitored GPS & SOS", body: "Dual-SIM telemetry monitored live from our Central Command Dispatch Center with emergency panic response." },
  { icon: "🎩", title: "Master Chauffeurs", body: "Police-verified, highway-certified, discreet and immaculately uniformed professionals trained in defensive driving." },
  { icon: "🧴", title: "Complimentary Amenity Kit", body: "Chilled Himalayan mineral water, packaged refreshing facial wet wipes, sanitizer, and umbrellas onboard." },
];

export default function FleetInclusions() {
  return (
    <section className="bg-sage/60 py-20">
      <div className="max-w-content mx-auto container-px">
        <p className="eyebrow">The Royal Travels Guarantee</p>
        <h2 className="mt-3 text-3xl font-bold text-ink max-w-lg">
          Standard inclusions across every Royal Travels vehicle
        </h2>
        <p className="mt-3 text-sm text-muted max-w-xl">
          Regardless of the car category you select, each journey is elevated
          by our uncompromising white-glove operating benchmark.
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
      </div>
    </section>
  );
}