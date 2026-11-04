import { Suspense } from "react";
import Header from "@/components/Header";
import BookingConfirmation from "@/components/BookingConfirmation";
import Footer from "@/components/Footer";

export default function ConfirmationPage() {
  return (
    <main>
      <Header />
      <Suspense
        fallback={
          <div className="max-w-content mx-auto container-px py-24 text-center text-sm text-muted">
            Loading your reservation…
          </div>
        }
      >
        <BookingConfirmation />
      </Suspense>
      <Footer />
    </main>
  );
}
