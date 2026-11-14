# Module 4 — Schema Design, Indexes, and Performance

**Goal:** design tables that stay correct under load, create indexes that
actually get used, and read `EXPLAIN` well enough to fix a slow query.

> Performance rule #0: **measure first.** A query that feels slow may be fast;
> a query that looks ugly may be fine. `EXPLAIN` and real timings decide.

---

## 1. OLTP vs OLAP (why one schema rarely fits both)

| | OLTP (the app) | OLAP (analytics) |
|---|---|---|
| Workload | many small reads/writes | few large scans/aggregations |
| Rows touched | a few per query | millions |
| Design | normalized, many tables | denormalized, star schema |
| Indexes | narrow, selective, many | fewer, columnar/covering |
| Priority | latency, concurrency | throughput, scan speed |

`royal_travels` is an OLTP schema. A reporting system might copy it nightly
into a warehouse with fact and dimension tables. Do not run heavy analytical
queries against the primary OLTP database if you can avoid it — they compete
for buffer pool and I/O with customer traffic.

---

## 2. Design checklist for a new table

1. What is one row? Write the sentence: "One row = one ______."
2. What uniquely identifies it? Primary key.
3. What real-world rules must always hold? `NOT NULL`, `UNIQUE`, `CHECK`, FK.
4. What are the expected read patterns? Those become indexes.
5. What are the expected write patterns? Too many indexes will hurt them.
6. How large will it get in 1 year / 5 years? Type and index choices depend on it.
7. Does it need history/audit? Add an events table, not 20 boolean columns.
8. Does it need soft delete? `deleted_at` changes every unique index.
9. Is the data money, time, or identity? Use exact/specialized types.
10. Who owns the data? One table should have one clear owner.

### Keys

- **Primary key**: compact, immutable, `NOT NULL`. `BIGINT UNSIGNED
  AUTO_INCREMENT` is a good default.
- **Natural key**: keep as `UNIQUE` (`plate_number`, `email`, `booking_ref`).
- **Foreign key**: same type/signedness as the referenced key; index it.
- **Composite key**: use for junction tables (`booking_id, addon_id`).

Random UUID primary keys hurt InnoDB insert performance because inserts land in
random pages, causing page splits. If you need UUIDs, store `BINARY(16)` and use
`UUID_TO_BIN(uuid, 1)` (time-ordered) or keep the auto-increment key as the
clustered index and put the UUID in a unique secondary column. `CHAR(36)` is
readable but 2.25× larger than binary and slower to compare.

### Constraints are documentation that executes

```sql
CREATE TABLE booking_addons (
    booking_id BIGINT UNSIGNED NOT NULL,
    addon_name VARCHAR(60) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (booking_id, addon_name),
    CONSTRAINT fk_addons_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT chk_addons_price CHECK (price >= 0)
) ENGINE = InnoDB;
```

The database is the last line of defence. Application validation is for user
experience; constraints are for correctness. Keep both.

### Soft delete warning

```sql
-- Looks harmless, breaks every unique constraint:
ALTER TABLE customers ADD COLUMN deleted_at DATETIME NULL;
```

After this, a deleted customer's email still occupies the unique index (and
multiple deleted rows with the same email conflict). Options:

- unique index on `(email, deleted_at)` — but `NULL` allows duplicates, so use
  a sentinel date like `'1970-01-01'` for active rows;
- move deleted rows to an archive table;
- use a `deleted` flag plus a generated column that is `NULL` when deleted,
  and make the unique index on that column.

Decide before you have data, not after.

---

## 3. Choosing types (performance edition)

- **Smaller is faster.** `INT` vs `BIGINT` matters when you have 500M rows and
  indexes in RAM. But do not risk overflow; estimate growth.
- **`NOT NULL` is faster and clearer.** It saves a null bitmap check and makes
  indexes more selective. Use `NULL` only for genuinely optional data.
- **Avoid `VARCHAR(1000)` "just in case".** It affects sort memory and index
  key limits. Use a realistic limit (`VARCHAR(160)` for emails).
- **`DECIMAL` for money**, integer minor units if you need maximum speed.
- **`ENUM` vs lookup table**: enum for developer-controlled, rarely changing
  sets; lookup table for business-editable values (addons, cancellation reasons).
- **`JSON` for flexible attributes**, not for values you filter/join on often.
  Extract hot fields into generated columns and index those (Module 5).
