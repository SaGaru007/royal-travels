"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, customerSignup } from "@/lib/api";
import { getCustomerSession, saveCustomerSession } from "@/lib/customerAuth";

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

export default function CustomerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (getCustomerSession()) router.replace("/account");
  }, [router]);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!PHONE_PATTERN.test(form.phone.replace(/\s/g, ""))) {
      setFieldErrors({ phone: "Enter a 10-digit number, optionally starting with +91." });
      return;
    }
    if (form.password.length < 8) {
      setFieldErrors({ password: "Password must be at least 8 characters." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await customerSignup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\s/g, ""),
        password: form.password,
      });
      saveCustomerSession({ token: result.token, name: result.name, email: result.email });
      router.replace("/account");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists. Try signing in.");
      } else if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        setError("Please fix the highlighted fields.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the API. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm";

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
          <p className="eyebrow">Create account</p>
          <h1 className="text-2xl font-bold text-ink mt-2">Join Royal Travels</h1>
          <p className="text-xs text-muted mt-2">
            Use the same phone number you book with, and your past rides appear automatically.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Full name</span>
              <input
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                className={inputClass}
                placeholder="Sagar Hadapad"
              />
              {fieldErrors.name && <span className="text-xs text-red-700">{fieldErrors.name}</span>}
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
              {fieldErrors.email && <span className="text-xs text-red-700">{fieldErrors.email}</span>}
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Phone</span>
              <input
                required
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                autoComplete="tel"
                className={inputClass}
                placeholder="9876543210"
              />
              {fieldErrors.phone && <span className="text-xs text-red-700">{fieldErrors.phone}</span>}
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                autoComplete="new-password"
                className={inputClass}
                placeholder="At least 8 characters"
              />
              {fieldErrors.password && <span className="text-xs text-red-700">{fieldErrors.password}</span>}
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-muted mt-5 text-center">
            Already have an account?{" "}
            <Link href="/account/login" className="text-ink underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
