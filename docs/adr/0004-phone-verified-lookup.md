# ADR 0004 — Phone-verified lookup for bookings and driver trips

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [security.md](../security.md), [api.md](../api.md)

## Context

A confirmation link must work without a login. The naive design is
`GET /api/bookings/{id}`, where the UUID is the only secret. UUIDv4 is hard to
guess, but links leak: they are forwarded on WhatsApp, shown on a shared screen,
stored in browser history, and pasted into support chats. A leaked link would
expose the customer's name, phone, email, route, flight number, and notes.

Drivers need the same trip details without another password. A driver workforce
mostly uses WhatsApp and changes phones; password resets would be constant.

## Decision

1. Public booking lookup requires **the booking UUID and the phone number used
   on the booking**.
2. Driver trip lookup requires **the booking UUID and the phone number of the
   driver assigned to that booking**.
3. Comparison uses digits only and matches the last 10 digits in either
   direction, so country-code and spacing differences do not break legitimate
   access.
4. A missing record and a wrong secret return the **same `404`** with the same
   message.
5. Driver stage updates require the same phone proof; a booking reference alone
   is not enough.

## Consequences

### Positive

- A forwarded confirmation link reveals nothing without the phone number.
- No customer account is required to track a booking.
- Drivers need no password, no reset flow, and no app install.
- The same privacy model applies to both customer and driver access.
- There is no endpoint that lists bookings publicly.

### Negative

- A customer who mistypes their booking phone cannot self-serve.
- A person who knows both the reference and the phone can access the booking.
  This is acceptable: that combination is effectively "the customer".
- Driver access depends on dispatch keeping the roster phone current.
- Phone numbers are not a strong secret; they are a second factor, not
  authentication.

### Neutral

- The last-10-digit rule is an India-centric choice that also works for many
  international numbers.
- The UUID remains the primary identifier; the phone is the gate.

## Alternatives considered

| Alternative | Why not |
|---|---|
| UUID only | A leaked link exposes personal data |
| One-time code by SMS | Costs money, needs a provider, adds friction |
| Customer accounts only | Guest checkout must work |
| Driver passwords | Reset burden for a WhatsApp-first workforce |
| Signed expiring links | Better, but still leaks the full booking when forwarded |

## Review trigger

Revisit if:

- customers report frequent lookup failures due to phone changes;
- a privacy review requires stronger proof for trip access;
- an SMS/OTP provider is added for other reasons, making one-time codes cheap.