- **`TEXT`/`BLOB` off-page**: fetching `SELECT *` pulls them; select only when
  needed. Consider a separate `booking_notes` table for large text.
- **Timestamps**: `DATETIME` for business wall-clock times, `TIMESTAMP` for
  audit instants (2038 limit). Be explicit about time zones.

---

## 4. Normalization vs denormalization

Normalize first (Module 1). Denormalize only with a reason:

| Reason | Example |
|---|---|
| Historical snapshot | `bookings.total_fare` stays fixed when tariffs change |
| Avoid a hot join | `orders.customer_name` copied for display |
| Reporting speed | nightly `daily_revenue` summary table |
| Search | a denormalized document/index for full-text |

Every duplicated value needs an owner and a refresh strategy (trigger, app
transaction, or scheduled job). Otherwise it drifts and nobody notices until an
invoice is wrong.

### Star schema (for analytics)

```
             dim_date
                │
dim_customer ─ fact_bookings ─ dim_vehicle
                │
             dim_driver
```

- **Fact table**: measurements (fare, advance, trip count) + foreign keys.
- **Dimension tables**: descriptive attributes (customer, vehicle, date).
- Much faster for "revenue by month by service type" than joining a normalized
  OLTP schema repeatedly.

You do not need a warehouse on day one, but recognizing the pattern helps when
the dashboard queries start timing out.

---

## 5. How indexes work (the mental model)

An index is a sorted data structure that lets the engine jump to rows instead of
reading every row. InnoDB uses a **B+ tree**.

### The book analogy

A 1,000-page book without an index: to find "deadlock", read every page.
With an index: go to "D", then "deadlock", then the page number.

A B+ tree is a sorted tree with a high fan-out:

```
                 [ 100 | 400 | 700 ]          root page
                /        |       \
        [10|50]      [200|300]   [500|600]    branch pages
        /   \          /   \        /   \
      leaf leaf      leaf leaf    leaf leaf   leaf pages → rows
```

- Each **page** is 16 KB by default.
- A few levels cover millions of rows (height 3–4 is common).
- Leaf pages are linked, which makes range scans and `ORDER BY` efficient.
- Index lookups cost `O(log n)` page reads instead of `O(n)`.

### Clustered vs secondary indexes

- **Clustered index** = the table itself, stored in primary-key order. InnoDB
  stores the full row in the leaf pages of the primary key.
- **Secondary index** stores the indexed columns **plus the primary key**. To
  fetch other columns, InnoDB does a **bookmark lookup** into the clustered
  index (a second B-tree traversal).
- A **covering index** contains every column the query needs, so no bookmark
  lookup is needed. `EXPLAIN` shows `Using index`.

This is why the primary key is special:

- Small PK → smaller secondary indexes.
- Monotonic PK (`AUTO_INCREMENT`) → inserts append to the right, fewer page
  splits.
- Random PK (UUID) → random inserts, more I/O and fragmentation.

### Index selectivity

Selectivity = how well an index narrows the rows.

```sql
SELECT
    COUNT(DISTINCT status) / COUNT(*)        AS status_selectivity,
    COUNT(DISTINCT customer_id) / COUNT(*)   AS customer_selectivity,
    COUNT(DISTINCT contact_phone) / COUNT(*) AS phone_selectivity
FROM bookings;
```

- High selectivity (close to 1) → few rows per value → good index candidate.
- Low selectivity (`status` with 5 values) → the optimizer may ignore the index
  for a value that matches 80% of rows; a full scan is cheaper.
- Low selectivity is still useful in a **composite** index, especially first
  with a range/sort column after it.

---

## 6. Index types

```sql
-- Primary key (created with the table)
PRIMARY KEY (booking_id)

-- Unique index: also enforces a rule
UNIQUE KEY uq_bookings_ref (booking_ref)

-- Plain secondary index
KEY idx_bookings_customer (customer_id)

-- Composite index: column order matters
KEY idx_bookings_status_created (status, created_at)

-- Prefix index: index only the first N characters of a long string
KEY idx_bookings_name_prefix (contact_name(10))

-- Descending index (MySQL 8 supports real descending storage)
KEY idx_bookings_pickup_desc (pickup_at DESC)

-- Functional index (8.0.13+): index an expression
KEY idx_customers_email_lower ((LOWER(email)))

-- Full-text index (Module 5)
FULLTEXT KEY ft_bookings_notes (notes)
```

