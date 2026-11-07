-- Live driver location for customer tracking.
--
-- The application runs with ddl-auto=validate and has no migration tool, so
-- this file must be applied by hand BEFORE deploying a backend that maps
-- these columns.
--
--   psql "$DB_URL" -f db/live_tracking.sql
--
-- `bookings.current_lat` and `current_lng` already existed, reserved for live
-- GPS, but as `numeric`. Hibernate maps a Java `Double` to `double precision`
-- and validation rejects the mismatch, so they are converted here. They were
-- never written by any code path, so no data is affected.
--
-- Safe to run more than once.

alter table bookings
    alter column current_lat type double precision using current_lat::double precision;

alter table bookings
    alter column current_lng type double precision using current_lng::double precision;

alter table bookings add column if not exists current_location_at timestamptz;

comment on column bookings.current_lat is
    'Last latitude the assigned driver shared, in decimal degrees (WGS84). Null when never shared.';
comment on column bookings.current_lng is
    'Last longitude the assigned driver shared, in decimal degrees (WGS84). Null when never shared.';
comment on column bookings.current_location_at is
    'When current_lat/current_lng were last updated. Clients treat older than 2 minutes as stale.';

-- Tracking reads a single booking by primary key, so the existing PK is the
-- only index needed.
