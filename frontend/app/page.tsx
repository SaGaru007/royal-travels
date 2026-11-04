import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BookingBar from "@/components/BookingBar";
import Features from "@/components/Features";
import Offerings from "@/components/Offerings";
import Fleet from "@/components/Fleet";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <BookingBar />
      <Features />
      <Offerings />
      <Fleet />
      <CTABanner />
      <Footer />
    </main>
  );
}