Other index features:

| Feature | What it does | When to use |
|---|---|---|
| **Covering index** | Index contains all selected columns | Hot read queries |
| **Composite index** | Multiple columns in one B-tree | Multi-column filters/sorts |
| **Prefix index** | Indexes first N chars | Long text, saves space |
| **Functional index** | Indexes an expression | `LOWER(email)`, `DATE(col)` |
| **Invisible index** | Optimizer ignores it, still maintained | Test removal safely |
| **Full-text** | Word-based search | `MATCH ... AGAINST` |
| **Spatial** | Geometry (`R-tree`) | Maps, distance |
| **Hash** | O(1) equality (MEMORY engine) | Rare; InnoDB has adaptive hash internally |

MySQL 8.0 also has **skip scan** for some queries where the first column of a
composite index is missing from the predicate, but do not rely on it. Design
the index for the query.

### Composite index and the leftmost prefix

Index: `(status, created_at)`.

| Query | Uses index? |
|---|---|
| `WHERE status = 'confirmed'` | yes, first column |
| `WHERE status = 'confirmed' AND created_at > '2026-11-01'` | yes, both |
| `WHERE created_at > '2026-11-01'` | no (first column missing) |
| `WHERE status = 'confirmed' ORDER BY created_at DESC` | yes, also avoids sort |
| `WHERE status > 'confirmed' AND created_at > '2026-11-01'` | first column range; second cannot be a range seek, but may be filtered in the index |

Rule: **equality columns first, then range/sort columns**. If you filter
`status = ? AND service_type = ? ORDER BY created_at`, consider
`(status, service_type, created_at)`, not three separate indexes.

### Covering index example

```sql
-- Index (status, created_at) already contains status, created_at, and the PK
-- booking_id. This query never touches the clustered index:
SELECT booking_id, status, created_at
FROM bookings
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 10;
```

`EXPLAIN` shows `Using index`. Add a column that is not in the index and the
plan changes to a bookmark lookup.

---

## 7. When indexes hurt

Every index:

- takes disk and buffer-pool memory;
- must be updated on every `INSERT`, `UPDATE`, and `DELETE`;
- can confuse the optimizer if statistics are stale;
- slows down bulk loads.

Do not index:

- columns you never filter/sort/join on;
- very low-cardinality columns alone (`status`, `is_active`) unless combined
  with something else;
- wide `TEXT` columns fully (use prefix/full-text);
- every column "just in case".

A table with 10 indexes can be 2–3× slower to write than the same table with 3
well-chosen indexes. Measure your write workload.

---

## 8. Reading `EXPLAIN`

```sql
EXPLAIN
SELECT booking_id, status, created_at
FROM bookings
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 10;
```

Real output from the course database:

```
+----+-------------+----------+------+-----------------------------+---------+------+-------+------+-----------------------------------------------+
| id | select_type | table    | type | key                         | key_len | ref   | rows | Extra                                         |
+----+-------------+----------+------+-----------------------------+---------+------+-------+------+-----------------------------------------------+
|  1 | SIMPLE      | bookings | ref  | idx_bookings_status_created | 1       | const |    8 | Using where; Backward index scan; Using index |
+----+-------------+----------+------+-----------------------------+---------+------+-------+------+-----------------------------------------------+
```

What to look at, in order:

### 1. `type` — how rows are accessed

From best to worst (roughly):

| `type` | Meaning | Good? |
|---|---|---|
| `system` / `const` | at most one row by PK/unique | best |
| `eq_ref` | one row per outer row via unique key | excellent |
| `ref` | index lookup for multiple rows | good |
| `range` | index range scan | good |
| `index` | **full index scan** | okay for small/covering |
| `ALL` | full table scan | often the problem |

`index` is not the same as `range`: it reads the whole index. In the earlier
`YEAR(pickup_at) = 2026` example, MySQL chose `type=index` and scanned all 24
index entries — an index scan, not a seek.

### 2. `key` and `possible_keys`

- `possible_keys`: indexes the optimizer considered.
- `key`: the one it used (`NULL` = none).
- If `possible_keys` has a good index but `key` is `NULL`, the optimizer decided
  a scan is cheaper — often because statistics are stale or the predicate is
  not sargable.

### 3. `rows` and `filtered`

