import type { Metadata } from "next";
import Header from "@/components/Header";
import FleetHero from "@/components/FleetHero";
import FleetGrid from "@/components/FleetGrid";
import FleetInclusions from "@/components/FleetInclusions";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";
import { getInitialVehicles } from "@/lib/vehicles";

// The catalogue changes only when an admin edits it, so 60 s of ISR is plenty
// and matches the API's own 60 s vehicle cache.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Fleet | Royal Travels",
  description:
    "Sedans, MPVs, SUVs and luxury vans with chauffeurs, available for local, outstation and airport travel.",
};

export default async function FleetPage() {
  const initialVehicles = await getInitialVehicles();

  return (
    <main>
      <Header />
      <FleetHero />
      <FleetGrid initialVehicles={initialVehicles} />
      <FleetInclusions />
      <CTABanner />
      <Footer />
    </main>
  );
}
