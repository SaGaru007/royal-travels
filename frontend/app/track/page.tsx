import { Suspense } from "react";
import Header from "@/components/Header";
import LiveTracking from "@/components/LiveTracking";
import Footer from "@/components/Footer";

export default function TrackPage() {
  return (
    <main>
      <Header />
      <Suspense
        fallback={
          <div className="max-w-content mx-auto container-px py-24 text-center text-sm text-muted">
            Loading booking status…
          </div>
        }
      >
        <LiveTracking />
      </Suspense>
      <Footer />
    </main>
  );
}
