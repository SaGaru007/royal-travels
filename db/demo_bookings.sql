-- Demo bookings so the admin dashboard and analytics have realistic data.
-- Safe to run repeatedly: each row is inserted only when its fixed UUID is
-- absent. Never run this against a database holding real customer bookings;
-- it is meant for demo/portfolio environments.

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '11111111-1111-4111-8111-111111111111', 'outstation', 'Demo Traveller (Weekend)',
       '+919800000001', 'demo.weekend@example.com', 'Koramangala, Bengaluru', 'Coorg, Madikeri',
       'round-trip', 'Custom Package', NULL, NULL, CURRENT_DATE + 14, '06:00:00',
       'SUV', '5', '10:00 - 12:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       3600.00, 9800.00, 2000.00, 'paid', 'confirmed', 'assigned', now() - interval '5 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '11111111-1111-4111-8111-111111111111');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '22222222-2222-4222-8222-222222222222', 'airport', 'Demo Traveller (Airport)',
       '+919800000002', 'demo.airport@example.com', 'HSR Layout, Bengaluru', 'Kempegowda Intl Airport',
       'one-way', NULL, 'Departure', '6E 2247', CURRENT_DATE + 4, '04:30:00',
       'Executive Sedan', '2', '18:00 - 20:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       950.00, 1450.00, 0, 'pending', 'new', 'assigned', now() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '22222222-2222-4222-8222-222222222222');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '33333333-3333-4333-8333-333333333333', 'local', 'Demo Traveller (City)',
       '+919800000003', 'demo.city@example.com', 'Bengaluru City Centre', 'Local Sightseeing',
       'full-day', '8 Hr / 80 Km', NULL, NULL, CURRENT_DATE + 7, '09:00:00',
       'Executive MPV (Innova)', '4', '09:00 - 11:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       2600.00, 2600.00, 500.00, 'pending', 'contacted', 'assigned', now() - interval '9 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '33333333-3333-4333-8333-333333333333');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '44444444-4444-4444-8444-444444444444', 'callback', 'Demo Traveller (Callback)',
       '+919800000004', 'demo.callback@example.com', 'Whitefield, Bengaluru', NULL,
       'one-way', NULL, NULL, NULL, CURRENT_DATE + 10, NULL,
       'Premium Luxury Sedan', '3', '14:00 - 16:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       NULL, NULL, NULL, 'pending', 'cancelled', 'assigned', now() - interval '12 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '44444444-4444-4444-8444-444444444444');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '55555555-5555-4555-8555-555555555555', 'airport', 'Demo Traveller (Arrival)',
       '+919800000005', 'demo.arrival@example.com', 'Kempegowda Intl Airport', 'Jayanagar, Bengaluru',
       'one-way', NULL, 'Arrival', 'AI 807', CURRENT_DATE - 5, '22:45:00',
       'Executive Sedan', '1', '20:00 - 22:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       1050.00, 1050.00, 1050.00, 'paid', 'completed', 'completed', now() - interval '8 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '55555555-5555-4555-8555-555555555555');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '66666666-6666-4666-8666-666666666666', 'outstation', 'Demo Traveller (Group)',
       '+919800000006', 'demo.group@example.com', 'Bengaluru', 'Hampi, Ballari',
       'one-way', 'Custom Package', NULL, NULL, CURRENT_DATE + 21, '05:30:00',
       'VIP Luxury Coach', '16', '08:00 - 10:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       12500.00, 26500.00, 5000.00, 'paid', 'confirmed', 'assigned', now() - interval '16 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '66666666-6666-4666-8666-666666666666');

INSERT INTO bookings (id, service_type, name, phone, email, pickup_location, drop_location,
                      trip_type, package, transfer_type, flight_number, pickup_date, pickup_time,
                      vehicle_preference, passengers, preferred_call_time, notes,
                      base_fare, total_fare, advance_amount, payment_status, status, trip_stage, created_at)
SELECT '77777777-7777-4777-8777-777777777777', 'local', 'Demo Traveller (Airport Pickup)',
       '+919800000007', 'demo.pickup@example.com', 'Indiranagar, Bengaluru', 'Phoenix Mall, Whitefield',
       'one-way', '4 Hr / 40 Km', NULL, NULL, CURRENT_DATE - 2, '17:30:00',
       'Executive MPV (Innova)', '2', '15:00 - 17:00', 'DEMO DATA - seeded by db/demo_bookings.sql',
       1800.00, 1800.00, 0, 'pending', 'completed', 'completed', now() - interval '20 days'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE id = '77777777-7777-4777-8777-777777777777');
