# ADR 0008 — Customer-facing live driver location

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** owner
- **Related:** [ADR 0004](0004-phone-verified-lookup.md), [ADR 0006](0006-free-tier-hosting.md), [ADR 0005](0005-whatsapp-click-to-chat.md)

## Context

Customers booking a chauffeur expect the visibility they get from ride-hailing
apps: once the trip starts, they want to see where the car is. Drivers are
passwordless and use the trip sheet in a mobile browser; there is no mobile app,
no GPS hardware, and no budget for one.

The database already reserved `bookings.current_lat` and `current_lng` for this.
The requirement is honest, low-cost tracking that degrades visibly rather than
pretending to be a guaranteed live feed.

## Decision

While a trip is `started`, the driver's trip sheet may use
`navigator.geolocation.watchPosition` to POST their position to
`POST /api/driver/trips/{id}/location` at most every 10 seconds. The last
position and its timestamp are stored on the booking and returned by the
existing phone-verified lookup. The customer page renders it with Leaflet and
OpenStreetMap tiles, polls every 15 seconds, and marks a report older than two
minutes as stale.

Sharing is opt-in per trip (a button on the trip sheet), rejected by the API
unless the trip is started, and cleared when dispatch reassigns the booking to
a different driver.

## Consequences

### Positive

- Customers see the actual car on a map at zero recurring cost (OSM tiles, no
  API key, no billing).
- No new dependency on the driver's side: the trip sheet already exists.
- The API is the only writer; the customer must still prove the phone number,
  so a leaked booking reference alone reveals nothing.
- Stale data is labelled, not hidden, so the feature never lies about freshness.

### Negative

- Tracking stops when the driver locks the screen, closes the tab, or the OS
  throttles background browsers. This is the fundamental limit of the approach.
- The driver's battery and mobile data are used while sharing.
- OpenStreetMap tiles are donated infrastructure with a usage policy; high
  traffic requires a paid tile provider.
- One more unauthenticated write endpoint to rate limit (90 per 10 minutes).

### Neutral

- Positions are last-known-only; there is no historical track table. The
  customer page draws a breadcrumb from what it has seen during that visit.

## Alternatives considered

| Alternative | Why not |
|---|---|
| WhatsApp live location | Free and works with the screen locked, but it is not on the site and cannot be embedded or logged. Kept as a manual fallback via the driver's WhatsApp button. |
| Native driver app with background location | Correct long-term answer, but needs app-store maintenance and a developer account; out of scope for a free pilot. |
| GPS hardware (Traccar et al.) | ~₹1,500–3,000 per vehicle plus a server; unjustified before there is booking volume. |
| Paid maps SDK (Google/Mapbox) | Adds billing and API-key management for no visual gain at this scale. |
| Fake or simulated movement | Would mislead customers; rejected outright. |

## Review trigger

Revisit when either (a) more than roughly 20 concurrent trips make browser-based
sharing unreliable, (b) drivers report that keeping the page open is impractical,
or (c) the business can fund a driver app or GPS hardware.
