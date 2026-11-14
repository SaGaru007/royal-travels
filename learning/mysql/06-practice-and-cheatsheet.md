# Module 6 — Practice, Cheat Sheet, and Interview Prep

**Goal:** turn knowledge into reflexes. Do the exercises with the schema loaded,
then check the answers. Struggle first; the struggle is the learning.

```sql
USE royal_travels;
```

---

## How to practise

- Set a 20-minute timer. Attempt 5 exercises without looking anything up.
- Write your query in a `.sql` file. Keep it; compare later.
- If stuck for more than 3 minutes, write down the question you are asking
  ("How do I count only successful payments?") and look up that concept.
- After checking, **re-type** the correct answer from memory. Do not just read it.
- Reset the data any time with `SOURCE schema.sql`.

---

# Part A — 40 exercises

## Level 1: filtering and projection

1. List all active vehicles, largest capacity first, then by name.
2. List bookings with a pickup in November 2026 that are not cancelled, newest
   pickup first.
3. Find customers whose name starts with `A` or `S`.
4. Find callback bookings that have no fare yet (`total_fare IS NULL`).
5. Find bookings with no drop location.
6. Show `booking_id`, `contact_name`, and the last 10 digits of the phone for
   the first 10 bookings.
7. Show completed bookings with a fare between ₹1,000 and ₹5,000, cheapest first.
8. List the distinct service types that appear among confirmed bookings.
9. Show the five most expensive bookings (ignore rows with no fare).
10. Show each booking's `booking_id`, `created_at`, `pickup_at`, and the number
    of days between creation and pickup. Call it `lead_days`.

## Level 2: aggregation

11. Count bookings by status, most common first.
12. For completed bookings, show revenue and average fare per service type.
13. Show successful payment totals grouped by payment method.
14. Show each driver's name and number of assigned bookings, including drivers
    with zero. Sort by trips descending.
15. Show driver count and average rating per driver status.
16. Show vehicle count and average per-km/local tariff per category.
17. Find customers with more than two bookings.
18. Show monthly booking count and total fare for non-cancelled bookings in
    September–December 2026.
19. Show payment count and total amount for every `(status, method)` combination.
20. Find service types with at least two completed bookings **and** more than
    ₹5,000 in completed revenue.

## Level 3: joins and subqueries

21. List every booking with the account customer name, vehicle name, and driver
    name. Keep bookings where any of those is missing.
22. Count bookings per vehicle, including vehicles with zero bookings.
23. Find drivers with no completed trips.
24. Find customers who have never made an outstation booking.
25. For every booking, show the total successful payments and the outstanding
    amount (`total_fare - paid`). Handle missing payments.
26. Show each customer's latest booking (by `created_at`).
27. Find customers who have at least one cancelled booking.
28. Show completed trips and revenue by vehicle category.
29. Show each driver's name and the number of distinct customers they served.
30. Find bookings that have no payment rows at all.

## Level 4: CTEs and window functions

31. Rank drivers by completed trips. Use `RANK()` and show the rank.
32. Show the top two most expensive bookings per customer.
33. Show monthly completed revenue with the previous month and percentage
    growth.
34. Show completed revenue by pickup date with a running total.
35. Build a month × service-type grid for September–December 2026, showing zero
    for missing combinations.
36. Show each customer's first and latest booking ID using window functions.
37. Show each completed booking with a 3-booking moving average fare.
38. Split customers into quartiles by lifetime completed value and show the top
    quartile.

## Level 5: design, performance, transactions

39. A report filters `bookings` by `contact_name` and sorts by `created_at`.
    Create a composite index for it, run `EXPLAIN`, then drop the index.
40. In one transaction, assign driver 1 to booking 12 and write an `assigned`
    event. Verify the rows, then roll back (practice mode). Explain what you
    would change for production.

## Extra capstone tasks

41. Explain why this query overcounts revenue, then rewrite it:
    ```sql
    SELECT SUM(b.total_fare)
    FROM bookings b
    JOIN payments p ON p.booking_id = b.booking_id;
    ```
42. Create a `vehicle_slots` table that makes double-booking impossible at the
    database level, and claim a slot atomically.
43. Add a `booking_addons` table (booking_id, addon_name, price) and write a
    report of the top 5 addons by revenue.
44. Create a view `v_booking_summary` that exposes booking, customer, vehicle,
    driver, paid, and outstanding.
45. Write a stored procedure `cancel_booking(p_booking_id)` that sets the status
    to `cancelled`, clears the driver/vehicle assignment, logs an event, and
    refuses to cancel an already completed trip.

---

# Part B — Answers

Try first. Answers are intentionally compact; add your own comments.

<details>
<summary>Level 1 answers (1–10)</summary>

