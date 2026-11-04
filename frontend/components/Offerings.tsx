const cards = [
  {
    icon: "🗺",
    title: "Outstation Travel",
    body: "Comfortable, long-distance journeys across states with seasoned drivers, toll-inclusive transparency, and flexible wayside halts.",
    cta: "Book Outstation Route",
  },
  {
    icon: "🏢",
    title: "Local Rental",
    body: "Flexible half-day (4h/40km) and full-day (8h/80km) packages for executive meetings, city tours, and family errands.",
    cta: "Book Local Cab",
  },
  {
    icon: "✈",
    title: "Airport Transfers",
    body: "Punctual and hassle-free pickup and drop services with flight tracking and terminal meet-and-greet assistance.",
    cta: "Schedule Airport Ride",
  },
  {
    icon: "🧭",
    title: "Customized Tours",
    body: "Bespoke itineraries covering India's heritage circuits, hill stations, and pilgrimage sanctuaries with seasoned guides.",
    cta: "Plan Tour with Concierge",
  },
];

export default function Offerings() {
  return (
    <section id="services" className="py-24">
      <div className="max-w-content mx-auto container-px">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow">Our Offerings</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
              Tailored travel solutions
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Experience unmatched comfort and reliability with our
            comprehensive range of chauffeur-driven services.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <img
            src="https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1000&auto=format&fit=crop"
            alt="Chauffeured SUV outside a hotel"
            className="rounded-xl object-cover w-full h-full min-h-[260px]"
          />
          <ServiceCard {...cards[0]} />
          <ServiceCard {...cards[1]} />
          <ServiceCard {...cards[2]} />
          <ServiceCard {...cards[3]} />
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop"
            alt="Luxury van interior"
            className="rounded-xl object-cover w-full h-full min-h-[260px]"
          />
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="bg-sage/60 border border-line rounded-xl p-7 flex flex-col justify-between">
      <div>
        <div className="text-xl mb-4">{icon}</div>
        <h3 className="font-semibold text-ink mb-2">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{body}</p>
      </div>
      <a
        href="/#booking"
        className="mt-5 text-sm font-semibold text-ink inline-flex items-center gap-1"
      >
        {cta} <span aria-hidden>→</span>
      </a>
    </div>
  );
}
