-- Performance indexes for the query patterns the API actually runs.
-- Safe to run repeatedly (IF NOT EXISTS) and safe to run on a live database
-- (CREATE INDEX ... takes a brief lock only; use CONCURRENTLY for a busy table).

-- Requires the pg_trgm extension (available on Supabase): enables GIN indexes
-- that serve LIKE '%text%' searches, which plain B-tree indexes cannot.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Admin list default sort (created_at DESC) and status filter + sort.
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_created_at_idx ON bookings (status, created_at DESC);

-- Admin search matches lower(name)/phone/email with leading wildcards.
-- Trigram GIN indexes make those sargable.
CREATE INDEX IF NOT EXISTS bookings_name_trgm_idx ON bookings USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS bookings_phone_trgm_idx ON bookings USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS bookings_email_trgm_idx ON bookings USING gin (lower(coalesce(email, '')) gin_trgm_ops);

-- Fleet queries filter by status.
CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles (status);
