"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Fleet", href: "/fleet" },
  { label: "Services", href: "/#services" },
  { label: "Outstation", href: "/#booking" },
  { label: "Local", href: "/#booking" },
  { label: "Track Booking", href: "/track" },
  { label: "My Account", href: "/account" },
  { label: "Contact", href: "/#contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-line">
      <div className="max-w-content mx-auto container-px h-20 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0"
          onClick={() => setOpen(false)}
        >
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

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-line bg-white text-ink"
        >
          <span aria-hidden className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="lg:hidden border-t border-line bg-cream">
          <nav className="max-w-content mx-auto container-px py-3 grid grid-cols-2 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink/80 hover:text-ink px-3 py-2.5 rounded-md hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="max-w-content mx-auto container-px pb-4 flex flex-col gap-2">
            <a
              href="tel:+919986780221"
              className="border border-line rounded-md px-3 py-2.5 text-sm bg-white"
            >
              <span className="block text-[10px] text-emerald-700">24/7 dispatch</span>
              <span className="font-semibold text-ink">+91 99867 80221</span>
            </a>
            <Link
              href="/#booking"
              onClick={() => setOpen(false)}
              className="bg-ink text-cream text-sm font-medium px-4 py-3 rounded-md text-center"
            >
              Instant Booking
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
