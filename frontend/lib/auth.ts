"use client";

const SESSION_KEY = "rt_admin_session";

export interface AdminSession {
  token: string;
  name: string;
  role: string;
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function getAdminToken(): string | null {
  return getAdminSession()?.token ?? null;
}
