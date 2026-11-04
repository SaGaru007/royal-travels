const badges = [
  "100% in-house fleet ownership",
  "< 3-year age showroom quality",
  "Daily sanitized deep-steam cleaned",
  "Dual-zone AC & Hi-Fi audio built-in",
];

export default function FleetHero() {
  return (
    <section className="max-w-content mx-auto container-px pt-16 pb-10 text-center">
      <span className="inline-flex items-center gap-2 text-[11px] font-medium text-goldDeep bg-white border border-line rounded-full px-3 py-1.5">
        The Sovereign Collection • Curated Fleet
      </span>

      <h1 className="mt-6 text-4xl md:text-5xl font-bold text-ink leading-tight max-w-2xl mx-auto">
        Our Luxury Fleet &amp;{" "}
        <span className="text-goldDeep font-serif italic font-medium">
          Executive Chauffeur
        </span>{" "}
        Vehicles
      </h1>

      <p className="mt-5 text-sm text-muted max-w-xl mx-auto leading-relaxed">
        Handpicked, impeccably maintained sedans, executive MPVs, and luxury
        coaches. Backed by certified master chauffeurs, all-India commercial
        permits, 24/7 dual GPS telemetry, and customized onboard comforts.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {badges.map((b) => (
          <span
            key={b}
            className="text-xs text-ink/80 bg-white border border-line rounded-full px-4 py-2"
          >
            {b}
          </span>
        ))}
      </div>
    </section>
  );
}