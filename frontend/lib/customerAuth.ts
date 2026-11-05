"use client";

const SESSION_KEY = "rt_customer_session";

export interface CustomerSession {
  token: string;
  name: string;
  email: string;
}

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCustomerSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function getCustomerToken(): string | null {
  return getCustomerSession()?.token ?? null;
}
