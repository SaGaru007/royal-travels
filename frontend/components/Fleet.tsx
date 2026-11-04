const vehicles = [
  {
    tag: "Executive Sedan",
    capacity: "Up to 4 passengers",
    name: "Toyota Camry / Honda City",
    body: "Ideal for business executives, client meetings, and smooth inter-city day commutes.",
    specs: ["AC & Non-AC available", "Hi-Fi sound (Bluetooth / USB)"],
    luggage: "Luggage: 2-3 bags",
    perk: "Dual climate • Wi-Fi option",
    cta: "Reserve Sedan",
    highlight: false,
  },
  {
    tag: "Premium MPV / SUV",
    capacity: "6-7 passengers",
    name: "Toyota Innova Crysta / Hycross",
    body: "Gold standard of highway comfort. Captain reclining seats, whisper-quiet cabin with bespoke comfort settings.",
    specs: ["Dual-zone AC / Non-AC on request", "Premium surround sound (Aux/BT)"],
    luggage: "Luggage: 4-5 bags",
    perk: "Individual rear climate control",
    cta: "Reserve Innova",
    highlight: true,
  },
  {
    tag: "Luxury Van / Coach",
    capacity: "9-16 passengers",
    name: "Force Urbania / Luxury Traveller",
    body: "Air suspension, panoramic windows, ambient ceiling illumination, and generous luggage hold for group expeditions.",
    specs: ["Roof AC & fresh air non-AC vents", "Multi-speaker Hi-Fi audio & mic"],
    luggage: "Luggage: 10+ bags",
    perk: "USB charging each seat",
    cta: "Reserve Luxury Van",
    highlight: false,
  },
];

export default function Fleet() {
  return (
    <section id="fleet" className="py-24">
      <div className="max-w-content mx-auto container-px">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow">Executive Fleet</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
              Curated for prestige and comfort
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Every vehicle in our fleet is sanitized before departure,
            outfitted with charging ports, plush leather upholstery, and
            bottled water.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v.name}
              className={`rounded-xl border p-7 flex flex-col ${
                v.highlight
                  ? "border-gold bg-white shadow-sm relative"
                  : "border-line bg-white"
              }`}
            >
              {v.highlight && (
                <span className="absolute -top-3 left-7 bg-gold text-ink text-[11px] font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center justify-between text-xs text-muted mb-3">
                <span>{v.tag}</span>
                <span>{v.capacity}</span>
              </div>
              <h3 className="font-semibold text-lg text-ink mb-2">
                {v.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {v.body}
              </p>
              <ul className="space-y-2 mb-4">
                {v.specs.map((s) => (
                  <li
                    key={s}
                    className="text-xs text-ink/80 bg-sage/60 rounded px-3 py-2"
                  >
                    {s}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-xs mb-6">
                <span className="text-muted">{v.luggage}</span>
                <span className="text-emerald-700 font-medium">{v.perk}</span>
              </div>
              <a
                href="/#booking"
                className={`mt-auto w-full py-3 rounded-md text-sm font-medium text-center transition-colors ${
                  v.highlight
                    ? "bg-ink text-cream hover:bg-black"
                    : "bg-white border border-line text-ink hover:bg-sage/50"
                }`}
              >
                {v.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
