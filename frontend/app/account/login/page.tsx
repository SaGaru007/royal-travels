"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, customerLogin } from "@/lib/api";
import { getCustomerSession, saveCustomerSession } from "@/lib/customerAuth";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getCustomerSession()) router.replace("/account");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await customerLogin(email.trim(), password);
      saveCustomerSession({ token: result.token, name: result.name, email: result.email });
      router.replace("/account");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the API. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-3 justify-center mb-8">
          <span className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-cream">
            ◆
          </span>
          <span>
            <span className="block font-serif text-xl text-ink leading-none">Royal Travels</span>
            <span className="block text-[10px] tracking-wide text-muted mt-1">Guest Account</span>
          </span>
        </Link>

        <div className="bg-white border border-line rounded-xl p-8">
          <p className="eyebrow">Welcome back</p>
          <h1 className="text-2xl font-bold text-ink mt-2">Sign in</h1>
          <p className="text-xs text-muted mt-2">
            See every ride you have booked with us, in one place.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-muted mt-5 text-center">
            New here?{" "}
            <Link href="/account/signup" className="text-ink underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          No account needed to book —{" "}
          <Link href="/#booking" className="hover:text-ink underline underline-offset-2">
            book as a guest
          </Link>
        </p>
      </div>
    </div>
  );
}
