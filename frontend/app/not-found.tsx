import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <main>
      <Header />
      <section className="max-w-content mx-auto container-px py-24">
        <div className="max-w-md mx-auto bg-white border border-line rounded-xl p-8 text-center">
          <p className="eyebrow">404</p>
          <h1 className="text-2xl font-bold text-ink mt-2">
            That page has moved on
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            The link may be out of date. You can book a ride, browse the fleet,
            or track an existing reservation from the links below.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link href="/" className="btn-primary">
              Book a ride
            </Link>
            <Link href="/fleet" className="btn-secondary">
              View fleet
            </Link>
            <Link href="/track" className="btn-secondary">
              Track a booking
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