```sql
-- 1
SELECT vehicle_id, name, category, capacity
FROM vehicles
WHERE status = 'active'
ORDER BY capacity DESC, name;

-- 2
SELECT booking_id, contact_name, pickup_at, status
FROM bookings
WHERE pickup_at >= '2026-11-01'
  AND pickup_at <  '2026-12-01'
  AND status <> 'cancelled'
ORDER BY pickup_at DESC;

-- 3
SELECT customer_id, full_name, email
FROM customers
WHERE full_name LIKE 'A%' OR full_name LIKE 'S%'
ORDER BY full_name;

-- 4
SELECT booking_id, contact_name, service_type, total_fare
FROM bookings
WHERE service_type = 'callback'
  AND total_fare IS NULL;

-- 5
SELECT booking_id, pickup_location, drop_location
FROM bookings
WHERE drop_location IS NULL;

-- 6
SELECT booking_id, contact_name, RIGHT(contact_phone, 10) AS phone_last10
FROM bookings
ORDER BY booking_id
LIMIT 10;

-- 7
SELECT booking_id, total_fare
FROM bookings
WHERE status = 'completed'
  AND total_fare BETWEEN 1000 AND 5000
ORDER BY total_fare;

-- 8
SELECT DISTINCT service_type
FROM bookings
WHERE status = 'confirmed'
ORDER BY service_type;

-- 9
SELECT booking_id, booking_ref, contact_name, total_fare
FROM bookings
WHERE total_fare IS NOT NULL
ORDER BY total_fare DESC, booking_id
LIMIT 5;

-- 10
SELECT
    booking_id,
    created_at,
    pickup_at,
    DATEDIFF(pickup_at, created_at) AS lead_days
FROM bookings
WHERE pickup_at IS NOT NULL
ORDER BY booking_id;
```

</details>

<details>
<summary>Level 2 answers (11–20)</summary>

```sql
-- 11
SELECT status, COUNT(*) AS bookings
FROM bookings
GROUP BY status
ORDER BY bookings DESC, status;

-- 12
SELECT
    service_type,
    COUNT(*)                    AS bookings,
    SUM(total_fare)             AS revenue,
    ROUND(AVG(total_fare), 2)   AS avg_fare
FROM bookings
WHERE status = 'completed'
GROUP BY service_type
ORDER BY revenue DESC;

-- 13
SELECT method, COUNT(*) AS payments, SUM(amount) AS total
FROM payments
WHERE status = 'success'
GROUP BY method
ORDER BY total DESC;

-- 14
SELECT d.driver_id, d.full_name, COUNT(b.booking_id) AS trips
FROM drivers d
LEFT JOIN bookings b ON b.driver_id = d.driver_id
GROUP BY d.driver_id, d.full_name
ORDER BY trips DESC, d.full_name;

-- 15
SELECT status, COUNT(*) AS drivers, ROUND(AVG(rating), 2) AS avg_rating
FROM drivers
GROUP BY status;

-- 16
SELECT
    category,
    COUNT(*)                       AS vehicles,
    ROUND(AVG(tariff_per_km), 2)   AS avg_per_km,
    ROUND(AVG(tariff_local), 2)    AS avg_local
FROM vehicles
GROUP BY category
ORDER BY vehicles DESC, category;

-- 17
SELECT c.customer_id, c.full_name, COUNT(b.booking_id) AS bookings
FROM customers c
JOIN bookings b ON b.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
HAVING COUNT(*) > 2
ORDER BY bookings DESC;

-- 18
SELECT
    DATE_FORMAT(pickup_at, '%Y-%m') AS trip_month,
    COUNT(*)                        AS bookings,
    SUM(total_fare)                 AS revenue
FROM bookings
WHERE status <> 'cancelled'
  AND pickup_at >= '2026-09-01'
  AND pickup_at <  '2027-01-01'
GROUP BY trip_month
ORDER BY trip_month;

-- 19
SELECT status, method, COUNT(*) AS payments, SUM(amount) AS total
FROM payments
GROUP BY status, method
ORDER BY status, method;

-- 20
SELECT service_type, COUNT(*) AS bookings, SUM(total_fare) AS revenue
FROM bookings
WHERE status = 'completed'
GROUP BY service_type
HAVING COUNT(*) >= 2
   AND SUM(total_fare) > 5000
ORDER BY revenue DESC;
```

</details>

<details>
<summary>Level 3 answers (21–30)</summary>

