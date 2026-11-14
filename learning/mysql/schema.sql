-- ============================================================
--  Royal Travels - MySQL practice database
--  MySQL 8.0+ required (CHECK constraints, JSON, window functions)
--
--  Load it with:
--    mysql -u root -p < learning/mysql/schema.sql
--  or inside the MySQL client:
--    SOURCE learning/mysql/schema.sql;
--
--  WARNING: this drops and recreates the `royal_travels` database.
--  Never run it on a server that holds data you care about.
-- ============================================================

DROP DATABASE IF EXISTS royal_travels;
CREATE DATABASE royal_travels
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE royal_travels;

-- ------------------------------------------------------------
-- customers: people who created an account on the website
-- ------------------------------------------------------------
CREATE TABLE customers (
    customer_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL,
    phone         VARCHAR(20)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_customers_email (email),
    KEY idx_customers_phone (phone)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- vehicles: the fleet
-- ------------------------------------------------------------
CREATE TABLE vehicles (
    vehicle_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(80)  NOT NULL,
    category        VARCHAR(40)  NOT NULL,
    plate_number    VARCHAR(20)  NOT NULL,
    capacity        TINYINT UNSIGNED NOT NULL,
    luggage_capacity VARCHAR(40),
    tariff_per_km   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tariff_local    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          ENUM('active','maintenance','retired') NOT NULL DEFAULT 'active',
    tags            JSON,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_vehicles_plate (plate_number),
    KEY idx_vehicles_status (status),
    CONSTRAINT chk_vehicles_capacity CHECK (capacity BETWEEN 1 AND 60)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- drivers: people who drive the fleet
-- ------------------------------------------------------------
CREATE TABLE drivers (
    driver_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(120) NOT NULL,
    phone          VARCHAR(20)  NOT NULL,
    license_number VARCHAR(30)  NOT NULL,
    rating         DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    status         ENUM('active','on_leave','inactive') NOT NULL DEFAULT 'active',
    joined_on      DATE NOT NULL,
    UNIQUE KEY uq_drivers_phone (phone),
    UNIQUE KEY uq_drivers_license (license_number),
    CONSTRAINT chk_drivers_rating CHECK (rating BETWEEN 1.0 AND 5.0)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- bookings: one row per trip request
-- customer_id is NULL for phone/callback leads that have no account.
-- vehicle_id / driver_id are NULL until the trip is assigned.
-- balance_due is a generated column: the database calculates it.
-- ------------------------------------------------------------
CREATE TABLE bookings (
    booking_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_ref     CHAR(36) NOT NULL,
    customer_id     INT UNSIGNED,
    vehicle_id      INT UNSIGNED,
    driver_id       INT UNSIGNED,
    service_type    ENUM('airport','outstation','local','callback') NOT NULL,
    contact_name    VARCHAR(120) NOT NULL,
    contact_phone   VARCHAR(20)  NOT NULL,
    pickup_location VARCHAR(160) NOT NULL,
    drop_location   VARCHAR(160),
    trip_type       ENUM('one-way','round-trip','full-day','multi-day'),
    pickup_at       DATETIME,
    passengers      TINYINT UNSIGNED NOT NULL,
    base_fare       DECIMAL(10,2),
    total_fare      DECIMAL(10,2),
    advance_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_due     DECIMAL(10,2)
                    GENERATED ALWAYS AS (total_fare - advance_amount) STORED,
    payment_status  ENUM('pending','partial','paid','refunded') NOT NULL DEFAULT 'pending',
    status          ENUM('new','contacted','confirmed','completed','cancelled')
                    NOT NULL DEFAULT 'new',
    trip_stage      ENUM('unassigned','assigned','en_route','arrived','in_progress','completed')
                    NOT NULL DEFAULT 'unassigned',
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bookings_ref (booking_ref),
    KEY idx_bookings_customer (customer_id),
    KEY idx_bookings_vehicle (vehicle_id),
    KEY idx_bookings_driver (driver_id),
    KEY idx_bookings_pickup (pickup_at),
    KEY idx_bookings_status_created (status, created_at),
    CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id)
        REFERENCES customers (customer_id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles (vehicle_id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_driver FOREIGN KEY (driver_id)
        REFERENCES drivers (driver_id) ON DELETE SET NULL,
    CONSTRAINT chk_bookings_passengers CHECK (passengers BETWEEN 1 AND 60),
    CONSTRAINT chk_bookings_money CHECK (total_fare IS NULL OR total_fare >= 0)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- payments: many payments can belong to one booking
-- ------------------------------------------------------------
CREATE TABLE payments (
    payment_id  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id  BIGINT UNSIGNED NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    method      ENUM('cash','upi','card','netbanking') NOT NULL,
    status      ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
    paid_at     DATETIME,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_payments_booking (booking_id),
    KEY idx_payments_paid_at (paid_at),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- booking_events: an audit trail of what happened to a booking
-- ------------------------------------------------------------
CREATE TABLE booking_events (
    event_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM('created','assigned','status_changed','payment','note') NOT NULL,
    notes      VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_events_booking (booking_id, created_at),
    CONSTRAINT fk_events_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO customers
    (customer_id, full_name, email, phone, password_hash, created_at)
VALUES
    (1, 'Aarav Sharma', 'aarav@example.com',  '+919800000001', 'hash-1', '2026-08-01 09:00:00'),
    (2, 'Diya Patel',   'diya@example.com',   '+919800000002', 'hash-2', '2026-08-03 11:30:00'),
    (3, 'Kabir Rao',    'kabir@example.com',  '+919800000003', 'hash-3', '2026-08-07 15:45:00'),
    (4, 'Meera Nair',   'meera@example.com',  '+919800000004', 'hash-4', '2026-08-12 08:20:00'),
    (5, 'Rohan Gupta',  'rohan@example.com',  '+919800000005', 'hash-5', '2026-08-18 19:10:00'),
    (6, 'Ananya Iyer',  'ananya@example.com', '+919800000006', 'hash-6', '2026-08-25 10:05:00'),
    (7, 'Vikram Singh', 'vikram@example.com', '+919800000007', 'hash-7', '2026-09-02 13:40:00'),
    (8, 'Sara Khan',    'sara@example.com',   '+919800000008', 'hash-8', '2026-09-09 17:15:00');

INSERT INTO vehicles
    (vehicle_id, name, category, plate_number, capacity, luggage_capacity,
     tariff_per_km, tariff_local, status, tags, created_at)
VALUES
    (1, 'Executive Sedan', 'Sedan', 'KA-01-MJ-4210', 4, '3 bags', 14.00, 1850.00, 'active',
     JSON_ARRAY('Dual-Zone AC', 'Bluetooth Audio', 'Reclining Seats'), '2026-07-01 10:00:00'),
    (2, 'Premium Luxury Sedan', 'Luxury Sedan', 'DL-01-EX-1008', 4, '3 premium bags', 38.00, 4500.00, 'active',
     JSON_ARRAY('Whisper Glass', 'Ventilated Seats', 'Rear Surround Sound'), '2026-07-01 10:05:00'),
    (3, 'Executive MPV (Innova)', 'MPV', 'KA-05-MJ-9921', 6, '4 large + 3 duffel', 19.00, 2600.00, 'active',
     JSON_ARRAY('Captain Seats', 'Rear AC', 'USB-C Charging'), '2026-07-01 10:10:00'),
    (4, 'Executive Luxury SUV', 'SUV', 'HR-26-DA-5510', 6, '4 bags', 26.00, 3600.00, 'active',
     JSON_ARRAY('4x4', 'High Ground Clearance', 'Leather Trim'), '2026-07-02 09:00:00'),
    (5, 'Luxury Executive Van', 'Van', 'KA-05-F-8890', 12, '10 bags', 35.00, 5200.00, 'active',
     JSON_ARRAY('Mood Lighting', 'Reading Lights', 'Walkthrough Cabin'), '2026-07-02 09:15:00'),
    (6, 'VIP Luxury Coach', 'Coach', 'MH-02-CC-9000', 18, '20+ bags', 48.00, 8500.00, 'maintenance',
     JSON_ARRAY('Air Suspension', 'Mic System', 'Panoramic Glass'), '2026-07-03 14:00:00');

INSERT INTO drivers
    (driver_id, full_name, phone, license_number, rating, status, joined_on)
VALUES
    (1, 'Ramesh Kumar', '+919900000001', 'KA01-2019-0001', 4.8, 'active',   '2019-04-15'),
    (2, 'Suresh Babu',  '+919900000002', 'KA01-2020-0002', 4.7, 'active',   '2020-06-01'),
    (3, 'Imran Ali',    '+919900000003', 'KA01-2018-0003', 4.9, 'active',   '2018-01-20'),
    (4, 'Prakash Naik', '+919900000004', 'KA01-2021-0004', 4.5, 'active',   '2021-09-10'),
    (5, 'Deepa Menon',  '+919900000005', 'KA01-2022-0005', 4.6, 'on_leave', '2022-03-05');

INSERT INTO bookings
    (booking_id, booking_ref, customer_id, vehicle_id, driver_id, service_type,
     contact_name, contact_phone, pickup_location, drop_location, trip_type,
     pickup_at, passengers, base_fare, total_fare, advance_amount,
     payment_status, status, trip_stage, notes, created_at)
VALUES
    (1,  'b0000000-0000-4000-8000-000000000001', 1, 1, 1, 'airport',
     'Aarav Sharma', '+919800000001', 'HSR Layout, Bengaluru', 'Kempegowda Airport', 'one-way',
     '2026-09-03 06:00:00', 2, 950.00, 1450.00, 1450.00,
     'paid', 'completed', 'completed', 'Early morning departure', '2026-09-01 09:10:00'),

    (2,  'b0000000-0000-4000-8000-000000000002', 2, 3, 2, 'outstation',
     'Diya Patel', '+919800000002', 'Koramangala, Bengaluru', 'Coorg, Madikeri', 'round-trip',
     '2026-09-12 05:30:00', 5, 3600.00, 9800.00, 2000.00,
     'partial', 'completed', 'completed', 'Weekend trip', '2026-09-05 16:20:00'),

    (3,  'b0000000-0000-4000-8000-000000000003', 3, 4, 3, 'local',
     'Kabir Rao', '+919800000003', 'Bengaluru City Centre', 'Local Sightseeing', 'full-day',
     '2026-09-20 09:00:00', 4, 2600.00, 2600.00, 500.00,
     'pending', 'completed', 'completed', '8 hr / 80 km package', '2026-09-18 12:00:00'),

    (4,  'b0000000-0000-4000-8000-000000000004', 4, 2, 1, 'airport',
     'Meera Nair', '+919800000004', 'Kempegowda Airport', 'Jayanagar, Bengaluru', 'one-way',
     '2026-10-02 22:45:00', 1, 1050.00, 1050.00, 1050.00,
     'paid', 'completed', 'completed', 'Late night arrival', '2026-09-28 10:30:00'),

    (5,  'b0000000-0000-4000-8000-000000000005', 5, 5, 4, 'outstation',
     'Rohan Gupta', '+919800000005', 'Bengaluru', 'Hampi, Ballari', 'one-way',
     '2026-10-08 05:30:00', 12, 12500.00, 26500.00, 5000.00,
     'partial', 'completed', 'completed', 'Group trip', '2026-10-01 18:00:00'),

    (6,  'b0000000-0000-4000-8000-000000000006', 6, 1, 2, 'local',
     'Ananya Iyer', '+919800000006', 'Indiranagar, Bengaluru', 'Phoenix Mall, Whitefield', 'one-way',
     '2026-10-15 17:30:00', 2, 1800.00, 1800.00, 0.00,
     'pending', 'cancelled', 'unassigned', 'Customer cancelled', '2026-10-10 09:00:00'),

    (7,  'b0000000-0000-4000-8000-000000000007', 7, 3, 3, 'airport',
     'Vikram Singh', '+919800000007', 'Whitefield, Bengaluru', 'Kempegowda Airport', 'one-way',
     '2026-10-22 04:30:00', 3, 950.00, 1450.00, 500.00,
     'paid', 'completed', 'completed', 'Flight 6E 2247', '2026-10-20 20:15:00'),

    (8,  'b0000000-0000-4000-8000-000000000008', 8, 4, 5, 'outstation',
     'Sara Khan', '+919800000008', 'Bengaluru', 'Mysuru', 'round-trip',
     '2026-10-28 07:00:00', 4, 4200.00, 8400.00, 2000.00,
     'partial', 'confirmed', 'assigned', 'Palace visit', '2026-10-25 11:45:00'),

    (9,  'b0000000-0000-4000-8000-000000000009', 1, 2, 1, 'airport',
     'Aarav Sharma', '+919800000001', 'Kempegowda Airport', 'Koramangala, Bengaluru', 'one-way',
     '2026-11-02 08:15:00', 2, 1050.00, 1050.00, 1050.00,
     'paid', 'completed', 'completed', 'Repeat customer', '2026-10-30 14:00:00'),

    (10, 'b0000000-0000-4000-8000-000000000010', 2, 5, 2, 'outstation',
     'Diya Patel', '+919800000002', 'Bengaluru', 'Ooty, Tamil Nadu', 'round-trip',
     '2026-11-05 06:00:00', 10, 7800.00, 15600.00, 4000.00,
     'partial', 'confirmed', 'assigned', 'Family holiday', '2026-11-01 08:30:00'),

    (11, 'b0000000-0000-4000-8000-000000000011', 3, NULL, NULL, 'callback',
     'Kabir Rao', '+919800000003', 'Whitefield, Bengaluru', NULL, 'one-way',
     '2026-11-07 14:00:00', 3, NULL, NULL, 0.00,
     'pending', 'contacted', 'unassigned', 'Wants a quote for airport transfer', '2026-11-06 10:20:00'),

    (12, 'b0000000-0000-4000-8000-000000000012', 4, 1, NULL, 'local',
     'Meera Nair', '+919800000004', 'Jayanagar, Bengaluru', 'MG Road, Bengaluru', 'one-way',
     '2026-11-08 10:00:00', 2, 800.00, 800.00, 0.00,
     'pending', 'new', 'unassigned', NULL, '2026-11-07 09:05:00'),

    (13, 'b0000000-0000-4000-8000-000000000013', 5, 3, 3, 'airport',
     'Rohan Gupta', '+919800000005', 'HSR Layout, Bengaluru', 'Kempegowda Airport', 'one-way',
     '2026-11-09 04:30:00', 4, 950.00, 1450.00, 500.00,
     'pending', 'confirmed', 'assigned', 'Need child seat', '2026-11-08 19:40:00'),

    (14, 'b0000000-0000-4000-8000-000000000014', 6, 4, 4, 'outstation',
     'Ananya Iyer', '+919800000006', 'Bengaluru', 'Chikmagalur', 'round-trip',
     '2026-11-12 05:00:00', 6, 5200.00, 10400.00, 3000.00,
     'partial', 'confirmed', 'assigned', 'Coffee estate visit', '2026-11-09 13:10:00'),

    (15, 'b0000000-0000-4000-8000-000000000015', 7, 1, 1, 'local',
     'Vikram Singh', '+919800000007', 'Koramangala, Bengaluru', 'Phoenix Mall, Whitefield', 'one-way',
     '2026-11-14 16:00:00', 2, 900.00, 900.00, 0.00,
     'pending', 'new', 'unassigned', NULL, '2026-11-10 11:25:00'),

    (16, 'b0000000-0000-4000-8000-000000000016', 8, 5, 2, 'outstation',
     'Sara Khan', '+919800000008', 'Bengaluru', 'Puducherry', 'one-way',
     '2026-11-18 05:30:00', 9, 9500.00, 9500.00, 2000.00,
     'pending', 'confirmed', 'assigned', 'One-way group transfer', '2026-11-10 16:50:00'),

    (17, 'b0000000-0000-4000-8000-000000000017', NULL, 3, 3, 'callback',
     'Walk-in Guest', '+919811111111', 'Electronic City, Bengaluru', NULL, 'one-way',
     '2026-11-20 11:00:00', 4, NULL, NULL, 0.00,
     'pending', 'contacted', 'unassigned', 'Phone enquiry, no account', '2026-11-11 08:40:00'),

    (18, 'b0000000-0000-4000-8000-000000000018', 1, 2, 1, 'airport',
     'Aarav Sharma', '+919800000001', 'Kempegowda Airport', 'Whitefield, Bengaluru', 'one-way',
     '2026-12-01 23:10:00', 2, 1050.00, 1050.00, 1050.00,
     'paid', 'confirmed', 'assigned', 'Late night pickup', '2026-11-05 10:00:00'),

    (19, 'b0000000-0000-4000-8000-000000000019', 2, 4, 5, 'outstation',
     'Diya Patel', '+919800000002', 'Bengaluru', 'Coorg, Madikeri', 'round-trip',
     '2026-12-05 06:00:00', 5, 3800.00, 7600.00, 2000.00,
     'partial', 'confirmed', 'assigned', 'Year-end trip', '2026-11-06 17:35:00'),

    (20, 'b0000000-0000-4000-8000-000000000020', 3, 6, NULL, 'outstation',
     'Kabir Rao', '+919800000003', 'Bengaluru', 'Tirupati', 'round-trip',
     '2026-12-10 04:00:00', 16, 14000.00, 28000.00, 5000.00,
     'pending', 'new', 'unassigned', 'Coach is in maintenance', '2026-11-08 09:15:00'),

    (21, 'b0000000-0000-4000-8000-000000000021', 4, 1, 2, 'local',
     'Meera Nair', '+919800000004', 'Bengaluru City Centre', 'Local Sightseeing', 'full-day',
     '2026-12-15 09:00:00', 4, 2600.00, 2600.00, 0.00,
     'pending', 'new', 'unassigned', '8 hr / 80 km package', '2026-11-09 14:45:00'),

    (22, 'b0000000-0000-4000-8000-000000000022', 5, 3, 4, 'airport',
     'Rohan Gupta', '+919800000005', 'Whitefield, Bengaluru', 'Kempegowda Airport', 'one-way',
     '2026-12-20 05:45:00', 3, 950.00, 1450.00, 500.00,
     'partial', 'confirmed', 'assigned', NULL, '2026-11-10 12:00:00'),

    (23, 'b0000000-0000-4000-8000-000000000023', 6, 2, 1, 'outstation',
     'Ananya Iyer', '+919800000006', 'Bengaluru', 'Goa', 'multi-day',
     '2026-12-24 06:00:00', 3, 15000.00, 32000.00, 8000.00,
     'pending', 'new', 'unassigned', '4-day trip', '2026-11-11 07:30:00'),

    (24, 'b0000000-0000-4000-8000-000000000024', 7, 6, 3, 'outstation',
     'Vikram Singh', '+919800000007', 'Bengaluru', 'Hampi, Ballari', 'round-trip',
     '2026-10-30 05:00:00', 14, 12000.00, 24000.00, 6000.00,
     'paid', 'completed', 'completed', 'College group', '2026-10-20 10:10:00');

INSERT INTO payments
    (payment_id, booking_id, amount, method, status, paid_at, created_at)
VALUES
    (1,  1,  1450.00, 'upi',        'success', '2026-09-01 09:30:00', '2026-09-01 09:30:00'),
    (2,  2,  2000.00, 'upi',        'success', '2026-09-05 16:45:00', '2026-09-05 16:45:00'),
    (3,  2,  7800.00, 'cash',       'success', '2026-09-13 20:00:00', '2026-09-13 20:00:00'),
    (4,  3,   500.00, 'card',       'success', '2026-09-18 12:15:00', '2026-09-18 12:15:00'),
    (5,  3,  2100.00, 'cash',       'pending', NULL,                  '2026-09-20 18:00:00'),
    (6,  4,  1050.00, 'card',       'success', '2026-09-28 10:45:00', '2026-09-28 10:45:00'),
    (7,  5,  5000.00, 'netbanking', 'success', '2026-10-01 18:30:00', '2026-10-01 18:30:00'),
    (8,  5, 21500.00, 'upi',        'pending', NULL,                  '2026-10-08 19:00:00'),
    (9,  7,   500.00, 'upi',        'success', '2026-10-20 20:30:00', '2026-10-20 20:30:00'),
    (10, 7,   950.00, 'cash',       'success', '2026-10-22 06:00:00', '2026-10-22 06:00:00'),
    (11, 8,  2000.00, 'upi',        'success', '2026-10-25 12:00:00', '2026-10-25 12:00:00'),
    (12, 9,  1050.00, 'card',       'success', '2026-10-30 14:20:00', '2026-10-30 14:20:00'),
    (13, 10, 4000.00, 'netbanking', 'success', '2026-11-01 09:00:00', '2026-11-01 09:00:00'),
    (14, 13,  500.00, 'upi',        'success', '2026-11-08 20:00:00', '2026-11-08 20:00:00'),
    (15, 14, 3000.00, 'card',       'success', '2026-11-09 13:40:00', '2026-11-09 13:40:00'),
    (16, 16, 2000.00, 'upi',        'success', '2026-11-10 17:10:00', '2026-11-10 17:10:00'),
    (17, 18, 1050.00, 'card',       'success', '2026-11-05 10:20:00', '2026-11-05 10:20:00'),
    (18, 19, 2000.00, 'upi',        'success', '2026-11-06 18:00:00', '2026-11-06 18:00:00'),
    (19, 20, 5000.00, 'netbanking', 'success', '2026-11-08 09:45:00', '2026-11-08 09:45:00'),
    (20, 22,  500.00, 'upi',        'success', '2026-11-10 12:30:00', '2026-11-10 12:30:00'),
    (21, 23, 8000.00, 'card',       'success', '2026-11-11 08:00:00', '2026-11-11 08:00:00'),
    (22, 24, 6000.00, 'upi',        'success', '2026-10-20 10:40:00', '2026-10-20 10:40:00'),
    (23, 24, 18000.00,'netbanking', 'success', '2026-10-30 21:00:00', '2026-10-30 21:00:00');

INSERT INTO booking_events
    (event_id, booking_id, event_type, notes, created_at)
VALUES
    (1,  1,  'created',        'Booking created online',            '2026-09-01 09:10:00'),
    (2,  1,  'assigned',       'Ramesh Kumar assigned',             '2026-09-01 10:00:00'),
    (3,  1,  'payment',        'Full payment received',             '2026-09-01 09:30:00'),
    (4,  1,  'status_changed', 'Trip completed',                    '2026-09-03 08:30:00'),
    (5,  2,  'created',        'Booking created online',            '2026-09-05 16:20:00'),
    (6,  2,  'payment',        'Advance received',                  '2026-09-05 16:45:00'),
    (7,  2,  'assigned',       'Suresh Babu assigned',              '2026-09-06 09:00:00'),
    (8,  2,  'payment',        'Balance paid in cash',              '2026-09-13 20:00:00'),
    (9,  3,  'created',        'Booking created online',            '2026-09-18 12:00:00'),
    (10, 3,  'payment',        'Advance received',                  '2026-09-18 12:15:00'),
    (11, 3,  'note',           'Customer asked for Kannada driver','2026-09-19 08:00:00'),
    (12, 6,  'created',        'Booking created online',            '2026-10-10 09:00:00'),
    (13, 6,  'status_changed', 'Cancelled by customer',             '2026-10-12 10:30:00'),
    (14, 8,  'created',        'Booking created online',            '2026-10-25 11:45:00'),
    (15, 8,  'payment',        'Advance received',                  '2026-10-25 12:00:00'),
    (16, 8,  'assigned',       'Deepa Menon assigned',              '2026-10-26 09:15:00'),
    (17, 13, 'created',        'Booking created online',            '2026-11-08 19:40:00'),
    (18, 13, 'payment',        'Advance received',                  '2026-11-08 20:00:00'),
    (19, 17, 'created',        'Phone enquiry logged by staff',     '2026-11-11 08:40:00'),
    (20, 23, 'created',        'Booking created online',            '2026-11-11 07:30:00'),
    (21, 23, 'payment',        'Advance received',                  '2026-11-11 08:00:00'),
    (22, 24, 'created',        'Booking created online',            '2026-10-20 10:10:00'),
    (23, 24, 'payment',        'Advance received',                  '2026-10-20 10:40:00'),
    (24, 24, 'payment',        'Balance paid',                       '2026-10-30 21:00:00');

-- ============================================================
-- Sanity checks: these should return 8, 6, 5, 24, 23, 24
-- ============================================================
SELECT 'customers' AS table_name, COUNT(*) AS rows_loaded FROM customers
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'booking_events', COUNT(*) FROM booking_events;
