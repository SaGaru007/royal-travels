"use client";

import type { Booking } from "./api";

const BOOKING_KEY = "rt_last_booking";

export function saveLastBooking(booking: Booking) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
}

export function getLastBooking(): Booking | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_KEY);
    return raw ? (JSON.parse(raw) as Booking) : null;
  } catch {
    return null;
  }
}

export function clearLastBooking() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(BOOKING_KEY);
}
