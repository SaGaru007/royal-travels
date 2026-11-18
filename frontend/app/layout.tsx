import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL Open Font License) so a build never depends on downloading
// from Google Fonts: that fetch is flaky and twice failed the CI build.
const sans = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const serif = localFont({
  src: [
    {
      path: "./fonts/fraunces-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-italic-latin.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-serif",
  display: "swap",
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
