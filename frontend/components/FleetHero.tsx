const badges = [
  "Sedans, MPVs, SUVs & vans",
  "Chauffeur-driven only",
  "Local, outstation & airport",
  "Live trip tracking",
];

export default function FleetHero() {
  return (
    <section className="max-w-content mx-auto container-px pt-16 pb-10 text-center">
      <span className="inline-flex items-center gap-2 text-[11px] font-medium text-goldDeep bg-white border border-line rounded-full px-3 py-1.5">
        Bookable today
      </span>

      <h1 className="mt-6 text-4xl md:text-5xl font-bold text-ink leading-tight max-w-2xl mx-auto">
        Our Fleet &amp;{" "}
        <span className="text-goldDeep font-serif italic font-medium">
          Chauffeur
        </span>{" "}
        Vehicles
      </h1>

      <p className="mt-5 text-sm text-muted max-w-xl mx-auto leading-relaxed">
        This catalogue is maintained by our dispatch team, so every vehicle you
        see here is one you can actually book. Sedans for city runs, MPVs and
        SUVs for families, vans for groups.
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
