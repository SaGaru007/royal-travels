# Contributing to RoyalTravels

Thank you for considering a contribution. This document explains how to make a
change that is easy to review and safe to deploy.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a
public issue.

---

## 1. Before you start

- Read [docs/architecture.md](docs/architecture.md) to understand the layering.
- Read [docs/development.md](docs/development.md) for local setup.
- Check existing issues and pull requests to avoid duplicate work.
- For a large change, open an issue first and describe the approach. A short
  design discussion is cheaper than a rejected pull request.

---

## 2. Development workflow

1. **Fork** the repository (or create a branch if you have write access).
2. **Branch** from `main`:

```text
feat/driver-availability
fix/booking-duplicate-window
docs/deployment-troubleshooting
chore/update-spring-boot
```

3. **Set up** the backend and frontend as described in
   [docs/development.md](docs/development.md).
4. **Make the change** in small, logical commits.
5. **Run the gates** (below).
6. **Open a pull request** using the template.
7. **Respond to review**. Keep the discussion on the pull request, not in chat.
8. A maintainer merges. Delete the branch afterwards.

---

## 3. Build and test gates

Run all of these before opening a pull request.

```powershell
# Backend compiles and packages
.\mvnw.cmd -DskipTests clean package

# Frontend type-checks and builds
cd frontend
npx tsc --noEmit
npm run build

# Optional: full context boot against the configured database
cd ..
.\mvnw.cmd test
```

For changes that touch the API, run the E2E suite against a local API:

```powershell
$env:API_BASE_URL="http://localhost:8081"
$env:ADMIN_EMAIL="<local admin email>"
$env:ADMIN_PASSWORD="<local admin password>"
node scripts/e2e-smoke.mjs
```

Expected: `43 passed, 0 failed`. If you add a check, update the count in
[docs/testing.md](docs/testing.md) and the README.

CI runs the backend package and the frontend build. It does not run database
tests, because they need live credentials.

---

## 4. Coding standards

### Java

- Java 21, package `com.example.demo`.
- Constructor injection only.
- Controllers: HTTP mapping, `@Valid`, `@PreAuthorize`, status codes. No
  business logic.
- Services: business rules, transactions, DTO mapping.
- Repositories: queries only.
- Never return an entity from a controller. Add a DTO record and a `from(...)`
  mapper.
- Use `ResponseStatusException` for expected failures; let
  `GlobalExceptionHandler` shape the response.
- Comments explain **why**, not **what**.

### TypeScript / React

- App Router only.
- Add `"use client"` only when the file needs state, effects, or browser APIs.
- Every API call goes through `frontend/lib/api.ts`.
- Use shared formatters in `lib/format.ts`.
- Icon-only buttons need `aria-label`.
- Wrap `useSearchParams` consumers in `Suspense`.
- Do not add a UI dependency for something Tailwind can do.

### Database

- No `ddl-auto=update` or `create`, ever.
- New schema changes go in `db/` as idempotent SQL.
- Add `CHECK` constraints for new enum-like columns.
- Add an index only for a query that exists.
- Update [docs/database.md](docs/database.md) in the same pull request.

### API changes

- Public routes require an explicit matcher in `SecurityConfig`.
- Add Bean Validation to every request field.
- Add an E2E check for new behaviour.
- Update [docs/api.md](docs/api.md) and the endpoint table in the README.
- Do not break an existing field without a coordinated frontend release.

---

## 5. Commit messages

Use the imperative mood and a scope. Conventional Commits are preferred:

```text
feat(booking): reject duplicate submissions within 10 minutes
fix(admin): preserve vehicle status when PUT omits it
docs(security): document Supabase PostgREST exposure check
test(e2e): cover driver stage transitions
chore(deps): bump springdoc to 3.1.1
```

One logical change per commit. Do not mix formatting, refactoring, and behaviour
in one commit.

---

## 6. Pull requests

A good pull request:

- explains **why**, not only **what**;
- lists the verification performed (commands and results);
- calls out database changes and the order of deployment;
- includes screenshots for visible UI changes;
- updates documentation;
- has no unrelated changes.

Use the repository's
[pull request template](.github/PULL_REQUEST_TEMPLATE.md).

### Review expectations

- At least one maintainer approval before merge.
- CI must be green.
- Conversations must be resolved.
- The author merges after approval, unless the maintainer agrees otherwise.

### Merge strategy

Squash-merge for feature branches, so `main` stays readable. Keep the pull
request number in the squash message.

---

## 7. Definition of done

- [ ] Code compiles and the frontend builds.
- [ ] New behaviour is covered by an E2E check, or the pull request explains why
      not.
- [ ] Existing checks still pass.
- [ ] Schema changes are committed as SQL and applied.
- [ ] Documentation is updated.
- [ ] No secrets, tokens, or real customer data are in the diff.
- [ ] `CHANGELOG.md` is updated for user-visible changes.

---

## 8. Release process

Maintainers only:

1. Merge to `main`.
2. Confirm CI is green.
3. Render and Vercel deploy automatically.
4. Watch the Render log for `Started RoyalTravelsApplication`.
5. Run the production smoke checks in
   [docs/deployment.md](docs/deployment.md#5-production-verification).
6. Tag the release: `git tag -a vX.Y.Z -m "Release X.Y.Z"`.
7. Update `CHANGELOG.md` if it was not updated in the pull request.

For a database change, apply the SQL before deploying the code that depends on
it. Keep the change backwards compatible during the rollout.

---

## 9. Reporting bugs

Use the issue template. Include:

- what you expected;
- what happened;
- steps to reproduce;
- environment (browser, OS, local or production);
- relevant logs or screenshots, with personal data removed.

Do not include passwords, JWTs, database URLs, or customer data.
