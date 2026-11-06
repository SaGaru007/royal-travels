import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DriverTripSheet from "@/components/DriverTripSheet";

export default function DriverTripPage() {
  return (
    <main>
      <Header />
      <Suspense
        fallback={
          <div className="max-w-content mx-auto container-px py-24 text-center text-sm text-muted">
            Loading trip sheet…
          </div>
        }
      >
        <DriverTripSheet />
      </Suspense>
      <Footer />
    </main>
  );
}