```sql
-- 21
SELECT
    b.booking_id,
    b.contact_name,
    c.full_name AS account_name,
    v.name      AS vehicle,
    d.full_name AS driver,
    b.status
FROM bookings b
LEFT JOIN customers c ON c.customer_id = b.customer_id
LEFT JOIN vehicles  v ON v.vehicle_id  = b.vehicle_id
LEFT JOIN drivers   d ON d.driver_id   = b.driver_id
ORDER BY b.booking_id;

-- 22
SELECT v.vehicle_id, v.name, COUNT(b.booking_id) AS trips
FROM vehicles v
LEFT JOIN bookings b ON b.vehicle_id = v.vehicle_id
GROUP BY v.vehicle_id, v.name
ORDER BY trips DESC, v.name;

-- 23
SELECT d.driver_id, d.full_name
FROM drivers d
LEFT JOIN bookings b
       ON b.driver_id = d.driver_id
      AND b.status = 'completed'
WHERE b.booking_id IS NULL
ORDER BY d.driver_id;

-- 24
SELECT c.customer_id, c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.customer_id = c.customer_id
      AND b.service_type = 'outstation'
)
ORDER BY c.customer_id;

-- 25
SELECT
    b.booking_id,
    b.total_fare,
    COALESCE(p.paid, 0)                          AS paid,
    COALESCE(b.total_fare, 0) - COALESCE(p.paid, 0) AS outstanding
FROM bookings b
LEFT JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments
    WHERE status = 'success'
    GROUP BY booking_id
) p ON p.booking_id = b.booking_id
ORDER BY b.booking_id;

-- 26
SELECT b.customer_id, b.booking_id, b.service_type, b.created_at
FROM bookings b
WHERE b.customer_id IS NOT NULL
  AND b.booking_id = (
      SELECT b2.booking_id
      FROM bookings b2
      WHERE b2.customer_id = b.customer_id
      ORDER BY b2.created_at DESC, b2.booking_id DESC
      LIMIT 1
  )
ORDER BY b.customer_id;

-- 27
SELECT c.customer_id, c.full_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.customer_id = c.customer_id
      AND b.status = 'cancelled'
)
ORDER BY c.customer_id;

-- 28
SELECT v.category, COUNT(*) AS trips, SUM(b.total_fare) AS revenue
FROM bookings b
JOIN vehicles v ON v.vehicle_id = b.vehicle_id
WHERE b.status = 'completed'
GROUP BY v.category
ORDER BY revenue DESC;

-- 29
SELECT
    d.driver_id,
    d.full_name,
    COUNT(DISTINCT b.customer_id) AS customers
FROM drivers d
LEFT JOIN bookings b ON b.driver_id = d.driver_id
GROUP BY d.driver_id, d.full_name
ORDER BY customers DESC, d.driver_id;

-- 30
SELECT b.booking_id, b.contact_name, b.total_fare
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.booking_id
WHERE p.payment_id IS NULL
ORDER BY b.booking_id;
```

</details>

<details>
<summary>Level 4 answers (31–38)</summary>

```sql
-- 31
SELECT
    d.driver_id,
    d.full_name,
    COUNT(b.booking_id) AS completed_trips,
    RANK() OVER (ORDER BY COUNT(b.booking_id) DESC) AS trip_rank
FROM drivers d
LEFT JOIN bookings b
       ON b.driver_id = d.driver_id
      AND b.status = 'completed'
GROUP BY d.driver_id, d.full_name
ORDER BY trip_rank, d.driver_id;

-- 32
WITH ranked AS (
    SELECT
        b.customer_id,
        b.booking_id,
        b.total_fare,
        ROW_NUMBER() OVER (
            PARTITION BY b.customer_id
            ORDER BY b.total_fare DESC, b.booking_id
        ) AS rn
    FROM bookings b
    WHERE b.customer_id IS NOT NULL
      AND b.total_fare IS NOT NULL
)
SELECT customer_id, booking_id, total_fare
FROM ranked
WHERE rn <= 2
ORDER BY customer_id, rn;

-- 33
WITH monthly AS (
    SELECT
        DATE_FORMAT(pickup_at, '%Y-%m') AS trip_month,
        SUM(total_fare)                 AS revenue
    FROM bookings
    WHERE status = 'completed'
      AND pickup_at IS NOT NULL
    GROUP BY trip_month
)
SELECT
    trip_month,
    revenue,
    LAG(revenue) OVER (ORDER BY trip_month) AS prev_revenue,
    ROUND(
        100 * (revenue - LAG(revenue) OVER (ORDER BY trip_month))
        / NULLIF(LAG(revenue) OVER (ORDER BY trip_month), 0),
        1
    ) AS pct_growth
FROM monthly
ORDER BY trip_month;

-- 34
SELECT
    DATE(pickup_at) AS trip_date,
    COUNT(*)        AS trips,
    SUM(total_fare) AS revenue,
    SUM(SUM(total_fare)) OVER (
        ORDER BY DATE(pickup_at)
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_revenue
FROM bookings
WHERE status = 'completed'
  AND pickup_at IS NOT NULL
GROUP BY DATE(pickup_at)
ORDER BY trip_date;

-- 35
WITH RECURSIVE months AS (
    SELECT DATE('2026-09-01') AS month_start
    UNION ALL
    SELECT DATE_ADD(month_start, INTERVAL 1 MONTH)
    FROM months
    WHERE month_start < '2026-12-01'
),
services AS (
    SELECT DISTINCT service_type FROM bookings
)
SELECT
    DATE_FORMAT(m.month_start, '%Y-%m') AS trip_month,
    s.service_type,
    COUNT(b.booking_id)                 AS bookings
FROM months m
CROSS JOIN services s
LEFT JOIN bookings b
       ON b.pickup_at >= m.month_start
      AND b.pickup_at <  DATE_ADD(m.month_start, INTERVAL 1 MONTH)
      AND b.service_type = s.service_type
GROUP BY m.month_start, s.service_type
ORDER BY m.month_start, s.service_type;

-- 36
WITH ranked AS (
    SELECT
        customer_id,
        booking_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY pickup_at, booking_id
        ) AS first_rn,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY pickup_at DESC, booking_id DESC
        ) AS last_rn
    FROM bookings
    WHERE customer_id IS NOT NULL
      AND pickup_at IS NOT NULL
)
SELECT
    customer_id,
    MAX(CASE WHEN first_rn = 1 THEN booking_id END) AS first_booking,
    MAX(CASE WHEN last_rn  = 1 THEN booking_id END) AS latest_booking
FROM ranked
GROUP BY customer_id
ORDER BY customer_id;

-- 37
SELECT
    booking_id,
    pickup_at,
    total_fare,
    ROUND(
        AVG(total_fare) OVER (
            ORDER BY pickup_at
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    ) AS moving_avg_3
FROM bookings
WHERE status = 'completed'
  AND total_fare IS NOT NULL
  AND pickup_at IS NOT NULL
ORDER BY pickup_at, booking_id;

-- 38
WITH ltv AS (
    SELECT
        c.customer_id,
        c.full_name,
        COALESCE(SUM(b.total_fare), 0) AS lifetime_value
    FROM customers c
    LEFT JOIN bookings b
           ON b.customer_id = c.customer_id
          AND b.status = 'completed'
    GROUP BY c.customer_id, c.full_name
),
bucketed AS (
    SELECT
        *,
        NTILE(4) OVER (ORDER BY lifetime_value DESC) AS quartile
    FROM ltv
)
SELECT customer_id, full_name, lifetime_value, quartile
FROM bucketed
WHERE quartile = 1
ORDER BY lifetime_value DESC;
```

