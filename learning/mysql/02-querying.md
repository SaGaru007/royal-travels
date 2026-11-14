# Module 2 — Querying: `SELECT` from zero to real reports

**Goal:** get exactly the rows and columns you want, handle `NULL` correctly,
and produce summary reports with `GROUP BY`.

All examples use `royal_travels`:

```sql
USE royal_travels;
```

---

## 1. The shape of a query

```sql
SELECT   contact_name, total_fare          -- 5. which columns
FROM     bookings                          -- 1. which table
WHERE    status = 'completed'              -- 2. which rows
GROUP BY customer_id                       -- 3. group rows
HAVING   COUNT(*) > 1                      -- 4. filter groups
ORDER BY total_fare DESC                   -- 6. sort
LIMIT    10;                               -- 7. cut
```

You **write** it in that order, but MySQL **thinks** in this order:

```
FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

This explains three beginner mysteries:

1. You cannot use a `SELECT` alias in `WHERE` — the alias does not exist yet.
   You *can* use it in `GROUP BY`, `HAVING`, and `ORDER BY`.
2. `WHERE` cannot contain aggregates (`SUM`, `COUNT`); use `HAVING`.
3. `LIMIT` happens last, after sorting. Without `ORDER BY`, "first 10 rows" is
   whatever order the storage engine happens to return — not guaranteed.

---

## 2. Choosing columns

```sql
SELECT booking_id, contact_name, total_fare
FROM bookings
LIMIT 5;
```

### Aliases and expressions

```sql
SELECT
    booking_id,
    contact_name AS customer,
    total_fare,
    ROUND(total_fare * 0.18, 2) AS gst_estimate,
    total_fare + ROUND(total_fare * 0.18, 2) AS with_gst
FROM bookings
WHERE status = 'completed'
ORDER BY total_fare DESC;
```

- `AS` is optional but improves readability.
- Aliases with spaces need backticks: `AS `total fare``. Prefer underscores.
- Expressions are calculated per row. They are not stored unless you use a
  generated column.

### Why not `SELECT *`?

- The app receives columns it does not need → more network and memory.
- Column order/count changes break code that reads by position.
- It prevents **covering indexes** (Module 4), so the server must fetch full rows.
- It hides the impact of schema changes.

Use `SELECT *` only for interactive exploration, then replace it with the
columns you actually need.

### `DISTINCT`

```sql
SELECT DISTINCT service_type FROM bookings;

SELECT DISTINCT customer_id
FROM bookings
WHERE customer_id IS NOT NULL;
```

`DISTINCT` applies to the whole selected row, not just the first column.
`SELECT DISTINCT a, b` removes duplicate `(a,b)` pairs.

---

## 3. Filtering rows with `WHERE`

```sql
SELECT booking_id, contact_name, status, total_fare
FROM bookings
WHERE status = 'confirmed'
  AND service_type = 'outstation'
  AND total_fare > 5000;
```

### Comparison and logic

| Operator | Example | Meaning |
|---|---|---|
| `=` `<>` `!=` | `status <> 'cancelled'` | equality / inequality |
| `>` `>=` `<` `<=` | `total_fare >= 5000` | order |
| `AND` | `a AND b` | both true |
| `OR` | `a OR b` | at least one true |
| `NOT` | `NOT (a AND b)` | negation |
| `BETWEEN` | `total_fare BETWEEN 1000 AND 5000` | inclusive range |
| `IN` | `status IN ('new','contacted')` | matches any value |
| `LIKE` | `contact_name LIKE 'A%'` | pattern |
| `REGEXP_LIKE` | `REGEXP_LIKE(phone, '^[+]91')` | regular expression |
| `IS NULL` | `drop_location IS NULL` | unknown |

**`AND` binds tighter than `OR`.** This is a classic bug:

```sql
-- Wrong: means (status = 'new') OR (status = 'contacted' AND service_type = 'airport')
WHERE status = 'new' OR status = 'contacted' AND service_type = 'airport'

-- Right: use parentheses
WHERE (status = 'new' OR status = 'contacted')
  AND service_type = 'airport'
```

### `BETWEEN` and dates

`BETWEEN '2026-11-01' AND '2026-11-30'` on a `DATETIME` column **excludes**
trips after `2026-11-30 00:00:00`. Use a half-open range:

```sql
WHERE pickup_at >= '2026-11-01'
  AND pickup_at <  '2026-12-01'
