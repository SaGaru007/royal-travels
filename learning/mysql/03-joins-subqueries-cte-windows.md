# Module 3 — Joins, Subqueries, CTEs, and Window Functions

**Goal:** combine tables correctly, avoid the classic double-counting bugs, and
write analytical queries that feel impossible with plain `GROUP BY`.

This is the module that separates "knows some SQL" from "can build a backend".

```sql
USE royal_travels;
```

---

## 1. What a join really does

A join takes rows from two tables, compares the values in the `ON` clause, and
outputs a row for every **match**.

```
bookings                    vehicles
+------------+-----------+  +-----------+------------------+
| booking_id | vehicle_id|  | vehicle_id| name             |
+------------+-----------+  +-----------+------------------+
| 1          | 1         |  | 1         | Executive Sedan  |
| 2          | 3         |  | 2         | Premium Sedan    |
| 3          | 4         |  | 3         | Innova           |
+------------+-----------+  +-----------+------------------+

JOIN ON bookings.vehicle_id = vehicles.vehicle_id

result: booking 1 + Sedan, booking 2 + Innova, booking 3 + SUV
```

Think **matching rows**, not Venn diagrams. Venn diagrams help with `LEFT` vs
`INNER`, but they hide the most important fact: if the right table has three
matching rows, the left row appears **three times**.

---

## 2. `INNER JOIN`: only matches

```sql
SELECT
    b.booking_id,
    b.contact_name,
    v.name        AS vehicle,
    d.full_name   AS driver,
    b.status
FROM bookings b
JOIN vehicles v ON v.vehicle_id = b.vehicle_id
JOIN drivers  d ON d.driver_id  = b.driver_id
WHERE b.status = 'completed'
ORDER BY b.booking_id;
```

- `JOIN` without a qualifier means `INNER JOIN`.
- Table aliases (`b`, `v`, `d`) keep the query readable. Always qualify columns
  when more than one table is involved.
- Rows with `NULL` `vehicle_id` or `driver_id` disappear, because `NULL` never
  equals anything. That is correct for "completed trips with an assigned
  vehicle and driver", but wrong if you need all bookings.

### `USING` when column names match

```sql
SELECT b.booking_id, v.name
FROM bookings b
JOIN vehicles v USING (vehicle_id);
```

`USING (vehicle_id)` is shorthand for `ON b.vehicle_id = v.vehicle_id` and
outputs the join column once. It only works when the names are identical.

---

## 3. `LEFT JOIN`: keep everything from the left table

```sql
SELECT
    v.vehicle_id,
    v.name,
    COUNT(b.booking_id) AS trips
FROM vehicles v
LEFT JOIN bookings b
       ON b.vehicle_id = v.vehicle_id
      AND b.status <> 'cancelled'
GROUP BY v.vehicle_id, v.name
ORDER BY trips DESC, v.name;
```

- Every vehicle appears, even with zero trips.
- `COUNT(b.booking_id)` returns `0` for no match. `COUNT(*)` would return `1`
  because the left-join row still exists — a very common bug.
- The `status` condition is in the `ON` clause on purpose. It decides which
  bookings count as matches. If you put it in `WHERE`, vehicles whose only
  bookings are cancelled get **removed** and the query silently becomes an
  inner join.

### The `LEFT JOIN` + `WHERE` trap

```sql
-- Looks like a left join, behaves like an inner join:
SELECT v.name, b.booking_id
FROM vehicles v
LEFT JOIN bookings b ON b.vehicle_id = v.vehicle_id
WHERE b.status = 'completed';       -- removes rows where b is NULL

-- Correct: keep all vehicles, only match completed bookings
SELECT v.name, b.booking_id
FROM vehicles v
LEFT JOIN bookings b
       ON b.vehicle_id = v.vehicle_id
      AND b.status = 'completed';
```

Rule: **conditions on the optional table belong in `ON`; conditions on the
required table belong in `WHERE`.**

### `RIGHT JOIN`

`A RIGHT JOIN B` is `B LEFT JOIN A` with the columns in a different order. Most
people rewrite it as a left join for readability. You will rarely need it.

---

## 4. `CROSS JOIN`: every combination

