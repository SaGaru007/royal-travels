import Link from "next/link";

export default function CTABanner() {
  return (
    <section id="contact" className="bg-ink text-cream py-16">
      <div className="max-w-content mx-auto container-px flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <p className="text-gold text-xs font-semibold tracking-wide mb-3">
            ⚡ Direct Concierge Dispatch Desk
          </p>
          <h2 className="text-2xl md:text-3xl font-bold max-w-md">
            Need an immediate car or customized package?
          </h2>
          <p className="mt-3 text-cream/70 text-sm max-w-md">
            Call directly at{" "}
            <a href="tel:+919986780221" className="text-cream font-semibold hover:underline">
              +91 99867 80221
            </a>{" "}
            or request an instant callback with vehicle pictures.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href="tel:+919986780221" className="btn-gold">
            Call +91 99867 80221
          </a>
          <a
            href="https://wa.me/919986780221?text=Hello%20Royal%20Travels%2C%20I%20would%20like%20a%20vehicle%20and%20rate%20quote."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-cream px-6 py-3.5 rounded-md hover:bg-white/20 transition-colors"
          >
            WhatsApp Concierge
          </a>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-cream px-6 py-3.5 rounded-md hover:bg-white/20 transition-colors"
          >
            Request Callback
          </Link>
        </div>
      </div>
    </section>
  );
}