```

This is index-friendly and works for any precision.

### `IN`

```sql
SELECT booking_id, status
FROM bookings
WHERE status IN ('new', 'contacted', 'confirmed');

SELECT booking_id
FROM bookings
WHERE customer_id IN (1, 2, 3);
```

`IN` is cleaner than a chain of `OR`s. A very long `IN` list is better loaded
into a temporary table or join table (Module 3).

### `LIKE`

```sql
SELECT contact_name, contact_phone
FROM bookings
WHERE contact_name LIKE 'A%';        -- starts with A

SELECT contact_name
FROM bookings
WHERE contact_name LIKE '%ar%';      -- contains "ar" anywhere

SELECT contact_name
FROM bookings
WHERE contact_name LIKE '_arav%';    -- one char, then "arav"
```

- `%` = any number of characters (including zero).
- `_` = exactly one character.
- Matching is case-insensitive with the default `utf8mb4_0900_ai_ci`
  collation. `LIKE 'a%'` also matches `Aarav`.
- A **leading** `%` cannot use a normal B-tree index. For large tables, use
  full-text search or a trigram/functional strategy (Module 5).
- To search for a literal `%`, escape it: `LIKE '50\%'` (or use `ESCAPE`).

### Regular expressions (MySQL 8)

```sql
SELECT contact_phone
FROM bookings
WHERE REGEXP_LIKE(contact_phone, '^[+]91[0-9]{10}$');
```

Also available: `REGEXP_REPLACE`, `REGEXP_SUBSTR`, `REGEXP_INSTR`.
Regex is powerful but usually slower than `LIKE` or full-text search. Use it
for validation, not for searching millions of rows.

---

## 4. `NULL`: the number-one source of wrong answers

`NULL` means **unknown**, not `0`, not `''`.

```sql
SELECT booking_id, drop_location
FROM bookings
WHERE drop_location IS NULL;
```

This returns **zero rows**:

```sql
SELECT booking_id
FROM bookings
WHERE drop_location = NULL;   -- NULL = NULL is UNKNOWN, not TRUE
```

Use `IS NULL` / `IS NOT NULL`, or the null-safe equality operator:

```sql
SELECT 1 <=> NULL,       -- 0 (false)
       NULL <=> NULL,    -- 1 (true)
       NULL = NULL;      -- NULL (unknown)
```

### `NULL` in calculations

Any arithmetic with `NULL` produces `NULL`:

```sql
SELECT 100 + NULL;       -- NULL
SELECT CONCAT('A', NULL);-- NULL
```

`CONCAT_WS` skips `NULL` arguments:

```sql
SELECT CONCAT_WS(' -> ', pickup_location, drop_location) AS route
FROM bookings
WHERE booking_id IN (1, 11);
```

### `NULL` in aggregates

```sql
SELECT
    COUNT(*)            AS all_rows,       -- 24
    COUNT(total_fare)   AS priced_rows,    -- 22 (callbacks have NULL fare)
    COUNT(DISTINCT service_type) AS services,
    AVG(total_fare)     AS avg_fare,       -- ignores NULL rows
    SUM(total_fare)     AS revenue         -- NULL when no rows match
FROM bookings;
```

- `COUNT(*)` counts rows.
- `COUNT(column)` counts non-`NULL` values.
- `AVG`, `SUM`, `MIN`, `MAX` ignore `NULL`.
- `SUM` over an empty set returns `NULL`, not `0`. Wrap it:
  `COALESCE(SUM(total_fare), 0)`.

### The `NOT IN` + `NULL` trap

This returns **no rows**, even though there are customers without bookings:

```sql
SELECT customer_id, full_name
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM bookings);
```

Why? The subquery includes `NULL` (from the walk-in bookings). `x NOT IN
(1,2,NULL)` is equivalent to `x <> 1 AND x <> 2 AND x <> NULL`; the last part is
`UNKNOWN`, so the whole condition is never `TRUE`.

Fixes:

```sql
-- 1. Exclude NULLs in the subquery
WHERE customer_id NOT IN (
    SELECT customer_id FROM bookings WHERE customer_id IS NOT NULL
);

