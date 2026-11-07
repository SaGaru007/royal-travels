export type ServiceType = "outstation" | "local" | "airport" | "callback";
export type BookingStatus = "new" | "contacted" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid";
export type TripStage = "assigned" | "started" | "completed";
export type VehicleStatus = "active" | "maintenance" | "inactive";
export type DriverStatus = "available" | "on_trip" | "off_duty";

export interface Booking {
  id: string;
  createdAt: string;
  serviceType: ServiceType;
  name: string;
  phone: string;
  email?: string | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  tripType?: string | null;
  returnDate?: string | null;
  packageType?: string | null;
  transferType?: string | null;
  flightNumber?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  vehiclePreference?: string | null;
  passengers?: string | null;
  preferredCallTime?: string | null;
  notes?: string | null;
  baseFare?: number | null;
  totalFare?: number | null;
  advanceAmount?: number | null;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  tripStage: TripStage;
  driverId?: string | null;
}

export interface BookingCreate {
  serviceType: ServiceType;
  name: string;
  phone: string;
  email?: string;
  pickupLocation?: string;
  dropLocation?: string;
  tripType?: string;
  returnDate?: string;
  packageType?: string;
  transferType?: string;
  flightNumber?: string;
  pickupDate?: string;
  pickupTime?: string;
  vehiclePreference?: string;
  passengers?: string;
  preferredCallTime?: string;
  notes?: string;
}

export interface BookingUpdate {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  tripStage?: TripStage;
  /** Empty string unassigns the current driver. */
  driverId?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  category: string;
  plateNumber: string;
  capacity: number;
  luggageCapacity?: string | null;
  tariffPerKm: number;
  tariffLocal?: number | null;
  imageUrl?: string | null;
  status: VehicleStatus;
}

export interface VehiclePayload {
  name: string;
  category: string;
  plateNumber: string;
  capacity: number;
  luggageCapacity?: string;
  tariffPerKm: number;
  tariffLocal?: number;
  imageUrl?: string;
  status?: VehicleStatus;
}

export interface Driver {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  rating: number;
  tripsCompleted: number;
  licenseVerified: boolean;
  status: DriverStatus;
  vehicleId?: string | null;
}

export interface DriverPayload {
  name: string;
  phone: string;
  rating?: number;
  tripsCompleted?: number;
  licenseVerified?: boolean;
  status?: DriverStatus;
  vehicleId?: string | null;
}

export interface DriverTripResponse {
  booking: Booking;
  driverName: string;
}

export interface LoginResponse {
  token: string;
  name: string;
  role: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CustomerAuthResponse {
  token: string;
  name: string;
  email: string;
  role: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface CustomerSignupPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081"
).replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 25_000;

/**
 * The API sleeps when idle on free hosting, so the first call after a quiet
 * period can take 30-90 s. Firing this when a page mounts means the visitor's
 * real request usually finds the instance already awake.
 */
export async function warmUpApi() {
  const controller = new AbortController();
  // A cold start can legitimately take a minute; give up after that so the
  // browser is not left holding an open request forever.
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    await fetch(`${API_BASE_URL}/api/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // Best effort only: a failed warm-up must never block the UI.
  } finally {
    clearTimeout(timer);
  }
}

function describeNetworkFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The server took too long to answer. It may still be waking up — please try again in a moment.";
  }
  return (
    `Could not reach the API at ${API_BASE_URL}. ` +
    "Check your connection and try again. The server may also be starting up " +
    "(free hosting sleeps after 15 minutes of inactivity)."
  );
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const method = (options.method ?? "GET").toUpperCase();
  // Only reads are retried; retrying a POST could create a duplicate booking.
  const idempotent = method === "GET" || method === "HEAD";
  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (firstError) {
    if (!idempotent) {
      throw new ApiError(0, describeNetworkFailure(firstError));
    }
    try {
      response = await fetchWithTimeout(url, {
        ...options,
        headers,
        cache: "no-store",
      });
    } catch (secondError) {
      throw new ApiError(0, describeNetworkFailure(secondError));
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const problem = data as
      | { detail?: string; message?: string; errors?: Record<string, string> }
      | null;

    let message =
      problem?.detail ?? problem?.message ?? response.statusText ?? "Request failed";

    // A CORS rejection has no JSON body, so Spring's "Forbidden" is all the
    // client sees. Translate it into something actionable instead of letting
    // the visitor believe the whole site is down.
    if (response.status === 403 && !problem?.detail) {
      message =
        "The API refused this request (403). If the site was just deployed, this domain is probably not on the API's allowed-origin list yet.";
    }

    throw new ApiError(response.status, message, problem?.errors);
  }

  return data as T;
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function customerSignup(payload: CustomerSignupPayload) {
  return request<CustomerAuthResponse>("/api/auth/customer/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function customerLogin(email: string, password: string) {
  return request<CustomerAuthResponse>("/api/auth/customer/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCustomerProfile(token: string) {
  return request<CustomerProfile>("/api/customer/me", {}, token);
}

export function getCustomerBookings(token: string) {
  return request<Booking[]>("/api/customer/bookings", {}, token);
}

export function createBooking(payload: BookingCreate) {
  return request<Booking>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function lookupBooking(id: string, phone: string) {
  return request<Booking>("/api/bookings/lookup", {
    method: "POST",
    body: JSON.stringify({ id, phone }),
  });
}

export function getVehicles() {
  return request<Vehicle[]>("/api/vehicles");
}

export function getBookings(
  token: string,
  params: { status?: string; q?: string; page?: number; size?: number } = {}
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 100));
  return request<Page<Booking>>(`/api/bookings?${search.toString()}`, {}, token);
}

export function updateBooking(token: string, id: string, payload: BookingUpdate) {
  return request<Booking>(`/api/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export function getAdminVehicles(token: string) {
  return request<Vehicle[]>("/api/admin/vehicles", {}, token);
}

export function createVehicle(token: string, payload: VehiclePayload) {
  return request<Vehicle>("/api/admin/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function updateVehicle(token: string, id: string, payload: VehiclePayload) {
  return request<Vehicle>(`/api/admin/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteVehicle(token: string, id: string) {
  return request<void>(`/api/admin/vehicles/${id}`, { method: "DELETE" }, token);
}

export function getDrivers(token: string) {
  return request<Driver[]>("/api/admin/drivers", {}, token);
}

export function createDriver(token: string, payload: DriverPayload) {
  return request<Driver>("/api/admin/drivers", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function updateDriver(token: string, id: string, payload: DriverPayload) {
  return request<Driver>(`/api/admin/drivers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteDriver(token: string, id: string) {
  return request<void>(`/api/admin/drivers/${id}`, { method: "DELETE" }, token);
}

/** Driver trip sheet: booking reference + the assigned driver's phone. */
export function getDriverTrip(id: string, phone: string) {
  return request<DriverTripResponse>("/api/driver/trips/lookup", {
    method: "POST",
    body: JSON.stringify({ id, phone }),
  });
}

export function updateDriverStage(
  id: string,
  payload: { phone: string; stage: "started" | "completed" }
) {
  return request<DriverTripResponse>(`/api/driver/trips/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
) {
  return request<void>("/api/admin/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  }, token);
}