- `rows`: estimated rows examined.
- `filtered`: estimated percentage remaining after the `WHERE` filter.
- `rows × filtered / 100` ≈ rows returned. A big gap often means a missing or
  unusable index.

These are **estimates**. `EXPLAIN ANALYZE` gives actual numbers.

### 4. `Extra` — the story

| Extra | Meaning | Action |
|---|---|---|
| `Using index` | covering index; no row fetch | great |
| `Using where` | filter applied after access | check if index could help |
| `Using index condition` | index condition pushdown | usually fine |
| `Using temporary` | temp table for group/sort/distinct | inspect; may need index |
| `Using filesort` | sort not satisfied by index | add/reshape index for `ORDER BY` |
| `Using join buffer` | no index for join | index the join column |
| `Backward index scan` | descending scan of ascending index | fine |
| `Using MRR` | multi-range read | often good |
| `Impossible WHERE` | optimizer proved no rows | check logic |

`Using temporary; Using filesort` on a small table is harmless. On a large
table it can mean writing millions of rows to disk.

### `EXPLAIN ANALYZE` (MySQL 8.0.18+)

```sql
EXPLAIN ANALYZE
SELECT status, COUNT(*)
FROM bookings
GROUP BY status;
```

Real output:

```
-> Group aggregate: count(0)  (cost=5.05 rows=5) (actual time=0.126..0.158 rows=5 loops=1)
    -> Covering index scan on bookings using idx_bookings_status_created
       (cost=2.65 rows=24) (actual time=0.093..0.126 rows=24 loops=1)
```

This runs the query and shows **actual** rows and time per operation. Look for:

- estimated `rows` vs actual `rows` mismatch (bad statistics);
- operations with high `actual time`;
- `loops` > 1 (a correlated subquery or nested loop running many times).

### `EXPLAIN FORMAT=JSON`

```sql
EXPLAIN FORMAT=JSON
SELECT b.booking_id, v.name
FROM bookings b
JOIN vehicles v ON v.vehicle_id = b.vehicle_id
WHERE b.status = 'confirmed';
```

JSON includes cost estimates, used columns, and whether a join is hash/nested
loop. Use it when the tabular output is not detailed enough.

### The join example

```
| b | ref    | idx_bookings_status_created | 8 | const | Using index condition |
| v | eq_ref | PRIMARY                     | 1 | b.vehicle_id | NULL |
```

Read it inside-out: find confirmed bookings via the status index, then for each
one look up exactly one vehicle by primary key (`eq_ref`). That is a healthy
plan. A missing index on `bookings.vehicle_id` would show `ALL` or a join
buffer instead.

---

## 9. Finding slow queries

### Slow query log

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;           -- seconds
SET GLOBAL log_queries_not_using_indexes = 'ON';  -- careful: noisy
SHOW VARIABLES LIKE 'slow_query_log_file';
```

On managed services (RDS, Cloud SQL) this is usually a configuration option.
Analyse the log with `mysqldumpslow` or Percona's `pt-query-digest`. Look for
queries with high total time, not just high per-call time.

### `performance_schema` and `sys`

```sql
-- Top statements by total latency
SELECT *
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;

-- Indexes that have never been used since the last reset
SELECT * FROM sys.schema_unused_indexes;

-- Indexes that duplicate a prefix of another index
SELECT * FROM sys.schema_redundant_indexes;
```

`sys` is a set of human-friendly views over `performance_schema`. It is
installed by default in MySQL 8.

### `SHOW PROCESSLIST`

```sql
SHOW FULL PROCESSLIST;
```

Find long-running queries, sleeping connections, and lock waits. Kill a runaway
query with `KILL <connection_id>;` after understanding the impact.

### Optimizer statistics

```sql
ANALYZE TABLE bookings;
```

Updates index cardinality estimates. MySQL 8 also supports histograms:

```sql
ANALYZE TABLE bookings UPDATE HISTOGRAM ON status, service_type;
```

Histograms help when data is skewed (for example, 90% of bookings are
`completed`). Revisit them when data distribution changes significantly.

---

## 10. Query optimization: a repeatable workflow

1. **Reproduce** the slow query with realistic data and parameters.
2. **Measure** with `EXPLAIN ANALYZE`; record rows, time, and the plan.
3. **Find the expensive step**: full scan, filesort, temporary table, nested
   loop with many iterations, or a fat join.
4. **Rewrite** for sargability and correct grain.
5. **Index** for the access path (not for every column).
6. **Verify** the plan and timing; test with cold and warm cache if possible.
7. **Check the cost**: write speed, disk, replication, and other queries using
   the same index.

### The rewrites that matter most

#### Make predicates sargable

"Sargable" = the index can be used for a **range seek**.

```sql
-- Bad: function on the indexed column
WHERE YEAR(pickup_at) = 2026

