"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, login, warmUpApi } from "@/lib/api";
import { getAdminSession, saveAdminSession } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAdminSession()) {
      router.replace("/admin/bookings");
    }
    // Wake the API while the admin types their credentials.
    void warmUpApi();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      saveAdminSession({
        token: result.token,
        name: result.name,
        role: result.role,
      });
      router.replace("/admin/bookings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the admin API. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <span className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-cream">
            ◆
          </span>
          <div>
            <div className="font-serif text-xl text-ink leading-none">
              Royal Travels
            </div>
            <div className="text-[10px] tracking-wide text-muted mt-1">
              Concierge Dispatch
            </div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-8">
          <p className="eyebrow">Admin Access</p>
          <h1 className="text-2xl font-bold text-ink mt-2">Sign in</h1>
          <p className="text-xs text-muted mt-2">
            Use the owner or staff account configured for this deployment.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                className="w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm"
                placeholder="owner@example.com"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Password
              </span>
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
              <p
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in to dispatch"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <a href="/" className="hover:text-ink">
            ← Back to Royal Travels
          </a>
        </p>
      </div>
    </div>
  );
}
