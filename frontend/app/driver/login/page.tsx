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
            No driver password needed
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Dispatch sends each trip on WhatsApp with a trip-sheet link. Open
            that link and confirm your phone number to see the guest, route, and
            pickup time. There is no separate driver account to remember.
          </p>
          <Link href="/driver/trip" className="btn-primary mt-6">
            Open a trip sheet
          </Link>
          <p className="text-xs text-muted mt-6">
            Need the link? Call dispatch on{" "}
            <a href="tel:+919986780221" className="text-ink underline underline-offset-2">
              +91 99867 80221
            </a>
            .
          </p>
          <p className="text-xs text-muted mt-3">
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