-- Good: half-open range
WHERE pickup_at >= '2026-01-01' AND pickup_at < '2027-01-01'
```

```sql
-- Bad
WHERE total_fare + 100 > 5000
-- Good
WHERE total_fare > 4900
```

```sql
-- Bad: leading wildcard
WHERE contact_name LIKE '%ar%'
-- Good for prefix search
WHERE contact_name LIKE 'Ar%'
-- For contains-search, use FULLTEXT (Module 5)
```

```sql
-- Bad: implicit cast (contact_phone is VARCHAR)
WHERE contact_phone = 9800000001
-- Good
WHERE contact_phone = '9800000001'
```

#### Select only the columns you need

```sql
-- Enables a covering index and avoids reading TEXT columns
SELECT booking_id, status, created_at
FROM bookings
WHERE status = 'confirmed';
```

#### Avoid `OR` across different columns

```sql
-- May use two indexes via index merge, or none
WHERE customer_id = 1 OR driver_id = 2

-- Often better: two indexed queries combined
SELECT ... WHERE customer_id = 1
UNION ALL
SELECT ... WHERE driver_id = 2;
```

Use `UNION ALL` unless duplicates must be removed. Measure both.

#### Pagination

```sql
-- Slow at depth
SELECT ... ORDER BY created_at DESC LIMIT 20 OFFSET 100000;

-- Keyset
SELECT ...
WHERE (created_at, booking_id) < (?, ?)
ORDER BY created_at DESC, booking_id DESC
LIMIT 20;
```

#### Aggregate before joining

```sql
-- Fan-out: one row per payment
SELECT SUM(b.total_fare)
FROM bookings b JOIN payments p ON p.booking_id = b.booking_id;

-- Correct grain
SELECT SUM(b.total_fare)
FROM bookings b
JOIN (
    SELECT booking_id, SUM(amount) AS paid
    FROM payments GROUP BY booking_id
) p ON p.booking_id = b.booking_id;
```

#### Avoid N+1 queries in application code

Bad (conceptually):

```
SELECT * FROM bookings WHERE status = 'confirmed';       -- 1 query
for each booking: SELECT * FROM customers WHERE id = ?;  -- N queries
```

Good:

```sql
SELECT b.*, c.full_name
FROM bookings b
JOIN customers c ON c.customer_id = b.customer_id
WHERE b.status = 'confirmed';
```

Two hundred small queries are often slower than one join because of round-trip
latency. Batch and join.

#### Bulk writes

```sql
-- One round trip, one transaction
INSERT INTO booking_events (booking_id, event_type, notes) VALUES
(1, 'note', 'Called customer'),
(1, 'note', 'Customer confirmed pickup time'),
(2, 'note', 'Driver assigned');
```

For huge imports, `LOAD DATA INFILE` is much faster than thousands of inserts,
but it needs `FILE` privilege and careful validation.

#### Do not count huge tables exactly if you do not need to

`SELECT COUNT(*) FROM bookings` scans an index. On 500M rows it is expensive.
Dashboards often accept an estimate from `information_schema.TABLES` or a
maintained counter table.

#### Delete in chunks

A single `DELETE FROM events WHERE created_at < ...` on millions of rows creates
a huge transaction, long locks, and a massive undo log. Delete in batches
(10k rows), commit between batches, and archive first.

---

## 11. Schema changes on a live database

MySQL 8 supports three `ALTER TABLE` algorithms:

| Algorithm | What happens | Locking |
|---|---|---|
| `INSTANT` | metadata-only change | none for reads/writes |
| `INPLACE` | rebuild in place, concurrent DML allowed | often `LOCK=NONE` |
| `COPY` | copy table to a new file | blocks writes, often reads |

```sql
ALTER TABLE bookings
    ADD INDEX idx_bookings_pickup_status (pickup_at, status),
    ALGORITHM = INPLACE,
    LOCK = NONE;