</details>

<details>
<summary>Level 5 answers (39–40)</summary>

```sql
-- 39
CREATE INDEX idx_bookings_name_created
ON bookings (contact_name, created_at);

EXPLAIN
SELECT booking_id, contact_name, created_at
FROM bookings
WHERE contact_name = 'Aarav Sharma'
ORDER BY created_at DESC
LIMIT 5;
-- type=ref, key=idx_bookings_name_created, Extra: Backward index scan; Using index

DROP INDEX idx_bookings_name_created ON bookings;
```

```sql
-- 40
START TRANSACTION;

UPDATE bookings
SET driver_id = 1,
    trip_stage = 'assigned'
WHERE booking_id = 12
  AND status <> 'cancelled';

INSERT INTO booking_events (booking_id, event_type, notes)
VALUES (12, 'assigned', 'Driver 1 assigned (practice)');

SELECT booking_id, driver_id, trip_stage
FROM bookings
WHERE booking_id = 12;

SELECT event_id, event_type, notes
FROM booking_events
WHERE booking_id = 12
ORDER BY event_id DESC
LIMIT 1;

ROLLBACK;   -- practice only
```

Production version:

- `COMMIT` instead of `ROLLBACK`.
- Check `ROW_COUNT()` after the `UPDATE`; if 0, the booking was missing or
  cancelled — abort with an error.
- Use a stored procedure or a transaction in the application, and retry on
  deadlock (1213).
- Lock the row (`SELECT ... FOR UPDATE`) if you need to validate conditions
  that cannot be expressed in the `UPDATE` predicate.
- Write the event in the same transaction so the audit trail cannot disagree
  with the booking.

</details>

<details>
<summary>Capstone answers (41–45)</summary>

```sql
-- 41: the join produces one row per payment, so the booking fare repeats.
-- Correct: aggregate at the booking grain first (or don't join at all).
SELECT SUM(b.total_fare) AS revenue
FROM bookings b
WHERE b.status = 'completed';

-- If you need payment info, aggregate the many side first:
SELECT SUM(b.total_fare) AS revenue
FROM bookings b
JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments
    GROUP BY booking_id
) p ON p.booking_id = b.booking_id;
```

