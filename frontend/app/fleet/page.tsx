import Header from "@/components/Header";
import FleetHero from "@/components/FleetHero";
import FleetGrid from "@/components/FleetGrid";
import FleetInclusions from "@/components/FleetInclusions";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function FleetPage() {
  return (
    <main>
      <Header />
      <FleetHero />
      <FleetGrid />
      <FleetInclusions />
      <CTABanner />
      <Footer />
    </main>
  );
}