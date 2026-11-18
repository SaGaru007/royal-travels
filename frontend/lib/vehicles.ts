import { API_BASE_URL, type Vehicle } from "@/lib/api";

/**
 * Fetches the public catalogue during the build/revalidation so the cards are
 * part of the HTML. A sleeping free-tier API must not break the page: on any
 * failure the caller falls back to its client-side fetch (or hides the list).
 *
 * 60 s matches the API's own in-process vehicle cache and means an admin edit
 * shows up within a minute without hitting the database on every request.
 */
export async function getInitialVehicles(): Promise<Vehicle[] | undefined> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as Vehicle[];
  } catch {
    return undefined;
  }
}