-- 2. Better: use NOT EXISTS (NULL-safe and usually clearer)
SELECT c.customer_id, c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.customer_id = c.customer_id
);
```

### Useful `NULL` functions

```sql
SELECT
    IFNULL(drop_location, '(not provided)') AS drop_loc,
    COALESCE(base_fare, total_fare, 0)      AS any_fare,
    NULLIF(advance_amount, 0)               AS nonzero_advance
FROM bookings
LIMIT 5;
```

- `IFNULL(a, b)` → `b` if `a` is `NULL` (MySQL-specific, two arguments).
- `COALESCE(a, b, c, ...)` → first non-`NULL` (standard SQL, any number).
- `NULLIF(a, b)` → `NULL` if `a = b`, else `a`. Handy to avoid division by zero:
  `total / NULLIF(quantity, 0)`.

---

## 5. Sorting and limiting

```sql
SELECT booking_id, contact_name, pickup_at, total_fare
FROM bookings
ORDER BY pickup_at DESC
LIMIT 10;
```

Multiple sort keys:

```sql
SELECT booking_id, status, created_at
FROM bookings
ORDER BY status ASC, created_at DESC;
```

- `ASC` is the default.
- `NULL`s sort **first** in `ASC` and last in `DESC` in MySQL.
- To force `NULL`s last in ascending order:

```sql
ORDER BY drop_location IS NULL, drop_location ASC;
-- false (0) rows first, true (1) rows last
```

- You can sort by an expression or alias:

```sql
SELECT booking_id, total_fare - advance_amount AS due
FROM bookings
ORDER BY due DESC;
```

### `LIMIT` / `OFFSET`

```sql
SELECT booking_id FROM bookings ORDER BY booking_id LIMIT 10;          -- rows 1-10
SELECT booking_id FROM bookings ORDER BY booking_id LIMIT 10 OFFSET 20; -- rows 21-30
```

`LIMIT 10, 20` is the same as `LIMIT 20 OFFSET 10` (first number = offset).

**Deep pagination is slow.** `OFFSET 100000` makes the server generate and
discard 100,000 rows. For large tables use **keyset pagination**:

```sql
-- Page 1
SELECT booking_id, created_at
FROM bookings
ORDER BY created_at DESC, booking_id DESC
LIMIT 10;

-- Next page: pass the last row's values from the previous page
SELECT booking_id, created_at
FROM bookings
WHERE (created_at, booking_id) < ('2026-11-10 11:25:00', 15)
ORDER BY created_at DESC, booking_id DESC
LIMIT 10;
```

This needs an index on `(created_at, booking_id)` and stays fast at any depth.
The trade-off: users cannot jump to page 500 directly.

Avoid `ORDER BY RAND()` on large tables — it sorts every row. For a random
sample, use a random id range or a precomputed random column.

---

## 6. Functions you will use every day

### Strings

```sql
SELECT
    CONCAT(contact_name, ' <', contact_phone, '>') AS contact,
    UPPER(contact_name)                            AS upper_name,
    LOWER(contact_name)                            AS lower_name,
    CHAR_LENGTH(contact_name)                      AS characters,
    LENGTH(contact_name)                           AS bytes,
    LEFT(contact_name, 3)                          AS first3,
    SUBSTRING(contact_name, 1, 3)                  AS first3_again,
    SUBSTRING_INDEX(contact_phone, '+91', -1)      AS without_country,
    TRIM('  hello  ')                              AS trimmed,
    REPLACE(contact_phone, '+91', '0')             AS local_format,
    LPAD(booking_id, 6, '0')                       AS padded_id
FROM bookings
LIMIT 3;
```

- `CHAR_LENGTH` counts characters; `LENGTH` counts **bytes** (UTF-8 can use
  4 bytes per character).
- `CONCAT` returns `NULL` if any argument is `NULL`; `CONCAT_WS` skips nulls.
- `SUBSTRING_INDEX(str, delim, n)`: `n > 0` takes from the left, `n < 0` from
  the right.

### Numbers

```sql
SELECT
    ROUND(1450.567, 2)      AS rounded,     -- 1450.57
    TRUNCATE(1450.567, 2)   AS truncated,   -- 1450.56
    CEIL(1450.1)            AS rounded_up,  -- 1451
    FLOOR(1450.9)           AS rounded_down,-- 1450
    ABS(-42)                AS absolute,
    MOD(17, 5)              AS remainder,   -- 2
    GREATEST(1, 9, 4)       AS biggest,
    LEAST(1, 9, 4)          AS smallest;