```sql
SELECT COUNT(*) AS combinations
FROM vehicles
CROSS JOIN drivers;
-- 6 vehicles × 5 drivers = 30
```

Cross joins are useful for generating a complete grid (all months × all
service types) so missing data appears as zero. They are dangerous when
accidental: a forgotten `ON` clause produces `rows(A) × rows(B)` rows.

```sql
-- Generate a calendar of months, then attach counts
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
SELECT m.month_start, s.service_type
FROM months m CROSS JOIN services s
ORDER BY m.month_start, s.service_type;
```

---

## 5. Self joins

A self join joins a table to itself. Use two aliases so you can tell the sides
apart.

```sql
-- Customers who booked more than once (pairs of bookings)
SELECT
    a.customer_id,
    a.booking_id AS first_booking,
    b.booking_id AS later_booking,
    a.pickup_at  AS first_pickup,
    b.pickup_at  AS later_pickup
FROM bookings a
JOIN bookings b
  ON b.customer_id = a.customer_id
 AND b.booking_id > a.booking_id
WHERE a.customer_id IS NOT NULL
ORDER BY a.customer_id, a.booking_id;
```

Why `>` and not `<>`? `<>` returns both `(1,2)` and `(2,1)` plus rows where a
row matches itself in some designs. `>` produces each pair once.

Self joins also model hierarchies (employee → manager). The course schema has
no hierarchy, but the recursive CTE section shows the pattern.

---

## 6. Join traps that cause wrong money

### Trap 1: fan-out (row multiplication)

```sql
-- WRONG: a booking with 2 payments contributes its fare twice
SELECT SUM(b.total_fare) AS revenue
FROM bookings b
JOIN payments p ON p.booking_id = b.booking_id;
```

The join produces one row per **payment**, so `SUM(b.total_fare)` repeats the
booking value. This is the most expensive SQL bug in real companies.

Fixes:

```sql
-- A: aggregate the "many" side first
SELECT SUM(b.total_fare) AS revenue
FROM bookings b
JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments
    GROUP BY booking_id
) p ON p.booking_id = b.booking_id;

-- B: count/sum distinct entities
SELECT COUNT(DISTINCT b.booking_id) AS bookings,
       SUM(DISTINCT b.total_fare)   AS wrong_but_tempting
FROM bookings b
JOIN payments p ON p.booking_id = b.booking_id;
```

`SUM(DISTINCT ...)` is usually wrong too: two different bookings can have the
same fare, and `DISTINCT` would collapse them. Aggregate at the correct grain,
then join.

### Trap 2: counting rows instead of entities

```sql
-- Counts payment rows, not bookings
SELECT COUNT(*) FROM payments WHERE status = 'success';

-- Counts bookings with at least one successful payment
SELECT COUNT(DISTINCT booking_id) FROM payments WHERE status = 'success';
```

### Trap 3: `NULL` join keys

```sql
-- Callback bookings with no vehicle do not match, so they vanish
SELECT b.booking_id, v.name
FROM bookings b
JOIN vehicles v ON v.vehicle_id = b.vehicle_id;
```

If you need them:

```sql
SELECT b.booking_id, COALESCE(v.name, '(not assigned)') AS vehicle
FROM bookings b
LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id;
```

### Trap 4: duplicate rows from a one-to-many join

```sql
-- Each booking appears once per event; that may be what you want for a
-- timeline, but not for a booking list.
SELECT b.booking_id, b.contact_name, e.event_type, e.created_at
FROM bookings b
JOIN booking_events e ON e.booking_id = b.booking_id
ORDER BY b.booking_id, e.created_at;
```

Always ask: **what is one row of my result supposed to represent?** If the
answer is "one booking", do not join a many-side table without aggregating it.

---

## 7. Anti-joins and semi-joins

### Anti-join: rows with **no** match

```sql
-- Drivers with no completed trips
SELECT d.driver_id, d.full_name
FROM drivers d
LEFT JOIN bookings b
       ON b.driver_id = d.driver_id
      AND b.status = 'completed'
WHERE b.booking_id IS NULL;
```

### Semi-join: rows with **at least one** match

```sql
-- Customers who have at least one cancelled booking
SELECT c.customer_id, c.full_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.customer_id = c.customer_id
      AND b.status = 'cancelled'
);
```