```

- Not every operation supports `INPLACE`/`NONE`; MySQL returns an error rather
  than silently locking.
- Adding a column is usually `INSTANT`; adding a `FULLTEXT` index is not.
- Even "online" changes take a brief metadata lock at the start/end. A long
  running transaction can block the `ALTER` and then block everything behind it.
- For very large tables, use `gh-ost` or `pt-online-schema-change`: they create
  a shadow table, copy data in chunks, and swap it in.
- Use the **expand/contract** pattern for renames:
  1. add the new column, dual-write;
  2. backfill in batches;
  3. switch reads;
  4. stop writing the old column;
  5. drop it later.
  Never rename a column that old application instances still query.

---

## 12. Partitioning and sharding (when one table is too big)

### Partitioning

Splitting one logical table into physical partitions by a key:

```sql
CREATE TABLE booking_events_2026 (
    event_id   BIGINT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM('created','assigned','status_changed','payment','note') NOT NULL,
    notes      VARCHAR(255),
    created_at DATETIME NOT NULL,
    PRIMARY KEY (event_id, created_at)
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax  VALUES LESS THAN MAXVALUE
);
```

- Queries with a predicate on the partition key can use **partition pruning**.
- Dropping an old partition is instant compared with deleting millions of rows.
- Limitations: every unique/primary key must include the partition column;
  partitioned InnoDB tables cannot have foreign keys; not a substitute for
  indexes.
- Use it for time-based lifecycle (logs, events), not to "fix" a missing index.

### Sharding

Splitting data across separate servers by tenant/region/hash. It solves write
and storage limits but adds enormous application complexity: cross-shard joins,
distributed transactions, rebalancing, and operational overhead. Exhaust
indexing, caching, read replicas, and partitioning first.

---

## 13. Hands-on labs

Run these against `royal_travels`. Use `SOURCE schema.sql` to reset afterwards.

### Lab 1 — full scan vs index seek

```sql
EXPLAIN SELECT booking_id, contact_name
FROM bookings
WHERE contact_name = 'Aarav Sharma';
-- type=ALL, rows=24

CREATE INDEX idx_bookings_contact_name ON bookings (contact_name);

EXPLAIN SELECT booking_id, contact_name
FROM bookings
WHERE contact_name = 'Aarav Sharma';
-- type=ref, rows≈1
```

Then drop it:

```sql
DROP INDEX idx_bookings_contact_name ON bookings;
```

### Lab 2 — leading wildcard

```sql
EXPLAIN SELECT booking_id FROM bookings WHERE contact_name LIKE 'A%';
EXPLAIN SELECT booking_id FROM bookings WHERE contact_name LIKE '%ar%';
```

The first can use an index on `contact_name`; the second cannot. This is why
full-text search exists.

### Lab 3 — composite index and sort

```sql
EXPLAIN
SELECT booking_id, status, created_at
FROM bookings
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 10;
```

Note `Using index` and `Backward index scan`. Now select `contact_name` too, and
watch the covering property disappear.

### Lab 4 — function on a column

```sql
EXPLAIN SELECT booking_id FROM bookings WHERE YEAR(pickup_at) = 2026;
EXPLAIN SELECT booking_id FROM bookings
WHERE pickup_at >= '2026-01-01' AND pickup_at < '2027-01-01';
```

Compare `type` and `rows`. The second can seek; the first scans an index.

### Lab 5 — deep pagination

```sql
EXPLAIN
SELECT booking_id FROM bookings
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;

EXPLAIN
SELECT booking_id FROM bookings
WHERE (created_at, booking_id) < ('2026-11-10 11:25:00', 15)
ORDER BY created_at DESC, booking_id DESC
LIMIT 10;
```

On 24 rows the difference is invisible. On 24 million rows it is the difference
between 20 ms and 20 seconds. Reason about rows examined, not just the toy
timing.

### Lab 6 — find redundant indexes

```sql
SELECT * FROM sys.schema_redundant_indexes;
SELECT * FROM sys.schema_unused_indexes;
```

### Lab 7 — invisible index

```sql
ALTER TABLE bookings ALTER INDEX idx_bookings_status_created INVISIBLE;

EXPLAIN SELECT booking_id FROM bookings
WHERE status = 'confirmed' ORDER BY created_at DESC LIMIT 10;
-- the optimizer no longer sees the index