```

For money, `ROUND` is usually right. `TRUNCATE` simply cuts digits (no
rounding).

### Dates and times

```sql
SELECT
    NOW()                                        AS now,
    CURDATE()                                    AS today,
    DATE_ADD(pickup_at, INTERVAL 1 DAY)          AS next_day,
    DATE_SUB(pickup_at, INTERVAL 2 HOUR)         AS two_hours_before,
    DATEDIFF(pickup_at, created_at)              AS days_between,
    TIMESTAMPDIFF(HOUR, created_at, pickup_at)   AS hours_between,
    DATE_FORMAT(pickup_at, '%d %b %Y, %h:%i %p') AS pretty,
    EXTRACT(MONTH FROM pickup_at)                AS month_no,
    DAYNAME(pickup_at)                           AS weekday,
    LAST_DAY(pickup_at)                          AS month_end
FROM bookings
WHERE booking_id = 1;
```

Format specifiers worth memorizing:

| Specifier | Meaning | Example |
|---|---|---|
| `%Y` | 4-digit year | 2026 |
| `%m` | month 01–12 | 11 |
| `%d` | day 01–31 | 09 |
| `%H` | hour 00–23 | 18 |
| `%i` | minutes 00–59 | 05 |
| `%s` | seconds 00–59 | 30 |
| `%M` | month name | November |
| `%b` | short month | Nov |
| `%W` | weekday name | Monday |
| `%h` | hour 01–12 | 06 |
| `%p` | AM/PM | PM |

`DATE_FORMAT` returns a **string**. To group by month, either group by the
formatted string (easy to read) or by `YEAR(pickup_at), MONTH(pickup_at)`
(sortable). Do not compare formatted strings to dates.

### Conditionals

```sql
SELECT
    booking_id,
    total_fare,
    CASE
        WHEN total_fare IS NULL    THEN 'quote only'
        WHEN total_fare >= 20000   THEN 'high'
        WHEN total_fare >= 5000    THEN 'medium'
        ELSE 'low'
    END AS fare_band,
    IF(status = 'completed', 'done', 'open') AS simple_flag
FROM bookings
ORDER BY booking_id;
```

- `CASE` is standard SQL and works anywhere an expression is allowed
  (`SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`).
- The first matching `WHEN` wins. Always include `ELSE` unless `NULL` is a
  meaningful result.
- `IF(condition, then, else)` is a compact MySQL-only two-branch version.

### Casting

```sql
SELECT
    CAST('2026-11-11' AS DATE)        AS as_date,
    CAST('42.75' AS DECIMAL(10,2))    AS as_money,
    CAST(42 AS CHAR)                  AS as_text,
    CONVERT('2026-11-11', DATE)       AS converted;
```

Implicit casts are a performance trap:

```sql
-- phone is VARCHAR. Comparing to a number forces a cast per row and can
-- prevent index use:
WHERE contact_phone = 9800000001       -- bad

WHERE contact_phone = '9800000001'     -- good
```

---

## 7. Aggregation: from rows to answers

```sql
SELECT
    COUNT(*)          AS total_bookings,
    COUNT(total_fare) AS bookings_with_fare,
    SUM(total_fare)   AS total_value,
    AVG(total_fare)   AS average_fare,
    MIN(total_fare)   AS cheapest,
    MAX(total_fare)   AS most_expensive
FROM bookings
WHERE status <> 'cancelled';
```

### `GROUP BY`

```sql
SELECT
    status,
    COUNT(*)                    AS bookings,
    ROUND(AVG(total_fare), 2)   AS avg_fare,
    SUM(advance_amount)         AS advance_collected
FROM bookings
GROUP BY status
ORDER BY bookings DESC;
```

Rules with `ONLY_FULL_GROUP_BY` (on by default):

- Every column in `SELECT` must either be in `GROUP BY` or wrapped in an
  aggregate.
- Exception: columns **functionally dependent** on a grouped unique key. For
  example, grouping by `customers.customer_id` lets you select
  `customers.full_name` because `customer_id` is unique.
- `GROUP BY` treats all `NULL`s as one group.

### `WHERE` vs `HAVING`

```sql
SELECT
    service_type,
    COUNT(*)          AS bookings,
    SUM(total_fare)   AS revenue