`EXISTS` stops as soon as it finds one match; it does not care how many exist.
That makes it ideal for "has any" questions.

`IN` can express the same thing:

```sql
SELECT customer_id, full_name
FROM customers
WHERE customer_id IN (
    SELECT customer_id FROM bookings WHERE status = 'cancelled'
);
```

Prefer `EXISTS` when the subquery is correlated or can return `NULL`s. Prefer
`IN` when the list is small and simple. Both are usually optimized similarly in
MySQL 8.

### `NOT EXISTS` vs `NOT IN`

```sql
-- Safe even when bookings.customer_id contains NULL
SELECT c.customer_id, c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.customer_id = c.customer_id
);
```

Use `NOT EXISTS` as your default for "does not exist". It expresses intent
clearly and avoids the `NULL` trap.

---

## 8. Subqueries

A subquery is a `SELECT` inside another statement. Four shapes matter.

### Scalar subquery: returns exactly one value

```sql
SELECT
    booking_id,
    total_fare,
    (SELECT ROUND(AVG(total_fare), 2) FROM bookings) AS overall_avg,
    ROUND(total_fare - (SELECT AVG(total_fare) FROM bookings), 2) AS diff
FROM bookings
WHERE total_fare IS NOT NULL
ORDER BY total_fare DESC;
```

If a scalar subquery returns more than one row, MySQL raises an error. If it
returns no rows, the value is `NULL`.

### Subquery in `WHERE`

```sql
-- Bookings priced above the overall average
SELECT booking_id, total_fare
FROM bookings
WHERE total_fare > (SELECT AVG(total_fare) FROM bookings);
```

```sql
-- Customers who have made an airport booking
SELECT customer_id, full_name
FROM customers
WHERE customer_id IN (
    SELECT customer_id
    FROM bookings
    WHERE service_type = 'airport'
      AND customer_id IS NOT NULL
);
```

### Correlated subquery: references the outer row

```sql
-- Compare each booking with the average for its own service type
SELECT
    b.booking_id,
    b.service_type,
    b.total_fare,
    (
        SELECT ROUND(AVG(b2.total_fare), 2)
        FROM bookings b2
        WHERE b2.service_type = b.service_type
    ) AS avg_for_type
FROM bookings b
WHERE b.total_fare IS NOT NULL
ORDER BY b.service_type, b.total_fare DESC;
```

The inner query runs conceptually once per outer row. With an index on
`(service_type, total_fare)` it is fast; without one it can be very slow.

### Derived table: a subquery in `FROM`

```sql
SELECT service_type, avg_fare
FROM (
    SELECT service_type, AVG(total_fare) AS avg_fare
    FROM bookings
    WHERE total_fare IS NOT NULL
    GROUP BY service_type
) AS per_type
WHERE avg_fare > 5000
ORDER BY avg_fare DESC;
```

A derived table must have an alias (`AS per_type`). MySQL 8 can often merge it
into the outer query, or materialize it when needed.

### `LATERAL`: a derived table that sees the outer row

```sql
-- The two most expensive bookings for each customer
SELECT c.customer_id, c.full_name, x.booking_id, x.total_fare
FROM customers c
JOIN LATERAL (
    SELECT b.booking_id, b.total_fare
    FROM bookings b
    WHERE b.customer_id = c.customer_id
      AND b.total_fare IS NOT NULL
    ORDER BY b.total_fare DESC
    LIMIT 2
) AS x ON TRUE
ORDER BY c.customer_id, x.total_fare DESC;
```

`LATERAL` (MySQL 8.0.14+) is the clean way to do "top N per group" without
window functions. Window functions are usually faster on large data because
they sort once; `LATERAL` can run the inner query per outer row.

### `EXISTS` vs `IN` vs `JOIN`: which one?

| Question | Best tool |
|---|---|
| Does at least one related row exist? | `EXISTS` |
| Is this value in a list/subquery? | `IN` |
| I need columns from both tables | `JOIN` |
| I need rows with no match | `LEFT JOIN ... IS NULL` or `NOT EXISTS` |
| Top N per group | window function or `LATERAL` |

There is no universal winner. Read the plan (`EXPLAIN`) for your data.

---

## 9. CTEs: name your steps

