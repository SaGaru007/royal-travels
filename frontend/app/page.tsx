import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BookingBar from "@/components/BookingBar";
import Features from "@/components/Features";
import Offerings from "@/components/Offerings";
import Fleet from "@/components/Fleet";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";
import { getInitialVehicles } from "@/lib/vehicles";

// Keeps the homepage fleet section in step with the catalogue cache.
export const revalidate = 60;

export default async function Home() {
  const vehicles = await getInitialVehicles();

  return (
    <main>
      <Header />
      <Hero />
      <BookingBar />
      <Features />
      <Offerings />
      <Fleet vehicles={vehicles ?? []} />
      <CTABanner />
      <Footer />
    </main>
  );
}