FROM bookings
WHERE status <> 'cancelled'          -- filters rows BEFORE grouping
GROUP BY service_type
HAVING COUNT(*) >= 2                 -- filters groups AFTER aggregation
   AND SUM(total_fare) > 5000
ORDER BY revenue DESC;
```

- `WHERE` is faster when it can use an index; it reduces rows early.
- `HAVING` is for conditions on aggregates or grouped values.
- MySQL allows `HAVING` without `GROUP BY` (treats the whole result as one
  group), but it is rarely clearer than a subquery.

### `GROUP_CONCAT`

```sql
SELECT
    customer_id,
    COUNT(*) AS bookings,
    GROUP_CONCAT(DISTINCT service_type ORDER BY service_type SEPARATOR ', ') AS services
FROM bookings
WHERE customer_id IS NOT NULL
GROUP BY customer_id
ORDER BY bookings DESC;
```

Default maximum length is 1024 bytes (`group_concat_max_len`). Increase it per
session if you really need longer strings, but a giant comma list is usually a
sign the app should fetch rows instead.

### `WITH ROLLUP`

```sql
SELECT
    COALESCE(service_type, 'ALL SERVICES') AS service,
    COUNT(*)                               AS bookings,
    SUM(total_fare)                        AS revenue
FROM bookings
WHERE status = 'completed'
GROUP BY service_type WITH ROLLUP;
```

`ROLLUP` adds subtotal rows (and a grand total). It is handy for dashboards and
exports. `COALESCE` labels the grand-total row.

### `COUNT` subtleties

```sql
-- How many bookings have at least one successful payment?
SELECT COUNT(DISTINCT booking_id)
FROM payments
WHERE status = 'success';

-- Wrong: counts payment rows, not bookings
SELECT COUNT(*)
FROM payments
WHERE status = 'success';
```

If one booking has two successful payments, `COUNT(*)` says 2. Decide what one
row represents (the **grain**) before choosing the aggregate.

---

## 8. Real report examples

### Revenue by month

```sql
SELECT
    DATE_FORMAT(pickup_at, '%Y-%m') AS trip_month,
    COUNT(*)                        AS trips,
    SUM(total_fare)                 AS booked_value,
    SUM(advance_amount)             AS advance_collected
FROM bookings
WHERE status <> 'cancelled'
  AND pickup_at >= '2026-09-01'
  AND pickup_at <  '2027-01-01'
GROUP BY trip_month
ORDER BY trip_month;
```

### Status funnel with percentages

```sql
SELECT
    status,
    COUNT(*) AS bookings,
    ROUND(100 * COUNT(*) / (SELECT COUNT(*) FROM bookings), 1) AS pct
FROM bookings
GROUP BY status
ORDER BY bookings DESC;
```

### Average fare by service type, including quote-only rows

```sql
SELECT
    service_type,
    COUNT(*)                                  AS total,
    COUNT(total_fare)                         AS priced,
    COALESCE(ROUND(AVG(total_fare), 2), 0)    AS avg_fare,
    COALESCE(SUM(total_fare), 0)              AS revenue
FROM bookings
GROUP BY service_type
ORDER BY revenue DESC;
```

### Bookings per weekday

```sql
SELECT
    DAYNAME(pickup_at) AS weekday,
    COUNT(*)           AS bookings
FROM bookings
WHERE pickup_at IS NOT NULL
GROUP BY weekday
ORDER BY bookings DESC;
```

`DAYNAME` returns a string, so the order is by count here. If you need calendar
order, group by `WEEKDAY(pickup_at)` (0 = Monday) and display the name.

### Customers with no bookings

```sql
SELECT c.customer_id, c.full_name, c.email
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.customer_id = c.customer_id
);
```

### Bookings with an outstanding balance

```sql
SELECT
    booking_id,
    contact_name,
    total_fare,
    advance_amount,
    balance_due
