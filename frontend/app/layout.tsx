import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Royal Travels | Luxury Chauffeur Service",
  description:
    "Premium chauffeur-driven fleet for local city rentals, outstation journeys across India, and airport transfers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Open the TLS connection to the API while the page is still
            rendering, so the first data call does not pay for it. */}
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={API_ORIGIN} />
      </head>
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
