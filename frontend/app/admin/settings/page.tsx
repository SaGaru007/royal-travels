"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { API_BASE_URL, ApiError, changePassword } from "@/lib/api";
import { AdminSession, clearAdminSession, getAdminSession, getAdminToken } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSession(getAdminSession());
  }, []);

  function signOut() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(
        token,
        passwords.currentPassword,
        passwords.newPassword
      );
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess(
        "Password updated. Use the new password the next time you sign in."
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : "Could not update the password. Please try again."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-line bg-cream px-3 py-2.5 text-sm text-ink";

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
          <h2 className="font-semibold text-ink mb-1">Change password</h2>
          <p className="text-xs text-muted mb-4">
            The current password is required, so a borrowed session cannot lock
            you out. Use at least 8 characters.
          </p>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Current password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) =>
                  setPasswords({ ...passwords, currentPassword: event.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords({ ...passwords, newPassword: event.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Confirm new password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwords.confirmPassword}
                onChange={(event) =>
                  setPasswords({ ...passwords, confirmPassword: event.target.value })
                }
                className={inputClass}
              />
            </label>

            {passwordError && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                {passwordSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-gold text-sm py-2.5 disabled:opacity-60"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
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