```sql
-- 42
CREATE TABLE vehicle_slots (
    vehicle_id INT UNSIGNED NOT NULL,
    slot_start DATETIME NOT NULL,
    booking_id BIGINT UNSIGNED NULL,
    PRIMARY KEY (vehicle_id, slot_start),
    CONSTRAINT fk_slots_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles (vehicle_id)
) ENGINE = InnoDB;

INSERT INTO vehicle_slots (vehicle_id, slot_start, booking_id)
VALUES (3, '2026-12-01 06:00:00', NULL);

-- Atomic claim: 1 row = won, 0 rows = already taken
UPDATE vehicle_slots
SET booking_id = 18
WHERE vehicle_id = 3
  AND slot_start = '2026-12-01 06:00:00'
  AND booking_id IS NULL;

SELECT ROW_COUNT() AS claimed;
```

```sql
-- 43
CREATE TABLE booking_addons (
    booking_id BIGINT UNSIGNED NOT NULL,
    addon_name VARCHAR(60) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (booking_id, addon_name),
    CONSTRAINT fk_addons_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT chk_addons_price CHECK (price >= 0)
) ENGINE = InnoDB;

INSERT INTO booking_addons (booking_id, addon_name, price)
VALUES (1, 'Child seat', 300.00),
       (1, 'Water bottles', 100.00),
       (2, 'Child seat', 300.00),
       (5, 'Extra luggage', 800.00);

SELECT addon_name, COUNT(*) AS times_sold, SUM(price) AS revenue
FROM booking_addons
GROUP BY addon_name
ORDER BY revenue DESC
LIMIT 5;
```

```sql
-- 44
CREATE OR REPLACE VIEW v_booking_summary AS
SELECT
    b.booking_id,
    b.booking_ref,
    b.contact_name,
    c.full_name                         AS account_name,
    v.name                              AS vehicle,
    d.full_name                         AS driver,
    b.service_type,
    b.status,
    b.total_fare,
    COALESCE(p.paid, 0)                 AS paid,
    b.total_fare - COALESCE(p.paid, 0)  AS outstanding
FROM bookings b
LEFT JOIN customers c ON c.customer_id = b.customer_id
LEFT JOIN vehicles  v ON v.vehicle_id  = b.vehicle_id
LEFT JOIN drivers   d ON d.driver_id   = b.driver_id
LEFT JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments
    WHERE status = 'success'
    GROUP BY booking_id
) p ON p.booking_id = b.booking_id;
```

```sql
-- 45
DELIMITER //

CREATE PROCEDURE cancel_booking (IN p_booking_id BIGINT UNSIGNED)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_status
    FROM bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking not found';
    ELSEIF v_status = 'completed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot cancel a completed trip';
    ELSE
        UPDATE bookings
        SET status = 'cancelled',
            trip_stage = 'unassigned',
            driver_id = NULL,
            vehicle_id = NULL
        WHERE booking_id = p_booking_id;

        INSERT INTO booking_events (booking_id, event_type, notes)
        VALUES (p_booking_id, 'status_changed', 'Booking cancelled');
    END IF;

    COMMIT;
END //

DELIMITER ;

CALL cancel_booking(12);
```

</details>

---

# Part C — Cheat sheet

## Connect and explore

```sql
mysql -u rt_student -p royal_travels
SOURCE path/to/file.sql;

SHOW DATABASES;
SHOW TABLES;
DESCRIBE bookings;
SHOW CREATE TABLE bookings\G
SHOW INDEX FROM bookings;
SELECT VERSION(), DATABASE(), USER(), NOW();
SHOW VARIABLES LIKE 'sql_mode';
SHOW FULL PROCESSLIST;
```

## Query skeleton

```sql
SELECT   columns / aggregates / window functions
FROM     table
JOIN     other ON ...
WHERE    row conditions
GROUP BY columns
HAVING   group conditions
ORDER BY columns
LIMIT    n OFFSET m;
```

Logical order: `FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`.

## Joins

```sql
-- inner
FROM a JOIN b ON b.a_id = a.id

-- keep all a
FROM a LEFT JOIN b ON b.a_id = a.id

-- keep all b
FROM a RIGHT JOIN b ON b.a_id = a.id

-- all combinations
FROM a CROSS JOIN b

-- rows with no match
FROM a LEFT JOIN b ON b.a_id = a.id
WHERE b.id IS NULL

-- has any match
WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)

-- top N per group
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC) rn
  FROM t
)
SELECT * FROM r WHERE rn <= 3;
```

## Aggregation

```sql
COUNT(*)                  -- rows
COUNT(col)                -- non-NULL values
COUNT(DISTINCT col)       -- distinct non-NULL values
SUM(col)                  -- NULL if no rows
COALESCE(SUM(col), 0)     -- zero if no rows
AVG(col)                  -- ignores NULL
GROUP_CONCAT(col ORDER BY col SEPARATOR ', ')
GROUP BY col WITH ROLLUP  -- subtotals + grand total
```

## NULL

```sql
col IS NULL
col IS NOT NULL
a <=> b                   -- null-safe equality
COALESCE(a, b, 0)
IFNULL(a, b)
NULLIF(a, b)
```

## Dates