FROM bookings
WHERE balance_due > 0
ORDER BY balance_due DESC;
```

`balance_due` is the generated column from Module 1. Because it is stored, the
query is simple and fast. Without it you would write
`total_fare - advance_amount > 0`, which is also correct but cannot use a plain
index on `balance_due`.

---

## 9. Common mistakes

1. **`= NULL`** instead of `IS NULL`.
2. **`NOT IN` with a subquery that returns `NULL`.**
3. **`AND`/`OR` without parentheses.**
4. **`BETWEEN` with a date boundary** that silently drops the last day.
5. **`COUNT(column)` when you meant `COUNT(*)`** — nulls disappear.
6. **Filtering an aggregate in `WHERE`.** Use `HAVING`.
7. **Selecting a non-grouped column** and expecting one arbitrary value.
8. **No `ORDER BY` with `LIMIT`.** The order is undefined.
9. **Deep `OFFSET` pagination** on a large table.
10. **Functions on indexed columns** in `WHERE`:
    `WHERE YEAR(pickup_at) = 2026` cannot use a plain index on `pickup_at`.
    Prefer `pickup_at >= '2026-01-01' AND pickup_at < '2027-01-01'`.
11. **Implicit type conversion** (`phone = 9800000001`).
12. **`SELECT *` in a report** and then wondering why it is slow.

---

## 10. Practice tasks

Try these before looking at Module 6 answers.

1. List all confirmed outstation bookings with a total fare above ₹5,000,
   newest pickup first.
2. Count bookings per `service_type`, excluding cancelled ones, with average
   fare rounded to two decimals.
3. Find customers whose email contains `example.com` and whose phone starts
   with `+9198`.
4. Show each booking's `booking_id`, `pickup_at`, and the number of days between
   `created_at` and `pickup_at`. Label the column `lead_days`.
5. For each status, show the number of bookings and the total advance collected.
   Order by count descending.
6. Show the three most expensive non-cancelled bookings, including the
   `contact_name` and `service_type`.
7. Count how many bookings have a `NULL` `drop_location`.
8. Show revenue per month for completed bookings, but only months with more
   than two trips.
9. Find the average rating of active drivers, rounded to two decimals.
10. Show each vehicle's name and the number of bookings assigned to it,
    including vehicles with zero bookings (hint: this needs a `LEFT JOIN`,
    which is the next module — attempt it, then come back).

---

## 11. Quiz

1. What is the logical execution order of a `SELECT`?
2. Why can't you use a column alias in `WHERE`?
3. What does `NULL = NULL` evaluate to in MySQL?
4. Why does `NOT IN (SELECT ...)` sometimes return nothing?
5. What is the difference between `WHERE` and `HAVING`?
6. What does `COUNT(*)` count that `COUNT(col)` does not?
7. Why is `LIMIT 10 OFFSET 100000` slow, and what is the alternative?
8. How do you make a query on a `DATETIME` column return the whole last day of
   a month safely?

<details>
<summary>Answers</summary>

1. `FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`.
2. `WHERE` is evaluated before `SELECT` computes aliases.
3. `NULL` (unknown), not true.
4. If the subquery returns any `NULL`, comparisons become `UNKNOWN`, so no row
   satisfies `NOT IN`. Filter out `NULL`s or use `NOT EXISTS`.
5. `WHERE` filters individual rows before grouping; `HAVING` filters groups
   after aggregation and can use aggregate functions.
6. `COUNT(*)` counts rows, including rows where every column is `NULL`.
   `COUNT(col)` counts only non-`NULL` values in that column.
7. The server must generate and discard the first 100,000 rows. Use keyset
   pagination with `WHERE (sort_key, id) < (last_sort_key, last_id)`.
8. Use a half-open range: `>= '2026-11-01' AND < '2026-12-01'`, not `BETWEEN`.

</details>

---

## Before you move on

- [ ] You can write a query with `WHERE`, `ORDER BY`, and `LIMIT` without help.
- [ ] You can explain `NULL` behaviour in `COUNT`, `AVG`, and `NOT IN`.
- [ ] You can produce a grouped report with `HAVING`.
- [ ] You know why `SELECT *` and deep `OFFSET` are problems.
- [ ] You have run all ten practice tasks (even the join one, even if wrong).

Next: **[03-joins-subqueries-cte-windows.md](03-joins-subqueries-cte-windows.md)**
