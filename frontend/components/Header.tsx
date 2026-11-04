import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Fleet", href: "/fleet" },
  { label: "Services", href: "/#services" },
  { label: "Outstation", href: "/#booking" },
  { label: "Local", href: "/#booking" },
  { label: "Track Booking", href: "/track" },
  { label: "Contact", href: "/#contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-line">
      <div className="max-w-content mx-auto container-px h-20 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <span className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-cream text-sm">
            ◆
          </span>
          <span>
            <span className="block font-serif text-xl leading-none text-ink">
              Royal Travels
            </span>
            <span className="block text-[10px] tracking-wide text-muted mt-1">
              Luxury Chauffeur Service
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm text-ink/80">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <a
            href="tel:+919986780221"
            className="text-sm leading-tight border border-line rounded-md px-3 py-2"
          >
            <span className="flex items-center gap-1 text-[11px] text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              24/7 Available
            </span>
            <span className="font-semibold text-ink">+91 99867 80221</span>
          </a>
          <Link
            href="/#booking"
            className="bg-ink text-cream text-sm font-medium px-5 py-3 rounded-md hover:bg-black transition-colors whitespace-nowrap"
          >
            Instant Booking
          </Link>
        </div>
      </div>
    </header>
  );
}
