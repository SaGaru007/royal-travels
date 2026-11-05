-- Customer accounts (self-service signup for the public site).
-- Applied manually, like every other schema change in this project.
CREATE TABLE IF NOT EXISTS customers (
    id            uuid PRIMARY KEY,
    name          varchar(120) NOT NULL,
    email         varchar(160) NOT NULL,
    phone         varchar(20)  NOT NULL,
    password_hash varchar(100) NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now()
);

-- Email is stored lowercased by the application; the expression index keeps
-- that guarantee at the database level too.
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON customers (lower(email));

-- Used to match a customer's past guest bookings by phone number.
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
