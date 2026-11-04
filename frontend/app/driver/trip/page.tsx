import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DriverTripPage() {
  return (
    <main>
      <Header />
      <section className="max-w-content mx-auto container-px py-20">
        <div className="max-w-lg mx-auto bg-white border border-line rounded-xl p-8 text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-gold/20 items-center justify-center text-xl">
            🗺
          </span>
          <p className="eyebrow mt-5">Driver Trip Sheet</p>
          <h1 className="text-2xl font-bold text-ink mt-2">
            Trip sheets are not available yet
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Live trip sheets and navigation will be part of the chauffeur app.
            Until then, dispatch shares trip details directly with each driver.
          </p>
          <a href="tel:+919986780221" className="btn-primary mt-6">
            📞 Call dispatch
          </a>
          <p className="text-xs text-muted mt-6">
            <Link href="/" className="hover:text-ink">
              ← Back to Royal Travels
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