A Common Table Expression (CTE) is a named subquery that makes a complex query
readable. It exists only for the statement that follows it.

```sql
WITH completed AS (
    SELECT *
    FROM bookings
    WHERE status = 'completed'
),
per_customer AS (
    SELECT
        customer_id,
        COUNT(*)          AS trips,
        SUM(total_fare)   AS spend
    FROM completed
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
)
SELECT
    c.full_name,
    p.trips,
    p.spend
FROM per_customer p
JOIN customers c USING (customer_id)
ORDER BY p.spend DESC;
```

- `WITH` can define one or many CTEs, separated by commas.
- A CTE can reference an earlier CTE in the same `WITH`.
- A CTE is not automatically materialized in MySQL 8; the optimizer may merge
  or materialize it. Do not assume it is a temporary table.
- CTEs improve readability, not necessarily speed.

### Recursive CTE

A recursive CTE references itself and needs a termination condition.

```sql
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1
    FROM numbers
    WHERE n < 5
)
SELECT * FROM numbers;
-- 1, 2, 3, 4, 5
```

A date series is more useful:

```sql
WITH RECURSIVE months AS (
    SELECT DATE('2026-09-01') AS month_start
    UNION ALL
    SELECT DATE_ADD(month_start, INTERVAL 1 MONTH)
    FROM months
    WHERE month_start < '2026-12-01'
)
SELECT
    DATE_FORMAT(m.month_start, '%Y-%m') AS trip_month,
    COUNT(b.booking_id)                 AS bookings
FROM months m
LEFT JOIN bookings b
       ON b.pickup_at >= m.month_start
      AND b.pickup_at <  DATE_ADD(m.month_start, INTERVAL 1 MONTH)
GROUP BY m.month_start
ORDER BY m.month_start;
```

This returns all four months, including months with zero bookings — something a
plain `GROUP BY` cannot do.

Safety:

- The default recursion limit is 1000 (`cte_max_recursion_depth`). Infinite
  recursion raises an error rather than hanging forever.
- Always include a `WHERE` that eventually becomes false.
- Use `UNION ALL` unless you need duplicate removal (`UNION` is more expensive).

Hierarchies work the same way:

```sql
-- Pattern only; there is no employees table in this schema
WITH RECURSIVE org AS (
    SELECT employee_id, manager_id, full_name, 1 AS depth
    FROM employees
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.manager_id, e.full_name, o.depth + 1
    FROM employees e
    JOIN org o ON e.manager_id = o.employee_id
)
SELECT * FROM org ORDER BY depth, full_name;
```

---

## 10. Window functions

A window function calculates across a set of related rows **without collapsing
them**. `GROUP BY` gives you one row per group; a window function gives you the
original rows plus a calculation.

```sql
SELECT
    booking_id,
    customer_id,
    total_fare,
    SUM(total_fare) OVER (PARTITION BY customer_id) AS customer_total,
    ROUND(
        100 * total_fare / SUM(total_fare) OVER (PARTITION BY customer_id),
        1
    ) AS pct_of_customer_total
FROM bookings
WHERE customer_id IS NOT NULL
  AND total_fare IS NOT NULL
ORDER BY customer_id, booking_id;
```

Anatomy:

```sql
function() OVER (
    PARTITION BY customer_id      -- reset the calculation per customer
    ORDER BY pickup_at            -- order inside each partition
    ROWS BETWEEN ... AND ...      -- which rows the function sees
)
```

### Ranking

```sql
WITH ranked AS (
    SELECT
        b.booking_id,
        b.customer_id,
        b.total_fare,
        ROW_NUMBER() OVER (
            PARTITION BY b.customer_id
            ORDER BY b.total_fare DESC
        ) AS row_num,
        RANK() OVER (
            PARTITION BY b.customer_id
            ORDER BY b.total_fare DESC
        ) AS rank_num,
        DENSE_RANK() OVER (
            PARTITION BY b.customer_id
            ORDER BY b.total_fare DESC
        ) AS dense_rank_num
    FROM bookings b
    WHERE b.customer_id IS NOT NULL
      AND b.total_fare IS NOT NULL
)
SELECT *
FROM ranked
WHERE row_num <= 2
ORDER BY customer_id, row_num;
```

