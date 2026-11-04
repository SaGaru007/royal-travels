import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DriverLoginPage() {
  return (
    <main>
      <Header />
      <section className="max-w-content mx-auto container-px py-20">
        <div className="max-w-lg mx-auto bg-white border border-line rounded-xl p-8 text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-gold/20 items-center justify-center text-xl">
            🚖
          </span>
          <p className="eyebrow mt-5">Driver Portal</p>
          <h1 className="text-2xl font-bold text-ink mt-2">
            Chauffeur login is coming soon
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Driver accounts, trip sheets, and live location sharing are not
            enabled yet. Our dispatch team assigns trips by phone in the
            meantime.
          </p>
          <a href="tel:+919986780221" className="btn-primary mt-6">
            📞 Contact dispatch
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
