"use client";

import Link from "next/link";

// Hero background image — used as the video's poster frame, and as the
// fallback for browsers with data-saver mode or prefers-reduced-motion on.
// A few other car + nature/road options if you want to try a different mood:
//   "https://images.unsplash.com/photo-1502877338535-766e1452684a" (misty green mountain road, no car)
//   "https://images.unsplash.com/photo-1502920917128-1aa500764cbd" (highway at dusk, original)
//   "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d" (mountain valley, no car)
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1920&auto=format&fit=crop";

// Hero background video — drop an MP4 into public/videos/hero-drive.mp4
// (see public/videos/README.md for free, license-safe sources). Until a
// file exists there, the <video> tag simply fails silently and visitors
// just see HERO_IMAGE, so nothing breaks in the meantime.
const HERO_VIDEO = "/videos/hero-drive.mp4";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Chauffeured car winding through a scenic mountain road"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <video
          className="hero-video absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          poster={HERO_IMAGE}
          onError={(e) => {
            // No video file yet (or it failed to load) — hide the <video>
            // element so the image behind it shows through instead.
            e.currentTarget.style.display = "none";
          }}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/80 to-cream/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-transparent" />
      </div>

      <div className="relative max-w-content mx-auto container-px pt-14 pb-28">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium text-ink/70 bg-cream/80 border border-line rounded-full px-3 py-1.5">
          Royal Heritage Chauffeur Service • Pan-India
        </span>

        <h1 className="mt-6 max-w-xl text-5xl md:text-[3.4rem] leading-[1.05] font-extrabold text-ink tracking-tight">
          Travel in absolute comfort.
          <br />
          Arrive with{" "}
          <span className="text-goldDeep font-serif italic font-medium">
            confidence.
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink/70">
          Premium chauffeur-driven fleet for local city rentals, outstation
          journeys across India, and airport transfers. Experience immaculate
          luxury, verified master chauffeurs, and effortless punctuality.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white/70 border border-line rounded-md px-4 py-3">
            <span className="text-ink">☎</span>
            <div className="text-sm">
              <div className="text-muted text-xs">
                Speak directly to our travel concierge
              </div>
              <div className="font-semibold text-ink">+91 99867 80221</div>
            </div>
          </div>
          <span className="text-xs text-muted hidden sm:block">
            Instant confirmations in 15 minutes
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <a href="#booking" className="btn-primary">
            Check Availability &amp; Rates {"\u2304"}
          </a>
          <Link href="/fleet" className="btn-secondary bg-white/70">
            Explore Luxury Fleet
          </Link>
        </div>
      </div>

      <BookingBarPlaceholder />
    </section>
  );
}

function BookingBarPlaceholder() {
  // Rendered by BookingBar; kept here so Hero owns the overlap spacing.
  return null;
}