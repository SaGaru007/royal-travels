import Link from "next/link";

const linkCols = [
  {
    title: "Quick Links",
    links: [
      { label: "Book a Ride", href: "/#booking" },
      { label: "Our Fleet", href: "/fleet" },
      { label: "Track a Booking", href: "/track" },
      { label: "Admin Login", href: "/admin/login" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Local Rentals (Hourly/Daily)", href: "/#booking" },
      { label: "Outstation Round & One-Way", href: "/#booking" },
      { label: "VIP Airport Transfers", href: "/#booking" },
      { label: "Corporate Fleet Leasing", href: "/#contact" },
      { label: "Wedding Luxury Convoy", href: "/#contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-sage/60 border-t border-line pt-16">
      <div className="max-w-content mx-auto container-px grid md:grid-cols-4 gap-10 pb-12">
        <div>
          <Link href="/" className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-cream text-sm">
              ◆
            </span>
            <span className="font-serif text-lg text-ink">Royal Travels</span>
          </Link>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Redefining luxury chauffeur-driven travel across India with a
            premium fleet, pristine sanitized interiors, and courteous
            drivers.
          </p>
          <p className="text-xs text-emerald-700">
            ✓ Govt. approved tourist transporter
          </p>
        </div>

        {linkCols.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold tracking-wide text-ink mb-4">
              {col.title.toUpperCase()}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-ink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="text-xs font-semibold tracking-wide text-ink mb-4">
            CONTACT &amp; SUPPORT
          </h4>
          <ul className="space-y-2.5 text-sm text-muted">
            <li>
              <a href="tel:+919986780221" className="hover:text-ink">
                +91 99867 80221
              </a>
            </li>
            <li>
              <a href="mailto:bookings@royaltravels.in" className="hover:text-ink">
                bookings@royaltravels.in
              </a>
            </li>
            <li>MG Road, Bengaluru, Karnataka</li>
            <li className="text-emerald-700">24 Hours / 7 Days Operational</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line py-6">
        <div className="max-w-content mx-auto container-px flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>
            © {new Date().getFullYear()} Royal Travels India. All rights
            reserved. Chauffeur driven car rentals &amp; tours.
          </span>
          <span className="flex items-center gap-4">
            <span>India (EN)</span>
            <span>SSL Secured</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