Differences with fares `100, 100, 80`:

| Function | Result |
|---|---|
| `ROW_NUMBER` | 1, 2, 3 (always unique) |
| `RANK` | 1, 1, 3 (ties share a rank, then a gap) |
| `DENSE_RANK` | 1, 1, 2 (ties share a rank, no gap) |

For "top 2 per customer" use `ROW_NUMBER`, so ties do not produce three rows.

### `LAG` and `LEAD`: look at neighbouring rows

```sql
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
    LAG(revenue)  OVER (ORDER BY trip_month) AS previous_month,
    ROUND(
        100 * (revenue - LAG(revenue) OVER (ORDER BY trip_month))
        / NULLIF(LAG(revenue) OVER (ORDER BY trip_month), 0),
        1
    ) AS pct_change
FROM monthly
ORDER BY trip_month;
```

`LAG(col, n, default)` looks `n` rows back; `LEAD` looks forward. The default
is used when there is no such row; otherwise the result is `NULL`.

### Running totals

```sql
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
    SUM(revenue) OVER (
        ORDER BY trip_month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM monthly
ORDER BY trip_month;
```

### Moving average

```sql
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
ORDER BY pickup_at;
```

### Frames: the detail that changes answers

With `ORDER BY` inside `OVER`, the default frame is
`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. `RANGE` includes **peers**
(rows with the same sort value), so a running total can jump when dates tie.

Use `ROWS` when you mean physical rows:

```sql
SUM(revenue) OVER (
    ORDER BY trip_month
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

Without `ORDER BY`, the default frame is the whole partition.

`LAST_VALUE` is a classic trap: with the default frame it returns the current
row, not the partition's last row. Use:

```sql
LAST_VALUE(total_fare) OVER (
    PARTITION BY customer_id
    ORDER BY pickup_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### `NTILE`: split into buckets

```sql
SELECT
    booking_id,
    total_fare,
    NTILE(4) OVER (ORDER BY total_fare) AS quartile
FROM bookings
WHERE total_fare IS NOT NULL;
```

Useful for percentile-style reporting (who is in the top 25% of spend?).

### Can I filter on a window function?

Not directly. This fails:

```sql
SELECT booking_id, ROW_NUMBER() OVER (ORDER BY total_fare DESC) AS rn
FROM bookings
WHERE rn <= 3;   -- ERROR: Unknown column 'rn' in 'where clause'
```

Wrap it in a CTE or derived table:

```sql
WITH ranked AS (
    SELECT booking_id, total_fare,
           ROW_NUMBER() OVER (ORDER BY total_fare DESC) AS rn
    FROM bookings
    WHERE total_fare IS NOT NULL
)
SELECT * FROM ranked WHERE rn <= 3;
```

MySQL has no `QUALIFY` clause (unlike Snowflake/BigQuery).

### Window functions after `GROUP BY`

Window functions run after grouping, so you can rank groups:

```sql
SELECT
    driver_id,
    COUNT(*) AS trips,
    RANK() OVER (ORDER BY COUNT(*) DESC) AS trip_rank
FROM bookings
WHERE driver_id IS NOT NULL
GROUP BY driver_id
ORDER BY trip_rank;
```

---

## 11. Set operations

```sql
-- Unique names from both tables
SELECT contact_name FROM bookings
UNION
SELECT full_name FROM customers;

-- Keep duplicates and run faster
SELECT contact_name FROM bookings
UNION ALL
SELECT full_name FROM customers;
```

- `UNION` removes duplicates across the whole result (and may sort).
- `UNION ALL` keeps everything and is usually faster. Prefer it when you know
  duplicates are impossible or wanted.
- Column count and compatible types must match; names come from the first query.
- `ORDER BY` and `LIMIT` apply to the entire union, not the last branch. Put
  them at the end.

MySQL 8.0.31+ also supports:

```sql
SELECT service_type FROM bookings WHERE status = 'completed'
INTERSECT
SELECT service_type FROM bookings WHERE payment_status = 'paid';

SELECT service_type FROM bookings
EXCEPT
SELECT service_type FROM bookings WHERE status = 'cancelled';
```

`INTERSECT` = rows in both. `EXCEPT` = rows in the first but not the second
(called `MINUS` in Oracle). On older MySQL, emulate with `INNER JOIN` and
`NOT EXISTS`.

---

## 12. Real reports, end to end

### Customer lifetime value

```sql
SELECT
    c.customer_id,
    c.full_name,
    COUNT(b.booking_id)                 AS completed_trips,
    COALESCE(SUM(b.total_fare), 0)      AS lifetime_value,
    MAX(b.pickup_at)                    AS last_trip,
    MIN(b.pickup_at)                    AS first_trip
FROM customers c
LEFT JOIN bookings b
       ON b.customer_id = c.customer_id
      AND b.status = 'completed'
GROUP BY c.customer_id, c.full_name
ORDER BY lifetime_value DESC;
```

### Each customer's latest booking

```sql
WITH ranked AS (
    SELECT
        b.*,
        ROW_NUMBER() OVER (
            PARTITION BY b.customer_id
            ORDER BY b.created_at DESC, b.booking_id DESC
        ) AS rn
    FROM bookings b
    WHERE b.customer_id IS NOT NULL
)
SELECT customer_id, booking_id, service_type, status, created_at
FROM ranked
WHERE rn = 1
ORDER BY customer_id;
```

### Driver leaderboard (completed trips only)

```sql
SELECT
    d.driver_id,
    d.full_name,
    COUNT(b.booking_id)            AS trips,
    COALESCE(SUM(b.total_fare), 0) AS trip_value,
    ROUND(AVG(d.rating), 2)        AS rating
FROM drivers d
LEFT JOIN bookings b
       ON b.driver_id = d.driver_id
      AND b.status = 'completed'
GROUP BY d.driver_id, d.full_name
ORDER BY trips DESC, trip_value DESC;
```

### Revenue vs collected payments

```sql
SELECT
    b.booking_id,
    b.contact_name,
    b.total_fare,
    COALESCE(p.paid, 0)                          AS paid,
    b.total_fare - COALESCE(p.paid, 0)           AS outstanding
FROM bookings b
LEFT JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments
    WHERE status = 'success'
    GROUP BY booking_id
) p ON p.booking_id = b.booking_id
WHERE b.total_fare IS NOT NULL
  AND b.total_fare > COALESCE(p.paid, 0)
