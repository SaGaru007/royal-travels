"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the detail in the browser console; never show raw internals to guests.
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-white border border-line rounded-xl p-8 text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-gold/20 items-center justify-center text-xl">
          ⚠️
        </span>
        <p className="eyebrow mt-5">Something went wrong</p>
        <h1 className="text-2xl font-bold text-ink mt-2">
          This page could not load
        </h1>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          The error has been logged. Try again, or return to the homepage and
          book from there.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
        <p className="text-xs text-muted mt-6">
          Still stuck? Call our concierge on{" "}
          <a href="tel:+919986780221" className="text-ink underline underline-offset-2">
            +91 99867 80221
          </a>
          .
        </p>
      </div>
    </main>
  );
}
