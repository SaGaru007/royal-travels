# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `1.x` (current `main`) | Yes |
| Older commits and forks | No |

This is a small deployment; there are no long-term support branches. Security
fixes land on `main` and are deployed from there.

---

## Reporting a vulnerability

**Do not open a public GitHub issue for a security problem.**

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue with enough detail to reproduce it.

Direct link:
<https://github.com/SaGaru007/RoyalTravels/security/advisories/new>

If private reporting is unavailable, contact the repository owner through the
contact method on their GitHub profile. Do not send secrets or personal data in
the first message.

### What to include

- Affected route, component, or file.
- A clear reproduction (requests, payloads, steps).
- Impact: what an attacker could read, change, or break.
- Whether the issue affects production or only local development.
- Any suggested fix, if you have one.

### Please do not

- Access, modify, or exfiltrate other people's data.
- Run automated scanners against the production site without permission.
- Open a public issue, post on social media, or share proof-of-concept details
  before a fix is available.
- Test against real customer bookings. Use a local instance.

---

## Response targets

These are best-effort targets for a solo-maintained project, not a contractual
SLA.

| Stage | Target |
|---|---|
| Acknowledge receipt | 72 hours |
| Initial triage and severity | 7 days |
| Fix or mitigation for critical issues | 30 days |
| Public disclosure | After a fix is deployed, coordinated with the reporter |

We will keep you informed if a target slips.

---

## Scope

In scope:

- Authentication and authorization bypasses.
- Exposure of customer, driver, or admin data.
- Injection (SQL, command, template).
- Server-side request forgery.
- Stored or reflected XSS in application code.
- Privilege escalation between `customer`, `staff`, and `owner`.
- Leaked secrets in the repository or build artifacts.
- Rate-limit bypass that enables practical abuse.
- Business-logic flaws that expose or corrupt bookings.

Out of scope (for this project):

- Findings that require a compromised device or browser extension.
- Missing security headers with no demonstrated impact.
- Theoretical timing attacks without a practical exploit.
- Spam or social engineering against staff.
- Denial of service through volumetric traffic (report to the hosting provider).
- Issues in third-party providers (Render, Vercel, Supabase) — report those to
  the provider.
- Reports generated solely by an automated scanner without a demonstrated
  vulnerability.

---

## Safe harbour

We will not pursue legal action against researchers who:

- act in good faith and follow this policy;
- avoid privacy violations, data destruction, and service disruption;
- give us reasonable time to fix the issue before disclosure;
- do not exploit the issue beyond what is needed to demonstrate it.

---

## What we will do

1. Confirm the report and assign a severity.
2. Reproduce the issue in a non-production environment.
3. Develop and test a fix.
4. Deploy the fix and verify it.
5. Credit the reporter, if they want credit.
6. Publish a GitHub Security Advisory when appropriate.

---

## Known accepted risks

The following are documented, accepted trade-offs for the current deployment.
They are not vulnerabilities in themselves, but a report that demonstrates real
impact from one is still welcome.

- No admin 2FA.
- No per-token revocation (8-hour JWT expiry; rotate `JWT_SECRET` in an
  emergency).
- Admin JWT stored in `sessionStorage` (XSS would expose it).
- In-process rate limiting that resets on restart and does not span instances.
- Public Swagger UI and health details.
- Free-tier hosting without a WAF or guaranteed uptime.
- Manual database backups.

See [docs/security.md](docs/security.md) for the full risk register.
