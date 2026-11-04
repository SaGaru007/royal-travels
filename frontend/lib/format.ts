export function formatMoney(amount?: number | null) {
  if (amount === null || amount === undefined) return "On request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  const [hour, minute] = value.split(":");
  if (hour === undefined || minute === undefined) return value;
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shortReference(id: string) {
  return `RT-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function whatsappLink(message: string) {
  return `https://wa.me/919986780221?text=${encodeURIComponent(message)}`;
}
