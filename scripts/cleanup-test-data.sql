-- Remove rows created by scripts/e2e-smoke.mjs.
--
-- Scoped to the test phone numbers and email used by the suite. It does not
-- touch real customer bookings. Safe to run repeatedly.
--
--   psql "$DB_URL" -f scripts/cleanup-test-data.sql
--
-- The API cannot delete bookings, so this is the only cleanup path.

BEGIN;

-- Current suite: +919999000111
-- Older runs also used +919999000222 and +919999000333.
DELETE FROM bookings
WHERE phone IN ('+919999000111', '+919999000222', '+919999000333');

-- The driver is normally deleted by the suite itself; this covers a failed run.
DELETE FROM drivers
WHERE phone = '+919999000444';

-- Reused across runs; safe to remove.
DELETE FROM customers
WHERE email = 'e2e.customer@example.com';

COMMIT;

-- Verify:
--   SELECT count(*) FROM bookings
--   WHERE phone IN ('+919999000111', '+919999000222', '+919999000333');
--   SELECT count(*) FROM drivers WHERE phone = '+919999000444';
--   SELECT count(*) FROM customers WHERE email = 'e2e.customer@example.com';
