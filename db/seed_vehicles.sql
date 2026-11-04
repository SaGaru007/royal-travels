-- Seed the public fleet. Safe to run repeatedly: each row is inserted only
-- when its plate number is not already present.
INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'Executive Sedan', 'Sedan', 'KA-01-MJ-4210', 4, '3 bags', 14.00, 1850.00,
       'https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1000&auto=format&fit=crop',
       ARRAY['Dual-Zone AC', 'Hi-Fi Bluetooth Audio', 'Ergonomic Recline'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'KA-01-MJ-4210');

INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'Premium Luxury Sedan', 'Luxury Sedan', 'DL-01-EX-1008', 4, '3 premium bags', 38.00, 4500.00,
       'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000&auto=format&fit=crop',
       ARRAY['Acoustic Whisper Glass', 'Ventilated Leather Seats', 'Rear Surround Sound'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'DL-01-EX-1008');

INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'Executive MPV (Innova)', 'MPV', 'KA-05-MJ-9921', 6, '4 large + 3 duffel', 19.00, 2600.00,
       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop',
       ARRAY['Captain Recliner Seats', 'Dedicated Rear AC', 'USB-C Charging'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'KA-05-MJ-9921');

INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'Executive Luxury SUV', 'SUV', 'HR-26-DA-5510', 6, '4 bags', 26.00, 3600.00,
       'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=1000&auto=format&fit=crop',
       ARRAY['4x4 Hill Station Ready', 'High Ground Clearance', 'Premium Leather Trim'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'HR-26-DA-5510');

INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'Luxury Executive Van', 'Van', 'KA-05-F-8890', 12, '10 bags', 35.00, 5200.00,
       'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop',
       ARRAY['Ambient Mood Lighting', 'Individual Reading Lights', 'High-Ceiling Walkthrough'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'KA-05-F-8890');

INSERT INTO vehicles (name, category, plate_number, capacity, luggage_capacity, tariff_per_km, tariff_local, image_url, tags, status)
SELECT 'VIP Luxury Coach', 'Coach', 'MH-02-CC-9000', 18, '20+ bags', 48.00, 8500.00,
       'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop',
       ARRAY['Air Suspension Glide', 'Mic & Hi-Fi System', 'Panoramic View Glass'], 'active'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'MH-02-CC-9000');
