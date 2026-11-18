const features = [
  {
    icon: "🛡",
    title: "Chauffeur-driven only",
    body: "Every booking includes a driver. Self-drive is not offered, so you can work, rest or take a call on the way.",
  },
  {
    icon: "🚙",
    title: "The right size for the trip",
    body: "Sedan for city runs, MPV or SUV for families, van for groups. Dispatch confirms availability for your dates.",
  },
  {
    icon: "🎧",
    title: "Air-conditioned cabins",
    body: "Cars run with AC by default. If you need something specific on board, tell the concierge and we will confirm it before the trip.",
  },
  {
    icon: "📍",
    title: "Live trip tracking",
    body: "While a trip is running, the driver can share their position from the trip sheet and you can follow it from the tracking page.",
  },
  {
    icon: "🎩",
    title: "Driver details before pickup",
    body: "Dispatch assigns a named chauffeur with a phone number you can reach, and shares the details with you ahead of the trip.",
  },
  {
    icon: "📋",
    title: "Clear quote, no online payment",
    body: "You get the vehicle, rate and inclusions before the trip. Nothing is charged on this site; the fare is settled with dispatch.",
  },
];

export default function Features() {
  return (
    <section className="bg-sage py-24">
      <div className="max-w-content mx-auto container-px">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
            Straight answers before you book
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-line p-7"
            >
              <div className="w-11 h-11 rounded-lg bg-sage flex items-center justify-center text-lg mb-5">
                {f.icon}
              </div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