```sql
NOW(), CURDATE(), CURRENT_TIMESTAMP
DATE_ADD(d, INTERVAL 1 DAY)
DATE_SUB(d, INTERVAL 2 HOUR)
DATEDIFF(a, b)                     -- days
TIMESTAMPDIFF(HOUR, a, b)
DATE_FORMAT(d, '%Y-%m-%d %H:%i:%s')
STR_TO_DATE('11/11/2026', '%d/%m/%Y')
DATE(d), YEAR(d), MONTH(d), DAY(d)
LAST_DAY(d)
```

## Window functions

```sql
ROW_NUMBER() OVER (PARTITION BY g ORDER BY x)
RANK()       OVER (ORDER BY x DESC)
DENSE_RANK() OVER (ORDER BY x DESC)
LAG(x, 1, 0) OVER (ORDER BY t)
LEAD(x)      OVER (ORDER BY t)
SUM(x)       OVER (ORDER BY t ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
AVG(x)       OVER (ORDER BY t ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
NTILE(4)     OVER (ORDER BY x)
FIRST_VALUE(x) OVER (PARTITION BY g ORDER BY t)
LAST_VALUE(x)  OVER (PARTITION BY g ORDER BY t
                     ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

## DDL

```sql
CREATE DATABASE db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE t (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('new','done') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_t_name (name),
  KEY idx_t_status (status),
  CONSTRAINT chk_t_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

ALTER TABLE t ADD COLUMN note VARCHAR(255) NULL;
ALTER TABLE t ADD INDEX idx_t_created (created_at);
ALTER TABLE t DROP INDEX idx_t_created;
ALTER TABLE t MODIFY COLUMN name VARCHAR(150) NOT NULL;
ALTER TABLE t RENAME COLUMN note TO comment;
DROP TABLE t;
TRUNCATE TABLE t;
```

## Transactions

```sql
START TRANSACTION;
-- statements
SAVEPOINT s1;
-- statements
ROLLBACK TO SAVEPOINT s1;
COMMIT;
-- or ROLLBACK;

SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT @@transaction_isolation;
```

## Index and plan

```sql
CREATE INDEX idx ON t (a, b, c);
CREATE INDEX idx_lower ON t ((LOWER(email)));
CREATE INDEX idx_prefix ON t (long_text(20));
EXPLAIN SELECT ...;
EXPLAIN ANALYZE SELECT ...;
EXPLAIN FORMAT=JSON SELECT ...;
SHOW INDEX FROM t;
ANALYZE TABLE t;
```

Look for: `type` (`const`/`eq_ref`/`ref`/`range` good; `ALL` bad), `key`,
`rows`, `filtered`, `Extra` (`Using index` good; `Using temporary`,
`Using filesort` investigate).

## Users and privileges

```sql
CREATE USER 'app'@'10.0.0.%' IDENTIFIED BY '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON db.* TO 'app'@'10.0.0.%';
GRANT EXECUTE ON PROCEDURE db.proc TO 'app'@'10.0.0.%';
REVOKE DELETE ON db.* FROM 'app'@'10.0.0.%';
SHOW GRANTS FOR 'app'@'10.0.0.%';
DROP USER 'app'@'10.0.0.%';
```

## Backup and restore

```powershell
mysqldump -u root -p --single-transaction --routines --triggers --events \
  --databases royal_travels > backup.sql

mysql -u root -p < backup.sql
```

## Troubleshooting checklist

1. Is the query slow, or is the app slow? Measure both.
2. `EXPLAIN ANALYZE`: where is the time going?
3. Full scan? Missing index? Wrong composite order?
4. Function/implicit cast/leading wildcard preventing index use?
5. Sorting or grouping millions of rows? Pre-aggregate.
6. Joining a one-to-many table and multiplying rows?
7. Deep `OFFSET`? Use keyset pagination.
8. Stale statistics? `ANALYZE TABLE`.
9. Lock waits or deadlocks? `SHOW ENGINE INNODB STATUS`.
10. Replication lag? `SHOW REPLICA STATUS`.
11. Connection exhaustion? Check pool size and `max_connections`.
12. Disk full from binlogs/undo/general log?

---

# Part D — Interview questions

Answer out loud before opening each one.

<details>
<summary>1. DELETE vs TRUNCATE vs DROP</summary>

`DELETE` is DML, supports `WHERE`, is transactional, fires triggers, and keeps
the auto-increment counter. `TRUNCATE` is DDL, removes all rows quickly, resets
auto-increment, cannot be rolled back, and does not fire triggers. `DROP` removes
the table structure as well.
</details>

<details>
<summary>2. WHERE vs HAVING</summary>

`WHERE` filters rows before grouping and can use indexes. `HAVING` filters groups
after aggregation and can use aggregate functions.
</details>

<details>
<summary>3. INNER JOIN vs LEFT JOIN</summary>

Inner returns only matching rows from both sides. Left returns every row from
the left table, with `NULL`s for unmatched right-side columns.
</details>

<details>
<summary>4. COUNT(*) vs COUNT(column)</summary>

`COUNT(*)` counts rows. `COUNT(column)` counts non-`NULL` values. `COUNT(DISTINCT
column)` counts distinct non-`NULL` values.
</details>

<details>
<summary>5. Clustered vs secondary index</summary>

InnoDB's clustered index is the table stored in primary-key order. A secondary
index stores the indexed columns plus the primary key; fetching other columns
requires a bookmark lookup into the clustered index.
</details>

<details>
<summary>6. Covering index</summary>

An index containing every column the query needs, so no table lookup is needed.
`EXPLAIN` shows `Using index`.
</details>

<details>
<summary>7. Why does composite index order matter?</summary>

The B-tree is sorted by the first column, then the second, and so on. A query
must use a leftmost prefix. Equality columns should come before range/sort
columns.
</details>

<details>
<summary>8. Why would MySQL ignore an index?</summary>

The predicate is not sargable (function, leading wildcard, implicit cast), the
column has low selectivity, the table is tiny, statistics are stale, or the
optimizer estimates a scan is cheaper. Check `EXPLAIN` and `ANALYZE TABLE`.
</details>

<details>
<summary>9. What does type=ALL mean?</summary>

A full table scan. It can be acceptable for small tables or when most rows
match, but on a large table it is usually a missing/unusable index.
</details>

<details>
<summary>10. Explain ACID</summary>

Atomicity (all or nothing), Consistency (constraints/rules hold), Isolation
(concurrent transactions do not corrupt each other), Durability (committed data
survives crashes). InnoDB uses undo log, constraints, MVCC/locks, and redo log.
</details>

<details>
<summary>11. Isolation levels and anomalies</summary>

Read Uncommitted allows dirty reads. Read Committed prevents dirty reads but
allows non-repeatable reads and phantoms. Repeatable Read prevents dirty and
non-repeatable reads; InnoDB also prevents phantoms for consistent reads via
MVCC. Serializable prevents all, at the cost of concurrency.
</details>

<details>
<summary>12. How does MVCC work?</summary>

Each row has a transaction ID and a pointer to an undo-log version. A read view
determines which versions are visible. Readers use a snapshot and do not block
writers; writers create new versions.
</details>

<details>
<summary>13. What is a gap lock?</summary>

A lock on the gap between index records, preventing inserts into a range. Used
under Repeatable Read for range predicates; it can cause deadlocks.
</details>

<details>
<summary>14. How do you handle deadlocks?</summary>

They are normal. Read the InnoDB status, keep transactions short, access rows in
a consistent order, index locking predicates, and retry the victim transaction
with backoff (only if idempotent).
</details>

<details>
<summary>15. Optimistic vs pessimistic locking</summary>

Pessimistic: `SELECT ... FOR UPDATE`, lock first, block others. Optimistic: read
a version, update with `WHERE version = ?`, retry if 0 rows. Pessimistic is
simpler under high contention; optimistic scales better for low contention.
</details>

<details>
<summary>16. Explain 1NF, 2NF, 3NF</summary>

1NF: atomic values, no repeating groups. 2NF: no partial dependency on part of a
composite key. 3NF: no transitive dependency between non-key columns.
</details>

<details>
<summary>17. When would you denormalize?</summary>

For read performance, historical snapshots, or reporting. Duplicate deliberately,
document it, and assign one owner/process to keep it correct.
</details>

<details>
<summary>18. Auto-increment vs UUID primary key</summary>

Auto-increment is compact and insert-friendly (sequential). UUIDs are globally
unique and safe to generate anywhere, but random UUIDs cause page splits and
larger indexes. Use `BINARY(16)` and time-ordered UUIDs if needed.
</details>

<details>
<summary>19. DATETIME vs TIMESTAMP</summary>

`DATETIME` stores a wall-clock value with no timezone conversion, range 1000–9999.
`TIMESTAMP` stores UTC and converts per session, range 1970–2038. Use `DATETIME`
for business times, `TIMESTAMP` for audit instants within its range.
</details>

<details>
<summary>20. DECIMAL vs FLOAT for money</summary>

`DECIMAL` is exact base-10; `FLOAT`/`DOUBLE` are binary floating point with
rounding errors. Always use `DECIMAL` (or integer minor units) for money.
</details>

<details>
<summary>21. When would you use JSON?</summary>

For flexible, sparse attributes or external payloads. Not for fields you filter,
join, or aggregate heavily; promote those to real columns and index them.
</details>

<details>
<summary>22. Full-text vs LIKE</summary>

`LIKE '%term%'` cannot use a B-tree index and scans. `FULLTEXT` builds an
inverted index for word search with relevance ranking. Use a search engine for
fuzzy/faceted/large-scale search.
</details>

<details>
<summary>23. What is replication lag and why does it matter?</summary>

The delay between a transaction committing on the source and being applied on a
replica. Reads from a lagging replica can be stale. Route read-after-write
traffic to the source or use session consistency.
</details>

<details>
<summary>24. Backup vs replication</summary>

A backup is a restorable copy at a point in time. Replication continuously copies
changes, including mistakes like `DROP TABLE`. You need both.
</details>

<details>
<summary>25. How do you prevent SQL injection?</summary>

Use prepared statements/bound parameters for all values, allowlist dynamic
identifiers, apply least privilege, validate input, and avoid raw SQL string
concatenation.
</details>

<details>
<summary>26. How do you debug a slow query?</summary>

Reproduce with realistic data, run `EXPLAIN ANALYZE`, inspect access type, rows,
and Extra, check for missing/unusable indexes, rewrite sargably, add/adjust an
index, and verify with timings. Check locks and server load too.
</details>

<details>
<summary>27. How do you run a safe schema migration?</summary>

Script it, test on a production-sized copy, use online DDL (`ALGORITHM=INPLACE,
LOCK=NONE`) where supported, avoid peak traffic, watch metadata locks and
replication lag, have a rollback/backup plan, and use expand/contract for
renames.
</details>

<details>
<summary>28. What is the N+1 query problem?</summary>

Fetching a list (1 query) and then querying related rows per item (N queries).
Fix with a join, `IN` batching, or a dataloader. It is usually a latency problem,
not a database CPU problem.
</details>

<details>
<summary>29. Why is OFFSET pagination slow?</summary>

The server must generate and discard all rows before the offset. Use keyset
pagination with a range predicate on the last seen sort key.
</details>

<details>
<summary>30. How would you design a booking system's double-booking protection?</summary>

Model the reservable unit as a row with a unique key (vehicle + slot), claim it
atomically with `INSERT ... ON DUPLICATE KEY UPDATE` or a conditional `UPDATE`,
and wrap the booking plus event log in a transaction. Add idempotency keys for
payments.
</details>

---

# Part E — Capstone project

Build this without following a tutorial. It ties every module together.

**Requirements**

- Customers can book a vehicle for a time slot.
- A vehicle cannot be double-booked for the same slot.
- A booking can have addons and multiple payments.
- Drivers are assigned later; only active drivers can be assigned.
- Every status change is auditable.
- Admins can see revenue by month, service type, and vehicle category.
- The public site can track a booking by reference + phone.

**Tasks**

1. Draw the ER diagram (tables, keys, relationships).
2. Write `schema.sql` with types, constraints, and indexes.
3. Seed realistic data, including edge cases (no driver, no payment, cancelled).
4. Write 10 queries: list, search, detail, revenue, utilization, outstanding,
   driver leaderboard, customer lifetime value, monthly growth, availability.
5. Add `vehicle_slots` and prove double-booking is impossible with two
   concurrent sessions.
6. Write a transaction that creates a booking + payment + event atomically.
7. Add a view for the admin booking list.
8. Add a stored procedure to cancel a booking with validation.
9. Run `EXPLAIN` on your five most important queries; add indexes; compare.
10. Create an app user with least privilege and a backup/restore procedure.
11. Write a one-page runbook: backup, restore, slow query, deadlock, disk full.

If you can do all eleven, you are ready to work on a production MySQL-backed
application.

---

# Part F — What to learn next

- **Read the official manual** for the version you use. It is unusually good:
  <https://dev.mysql.com/doc/refman/8.4/en/>
- **Books**: *High Performance MySQL* (Silvia Botros & Jeremy Tinley),
  *SQL Performance Explained* / *Use The Index, Luke* (Markus Winand),
  *Designing Data-Intensive Applications* (Martin Kleppmann) for the bigger
  picture.
- **Practice**: LeetCode Database, StrataScratch, pgexercises (PostgreSQL, but
  concepts transfer), and your own projects.
- **Operations**: set up a local replica with Docker, break it, fix it; practise
  a PITR restore; run `sysbench`.
- **Certification** (optional): Oracle MySQL 8.0 Database Developer (1Z0-909)
  or Database Administrator (1Z0-908). Certifications do not replace projects,
  but they force broad coverage.

---

## Final checklist

- [ ] I completed all 40 exercises and reviewed every mistake.
- [ ] I can explain joins, NULL, aggregation, and windows without notes.
- [ ] I can read a basic `EXPLAIN` and justify an index.
- [ ] I can design a schema with constraints and defend the key choices.
- [ ] I can write a safe transaction and handle a deadlock.
- [ ] I can create a least-privilege user and restore a backup.
- [ ] I built the capstone and can demo it.

You do not need to memorize syntax. You need to know **what is possible**, how
to reason about correctness and performance, and where to look up the exact
details. That is what professional SQL work looks like.
