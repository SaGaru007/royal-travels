const features = [
  {
    icon: "🛡",
    title: "All-India Tourist Permit",
    body: "Authorized inter-state travel permits across every state with zero border check delays or passenger hassles.",
  },
  {
    icon: "❄",
    title: "AC & Non-AC Climate Choice",
    body: "Flexible climate control with whisper-quiet chilled AC or open-breeze non-AC tailored to your preference and weather.",
  },
  {
    icon: "🎧",
    title: "Hi-Fi Sound & Infotainment",
    body: "High-definition audio with seamless Bluetooth, Aux, and smartphone connectivity for an immersive, relaxed journey.",
  },
  {
    icon: "✨",
    title: "Pristine Sanitized Interiors",
    body: "Deep-cleaned, odor-free, non-smoking executive cabins with fresh upholstery and complimentary mineral water.",
  },
  {
    icon: "🎩",
    title: "Uniformed Chauffeurs",
    body: "Vetted, background-verified, route-experienced, courteous drivers trained in defensive and polite driving.",
  },
  {
    icon: "📋",
    title: "Transparent & Flexible",
    body: "Clear upfront itineraries, flexible stops, zero hidden charges, real-time GPS tracking, and corporate billing.",
  },
];

export default function Features() {
  return (
    <section className="bg-sage py-24">
      <div className="max-w-content mx-auto container-px">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow">The Royal Travels Standard</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
            Peace of mind on every kilometer
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
