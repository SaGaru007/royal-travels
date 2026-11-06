# ADR 0005 — Free WhatsApp click-to-chat for driver dispatch

- **Status:** Accepted
- **Date:** 2026-11-06
- **Deciders:** Platform owner
- **Related:** [product.md](../product.md), [architecture.md](../architecture.md)

## Context

Dispatchers need to send a trip to a driver: guest name, phone, route, time,
flight, notes, and a link to the trip sheet. Drivers already use WhatsApp.

Automated WhatsApp messaging requires the Meta WhatsApp Business Cloud API:

- a Meta Business Portfolio and business verification;
- a dedicated phone number not already on WhatsApp;
- a Meta app with the WhatsApp product and a permanent access token;
- an approved message template per use case;
- a payment method and per-message billing;
- driver opt-in.

That is not free in practice, and it is a significant onboarding project for a
small agency. Email is free but ignored by drivers. SMS costs money per message.

## Decision

Use **WhatsApp click-to-chat** (`https://wa.me/<number>?text=<encoded message>`)
as the driver notification channel.

1. Dispatch assigns a driver from the roster.
2. **WhatsApp driver** builds a complete, formatted trip brief in the browser.
3. The link opens WhatsApp addressed to the driver's saved number.
4. A human presses send.
5. The message includes a trip-sheet link so the driver can open details and mark
   progress.

No Business API, no template approval, no per-message cost, no fake automation.

## Consequences

### Positive

- Zero cost and zero provider onboarding.
- Works with the number the driver already uses.
- The dispatcher can edit the message before sending.
- No message template approval delay.
- Honest UX: the button says "WhatsApp driver", not "notify automatically".

### Negative

- Delivery depends on a human pressing send.
- There is no delivery receipt, read receipt, or retry.
- The message is sent from the dispatcher's WhatsApp account, not a business
  number.
- If the roster phone is wrong, the message goes to the wrong person.

### Neutral

- The trip-sheet link gives the driver a path back into the system.
- The same pattern is used for the customer "chat with concierge" link.

## Alternatives considered

| Alternative | Why not |
|---|---|
| WhatsApp Business Cloud API | Paid, verification, templates, opt-in |
| SMS gateway | Per-message cost; no rich trip sheet link context |
| Email | Free but unreliable for drivers |
| Telegram bot | Free and automatable, but requires drivers to install/use Telegram |
| PWA push | Free but requires install and permission; poor iOS support |

## Review trigger

Revisit when:

- dispatch sends more than ~50 trips/day and manual sending is a measured
  bottleneck;
- Meta verification and per-message cost are acceptable to the business;
- a free Telegram-based flow is piloted and drivers adopt it.

Until then, the manual step is the correct trade-off.