ORDER BY outstanding DESC;
```

The subquery aggregates payments **before** the join. That is the safe pattern
for one-to-many relationships.

### Monthly revenue with growth and running total

```sql
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
    LAG(revenue) OVER (ORDER BY trip_month) AS prev_month,
    ROUND(
        100 * (revenue - LAG(revenue) OVER (ORDER BY trip_month))
        / NULLIF(LAG(revenue) OVER (ORDER BY trip_month), 0),
        1
    ) AS pct_growth,
    SUM(revenue) OVER (
        ORDER BY trip_month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM monthly
ORDER BY trip_month;
```

### Trips per driver per month (dense report)

```sql
SELECT
    d.full_name,
    DATE_FORMAT(b.pickup_at, '%Y-%m') AS trip_month,
    COUNT(*)                          AS trips
FROM drivers d
JOIN bookings b ON b.driver_id = d.driver_id
WHERE b.status = 'completed'
GROUP BY d.full_name, trip_month
ORDER BY d.full_name, trip_month;
```

If you need **every** driver in **every** month, cross join drivers with the
month series and left join bookings. That is the "complete grid" pattern from
section 4.

---

## 13. How MySQL executes joins (a useful mental model)

- **Nested loop**: for each row on the left, look up matching rows on the right
  using an index. Fast when the join column is indexed and the outer side is
  small.
- **Hash join** (MySQL 8.0.18+): build a hash table on the smaller input, probe
  it with the other. Good for large joins without useful indexes.
- **Block nested loop**: fallback that compares blocks of rows. A warning sign
  in `EXPLAIN` (`Using join buffer`) often means a missing index.

What you control:

1. Index the join columns (`bookings.vehicle_id`, `bookings.driver_id`, etc.).
2. Filter early so fewer rows reach the join.
3. Select only needed columns so covering indexes are possible.
4. Avoid joining a one-to-many table unless you aggregate it first.

`EXPLAIN` is covered in Module 4. For now, remember: **joins are cheap when
the keys are indexed and the row counts are small; they are expensive when you
join raw one-to-many tables and then aggregate.**

---

## 14. Common mistakes

1. **Forgetting `ON`** → accidental cross join.
2. **Putting a right-table filter in `WHERE` after a `LEFT JOIN`** → inner join.
3. **`COUNT(*)` after a left join** → counts the empty side as 1.
4. **Summing a left-table column after joining a many-side table** → fan-out.
5. **Using `NOT IN` with nullable subqueries.**
6. **Assuming `JOIN` order in the SQL text is execution order** — the optimizer
   decides.
7. **Filtering a window function in `WHERE`.**
8. **Using `RANGE` when you meant `ROWS`** in a running total.
9. **Forgetting the alias on a derived table.**
10. **Writing a 100-line nested subquery** instead of CTEs. Readability is a
    correctness feature.

---

## 15. Practice tasks

1. List every booking with the vehicle name and driver name, including bookings
   where either is not assigned.
2. Count bookings per vehicle, including vehicles with zero bookings.
3. Find customers who have never booked an `outstation` trip.
4. Show each customer's total completed spend, including customers with zero.
5. Find the top 2 most expensive bookings per service type.
6. For each driver, show completed trips and total trip value, including
   drivers with none.
7. Show monthly completed revenue with the previous month and percentage
   growth.
8. Find bookings whose total fare is above the average for their service type.
9. Show each booking's payment total (successful only) and outstanding amount.
10. Produce a month-by-service-type grid with zero for missing combinations.
11. Find customers with more than one booking and list their booking IDs.
12. Show the latest booking per customer using `ROW_NUMBER`.

Answers and hints are in Module 6 when you get stuck.

---

## 16. Quiz

1. What is the difference between `INNER JOIN` and `LEFT JOIN`?
2. Why does a filter on the right table in `WHERE` break a left join?
3. What is fan-out, and how do you prevent it?
4. When should you use `EXISTS` instead of `IN`?
5. What does `COUNT(*)` return after a left join with no match, and what should
   you use instead?
6. What is the difference between `RANK` and `DENSE_RANK`?
7. Why can't you use a window function in `WHERE`?
8. What does `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` include?
9. What is the difference between `UNION` and `UNION ALL`?
10. When is a recursive CTE the right tool?

<details>
<summary>Answers</summary>

1. `INNER JOIN` returns only matching rows from both sides. `LEFT JOIN` returns
   every row from the left table, with `NULL`s where the right side has no match.
2. `WHERE` is applied after the join. A condition like `b.status = 'completed'`
   evaluates to `UNKNOWN` for the `NULL` right-side rows, so they are removed,
   making the result equivalent to an inner join. Put the condition in `ON`.
3. Fan-out is when a one-to-many join duplicates the "one" side, so aggregates
   over it are multiplied. Aggregate the many side in a subquery/CTE first, or
   count/sum distinct entities at the correct grain.
4. When you only need to know whether a related row exists, especially with
   correlated conditions or nullable columns. `EXISTS` stops at the first match.
5. `COUNT(*)` returns 1 because the left row still exists. Use
   `COUNT(right_table.pk)` to get 0.
6. `RANK` leaves gaps after ties (1,1,3); `DENSE_RANK` does not (1,1,2).
7. Window functions are evaluated after `WHERE`, so the computed column does
   not exist yet. Wrap the query in a CTE/derived table and filter outside.
8. The current row plus the two rows immediately before it in the window's
   order (three rows total, fewer at the start).
9. `UNION` removes duplicate rows (and may sort); `UNION ALL` keeps all rows and
   is faster.
10. For hierarchies (org charts, categories) or generating a sequence (dates,
    numbers) where each step depends on the previous row.

</details>

---

## Before you move on

- [ ] You can explain why a left join with a `WHERE` on the right table is wrong.
- [ ] You can spot fan-out in a query and fix it.
- [ ] You can write `EXISTS`, `NOT EXISTS`, and an anti-join.
- [ ] You can use a CTE to break a query into named steps.
- [ ] You can rank rows per group and compute a running total.
- [ ] You know that window functions cannot go in `WHERE`.

Next: **[04-design-indexes-performance.md](04-design-indexes-performance.md)**
