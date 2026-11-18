/**
 * Single source of truth for the business identity.
 *
 * The defaults are the live Royal Travels details. Override them in Vercel
 * with NEXT_PUBLIC_CONTACT_PHONE, NEXT_PUBLIC_CONTACT_EMAIL,
 * NEXT_PUBLIC_BUSINESS_ADDRESS and NEXT_PUBLIC_BUSINESS_HOURS rather than
 * editing components. NEXT_PUBLIC_* values are inlined at build time, so a
 * change needs a redeploy (normal for Vercel).
 *
 * Optional fields are empty by default: the UI omits them instead of showing
 * an unverified address or opening hours.
 */

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function displayPhone(raw: string) {
  const compact = digits(raw);
  // Indian mobile numbers: +91 99867 80221
  if (compact.length === 12 && compact.startsWith("91")) {
    return `+91 ${compact.slice(2, 7)} ${compact.slice(7)}`;
  }
  return raw;
}

const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "+919986780221";
const email =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "bookings@royaltravels.in";

export const SITE = {
  name: "Royal Travels",
  tagline: "Luxury Chauffeur Service",
  phone,
  phoneDisplay: displayPhone(phone),
  telHref: `tel:+${digits(phone)}`,
  email,
  emailHref: `mailto:${email}`,
  whatsappNumber: digits(phone),
  /** Empty when the business has not published a street address. */
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() || "",
  /** Empty when the business has not published hours. */
  hours: process.env.NEXT_PUBLIC_BUSINESS_HOURS?.trim() || "",
} as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
