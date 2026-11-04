"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { API_BASE_URL } from "@/lib/api";
import { AdminSession, clearAdminSession, getAdminSession } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    setSession(getAdminSession());
  }, []);

  function signOut() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  return (
    <div>
      <AdminTopbar label="Executive Dispatch Desk" />
      <div className="p-6 max-w-3xl">
        <p className="eyebrow">Configuration</p>
        <h1 className="text-2xl font-bold text-ink mt-2">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Deployment and account information for this admin console.
        </p>

        <div className="bg-white border border-line rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-ink mb-4">Signed-in account</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={session?.name ?? "—"} />
            <Row label="Role" value={session?.role ?? "—"} />
            <Row
              label="Session storage"
              value="Browser session only (cleared when this tab closes)"
            />
          </dl>
          <button onClick={signOut} className="btn-secondary text-sm py-2.5 mt-5">
            Sign out
          </button>
        </div>

        <div className="bg-white border border-line rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-ink mb-4">API connection</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Backend base URL" value={API_BASE_URL} />
            <Row label="Admin bookings" value="/api/bookings" />
            <Row label="Admin fleet" value="/api/admin/vehicles" />
            <Row label="Public health" value="/api/health" />
          </dl>
          <p className="text-xs text-muted mt-4 leading-relaxed">
            To point this dashboard at a different backend, set{" "}
            <code className="bg-sage/60 px-1.5 py-0.5 rounded">
              NEXT_PUBLIC_API_BASE_URL
            </code>{" "}
            before building the frontend, and add the frontend origin to the
            backend&apos;s{" "}
            <code className="bg-sage/60 px-1.5 py-0.5 rounded">
              CORS_ALLOWED_ORIGINS
            </code>
            .
          </p>
        </div>

        <div className="bg-white border border-line rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-ink mb-2">Security notes</h2>
          <ul className="text-sm text-ink/70 space-y-2 list-disc list-inside">
            <li>Admin sessions are stateless JWTs stored in sessionStorage.</li>
            <li>Booking confirmation and tracking require the booking phone number.</li>
            <li>No payment details are collected on the public site.</li>
            <li>Rotate the JWT secret and admin password before going live.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-line last:border-0 pb-3 last:pb-0">
      <dt className="text-muted text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-ink font-medium text-right break-all">{value}</dd>
    </div>
  );
}
