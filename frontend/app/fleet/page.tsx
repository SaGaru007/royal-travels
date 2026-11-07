import type { Metadata } from "next";
import Header from "@/components/Header";
import FleetHero from "@/components/FleetHero";
import FleetGrid from "@/components/FleetGrid";
import FleetInclusions from "@/components/FleetInclusions";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";
import { API_BASE_URL, type Vehicle } from "@/lib/api";

// The catalogue changes only when an admin edits it, so 60 s of ISR is plenty
// and matches the API's own 60 s vehicle cache.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Fleet | Royal Travels",
  description:
    "Sedans, MPVs, SUVs and luxury vans with chauffeurs, available for local, outstation and airport travel.",
};

/**
 * Fetches the catalogue during the build/revalidation so the cards are part of
 * the HTML. A sleeping free-tier API must not break the page: on any failure
 * the grid falls back to its client-side fetch.
 */
async function getInitialVehicles(): Promise<Vehicle[] | undefined> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as Vehicle[];
  } catch {
    return undefined;
  }
}

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