ALTER TABLE bookings ALTER INDEX idx_bookings_status_created VISIBLE;
```

Invisible indexes are a safe way to test whether an index is still needed:
the index is still maintained (so writes still pay for it), but the optimizer
ignores it. If performance is fine for a full business cycle, drop it.

### Lab 8 — statistics

```sql
ANALYZE TABLE bookings;
SHOW INDEX FROM bookings;
```

`Cardinality` is an estimate of distinct values. It drives the optimizer's
choice between an index and a scan.

---

## 14. Common mistakes

1. **Indexing every column.** Writes slow down and the optimizer gets confused.
2. **Wrong composite order.** `(created_at, status)` does not help
   `WHERE status = ?`.
3. **Wrapping an indexed column in a function.**
4. **Leading wildcard `LIKE '%x%'`** on a large table.
5. **Implicit type casts** in joins and filters.
6. **`SELECT *`** preventing covering indexes.
7. **Assuming `type=index` is good.** It is a full index scan.
8. **Trusting `rows` as exact.** It is an estimate; use `EXPLAIN ANALYZE`.
9. **Adding an index without checking write impact.**
10. **Running `ALTER TABLE` during peak traffic** without a plan.
11. **Using `OFFSET` for deep pagination.**
12. **Not testing with production-sized data.** A plan that is fine on 24 rows
    can be disastrous on 24 million.

---

## 15. Quiz

1. Why does InnoDB store the primary key in every secondary index?
2. What is a covering index, and how do you recognize it in `EXPLAIN`?
3. Why is `(status, created_at)` better than two separate indexes for
   `WHERE status = ? ORDER BY created_at DESC`?
4. What does `type=ALL` mean? When might it still be acceptable?
5. Why is `WHERE YEAR(pickup_at) = 2026` unable to use a normal index?
6. What does `Using filesort` tell you?
7. Why can adding an index make writes slower?
8. When would you use an invisible index?
9. What is the difference between `rows` and `filtered`?
10. Why is `OFFSET 100000` slow, and what is the fix?
11. What is the risk of a random UUID primary key in InnoDB?
12. What should you check before running a large `ALTER TABLE` in production?

<details>
<summary>Answers</summary>

1. A secondary index must be able to find the full row. InnoDB stores the
   primary key as the row locator, then performs a bookmark lookup into the
   clustered index.
2. An index that contains every column the query needs, so no row lookup is
   required. `EXPLAIN` shows `Using index`.
3. A composite index is sorted by `status` first, then `created_at`. For one
   status value, entries are already in `created_at` order, so the index serves
   both the filter and the sort. Two separate indexes would require a scan or
   an index merge plus a sort.
4. A full table scan. Acceptable for very small tables, when most rows match
   anyway, or when the table is tiny enough that an index lookup costs more.
5. The function is applied to every row, so the sorted order of `pickup_at` is
   lost. Rewrite as a range on the bare column.
6. The sort could not be satisfied by an index and MySQL had to sort rows
   separately (possibly on disk).
7. Every index must be updated on insert/update/delete, and it consumes memory
   and disk. More indexes = more write amplification.
8. To test whether an index is still needed without dropping it: the optimizer
   ignores it, but it is still maintained. If performance holds over a full
   cycle, drop it.
9. `rows` estimates how many rows will be examined; `filtered` estimates the
   percentage that survives the `WHERE` condition. Their product approximates
   the rows returned.
10. The server generates and discards all preceding rows. Use keyset pagination
    with a range predicate on the last seen sort key.
11. Random inserts spread across the B-tree, causing page splits, fragmentation,
    and more I/O. Use a monotonic key or `UUID_TO_BIN(uuid, 1)`.
12. Table size, available disk, replication lag, long-running transactions,
    metadata locks, whether the operation supports `ALGORITHM=INPLACE,
    LOCK=NONE`, a rollback plan, and a tested backup.

</details>

---

## Before you move on

- [ ] You can explain clustered vs secondary indexes.
- [ ] You can design a composite index for a filter + sort query.
- [ ] You can read `type`, `key`, `rows`, and `Extra` in `EXPLAIN`.
- [ ] You can list five ways to make a query non-sargable.
- [ ] You have run the labs and compared plans before/after an index.
- [ ] You know why more indexes are not always better.

Next: **[05-transactions-security-ops.md](05-transactions-security-ops.md)**
