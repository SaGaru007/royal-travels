## Summary

<!-- What changed and why. Link the issue if there is one: Closes #123 -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactor / chore
- [ ] Database change

## How it was verified

<!-- Paste the commands you ran and the result. Do not write "tested locally" only. -->

```text
.\mvnw.cmd -DskipTests clean package      -> BUILD SUCCESS
cd frontend; npx tsc --noEmit             -> no errors
npm run build                             -> 20 routes
node scripts/e2e-smoke.mjs                -> 43 passed, 0 failed
```

## Database / deployment notes

<!-- Delete if not applicable.
     - SQL applied? Which file? Before or after the code deploy?
     - Env var added or changed?
     - Is the change backwards compatible during rollout? -->

## Screenshots

<!-- For visible UI changes, before/after on desktop and mobile. Remove personal data. -->

## Checklist

- [ ] I read `CONTRIBUTING.md` and `docs/architecture.md`.
- [ ] The change is focused; unrelated edits are in a separate PR.
- [ ] Build gates pass.
- [ ] New behaviour has an E2E check, or I explained why not.
- [ ] Public routes were added to `SecurityConfig` explicitly.
- [ ] Database changes are idempotent SQL and `ddl-auto` is unchanged.
- [ ] `docs/api.md`, `docs/database.md`, or the README was updated where needed.
- [ ] `CHANGELOG.md` was updated for a user-visible change.
- [ ] No secrets, tokens, or real customer data are in the diff.
- [ ] I have the right to contribute this code under the MIT licence.
