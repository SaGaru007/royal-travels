# Module 1 — Foundations

**Goal:** understand what a relational database is, how MySQL stores data, and
how to create tables that cannot hold nonsense.

Time: 3–4 sessions of 45 minutes. Do not skip the typing.

---

## 1. The mental model

A relational database is a set of **tables**. A table is like a spreadsheet
with strict rules:

- Every **column** has one data type (`name` is text, `total_fare` is money).
- Every **row** is one thing: one customer, one booking, one payment.
- Rules called **constraints** reject bad rows (no negative fare, no duplicate
  email, no booking for a customer who does not exist).
- You describe *what you want*, not *how to loop over rows*. The database
  decides how to fetch it. That language is SQL.

Why not just use Excel?

| Excel | MySQL |
|---|---|
| One file, one user at a time | Many users and apps at once |
| No enforced rules | Types, keys, constraints |
| Fine for 10k rows | Billions of rows with indexes |
| No safe concurrent edits | Transactions and crash recovery |
| Hard to query across files | Joins across many tables |

### Tables in this course

```
customers 1 ──── * bookings * ──── 1 vehicles
                       │
                       │ 1
                       │
                       *
                   payments

drivers 1 ──── * bookings
bookings 1 ──── * booking_events
```

Read `1 ──── *` as **one-to-many**: one customer can have many bookings; each
booking belongs to exactly one customer (or none, for a phone lead).

---

## 2. How MySQL is put together

```
Your app / mysql client
        │  (TCP 3306 or a local socket)
        ▼
┌─────────────────────────────────────────────┐
│ MySQL server                                │
│                                             │
│  1. Connection layer  → auth, threads       │
│  2. SQL layer         → parse, optimize,    │
│                         execute             │
│  3. Storage engine    → InnoDB              │
│                         (rows, indexes,     │
│                          transactions)      │
└─────────────────────────────────────────────┘
        │
        ▼
   Data files on disk + redo/undo logs
```

- **Schema** and **database** mean the same thing in MySQL. `royal_travels`
  is a schema containing six tables.
- **InnoDB** is the default storage engine and the one you should use. It gives
  you transactions, row-level locking, foreign keys, and crash recovery.
- **Buffer pool** is a large memory cache of data pages. Reading from RAM is
  thousands of times faster than reading from disk. Most tuning is about
  keeping the working set in memory and not scanning useless rows.
- The **optimizer** chooses an execution plan: which index, which join order.
  `EXPLAIN` shows that plan (Module 4).

SQL command families:

| Family | Commands | Purpose |
|---|---|---|
| DDL — data definition | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | Change structure |
| DML — data manipulation | `INSERT`, `UPDATE`, `DELETE` | Change rows |
| DQL — data query | `SELECT` | Read rows |
| DCL — data control | `GRANT`, `REVOKE` | Permissions |
| TCL — transaction control | `START TRANSACTION`, `COMMIT`, `ROLLBACK` | Group changes atomically |

---

## 3. Connect and look around

```powershell
mysql -u rt_student -p royal_travels
```

Inside the client:

```sql
SELECT VERSION(), DATABASE(), USER();

SHOW DATABASES;
SHOW TABLES;

DESCRIBE bookings;          -- columns, types, keys, defaults
SHOW CREATE TABLE bookings\G -- exact DDL, indexes, foreign keys
SHOW INDEX FROM bookings;
```

`\G` ends a statement with vertical output, which is much easier to read for
wide tables. `\s` shows connection status, `\q` quits, and `source file.sql`
runs a script.

Useful session settings:

```sql
SELECT @@sql_mode;
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY';
```

MySQL's default `sql_mode` already includes `STRICT_TRANS_TABLES` and
`ONLY_FULL_GROUP_BY` in 8.0. Keep them. Strict mode turns silent data
corruption (truncated strings, zero dates) into errors — exactly what you want
while learning and in production.

> **SQL is case-insensitive for keywords**, but table and column names on Linux
> are case-sensitive (`lower_case_table_names=0`). Pick lowercase names with
> underscores and use them consistently. This avoids "works on Windows, fails
> on Linux" bugs.

---

## 4. Create your own database and table

Practise DDL in a separate schema so you never damage the course data:

```sql
CREATE DATABASE IF NOT EXISTS sql_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sql_lab;

CREATE TABLE students (
    student_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL,
    age         TINYINT UNSIGNED,
    joined_on   DATE NOT NULL DEFAULT (CURRENT_DATE),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_students_email (email),
    CONSTRAINT chk_students_age CHECK (age IS NULL OR age BETWEEN 15 AND 100)
) ENGINE = InnoDB;
```

Then:

```sql
INSERT INTO students (full_name, email, age)
VALUES ('Asha Verma', 'asha@example.com', 22),
       ('Bilal Ahmed', 'bilal@example.com', 25);

SELECT * FROM students;
```

Notice:

- We did **not** supply `student_id`; `AUTO_INCREMENT` generated it.
- We did **not** supply `joined_on`, `is_active`, or `created_at`; defaults did.
- `BOOLEAN` is an alias for `TINYINT(1)` in MySQL. `TRUE` is `1`, `FALSE` is `0`.
- `DEFAULT (CURRENT_DATE)` needs parentheses for expression defaults in 8.0.

### Naming rules

- Use `snake_case`, singular table names (`booking`, not `Bookings`) or plural
  consistently. This course uses plural (`bookings`).
- Never use spaces, accents, or reserved words (`order`, `user`, `status` is
  fine but `order` is not).
- Name foreign keys `fk_<table>_<referenced>`, indexes `idx_<table>_<cols>`,
  unique keys `uq_<table>_<cols>`. Future you will be grateful.
- Avoid `tbl_` prefixes. The database is already full of tables.

---

## 5. Data types: choose the smallest correct type

The type is a contract. It controls validation, storage size, comparison
behaviour, and which indexes are possible.

### Numbers

| Type | Bytes | Signed range | Use for |
|---|---:|---|---|
| `TINYINT` | 1 | −128 … 127 | age, rating ×10, small flags |
| `SMALLINT` | 2 | −32,768 … 32,767 | counts that stay small |
| `MEDIUMINT` | 3 | −8.3M … 8.3M | medium IDs |
| `INT` | 4 | −2.1B … 2.1B | most IDs, quantities |
| `BIGINT` | 8 | ±9.2 quintillion | huge IDs, money in paise/cents |
| `DECIMAL(p,s)` | varies | exact | **money**, anything exact |
| `FLOAT` / `DOUBLE` | 4 / 8 | approximate | scientific measurements |

- `INT UNSIGNED` doubles the positive range (0 … 4.29B). Good for IDs that can
  never be negative. But be consistent: a foreign key column must have the
  **same type and signedness** as the column it references.
- **Never store money in `FLOAT`/`DOUBLE`.** `0.1 + 0.2` is not exactly `0.3` in
  binary floating point. Use `DECIMAL(10,2)` for rupees with paise, or store
  integer paise in `BIGINT`.
- `DECIMAL(10,2)` means 10 total digits, 2 after the decimal point →
  max `99,999,999.99`.
- `INT(11)` does **not** mean 11 digits; display width is deprecated. Use `INT`.

### Text

| Type | Storage | Use for |
|---|---|---|
| `CHAR(n)` | fixed `n` characters | exact-length codes: `CHAR(2)` state, `CHAR(36)` UUID |
| `VARCHAR(n)` | up to `n`, variable | names, emails, plates |
| `TEXT` | up to 64 KB | long notes, descriptions |
| `MEDIUMTEXT` | up to 16 MB | articles, logs |
| `LONGTEXT` | up to 4 GB | rare; rethink your design |
| `ENUM('a','b')` | 1–2 bytes | a small, stable set of values |
| `SET('a','b')` | bitmap | multiple flags (rarely worth it) |
| `JSON` | binary JSON | flexible, schemaless attributes |

- `VARCHAR(160)` counts **characters**, not bytes. With `utf8mb4`, one character
  can take 4 bytes. Index key limits are measured in bytes (see Module 4).
- Prefer `VARCHAR` over `TEXT` when you need a default, an index, or sorting.
  `TEXT` values are stored off-page and cannot be fully indexed without a
  prefix length.
- `ENUM` is compact and readable, but:
  - adding/removing values means `ALTER TABLE`;
  - the numeric position is stored, so reordering values is dangerous;
  - an empty string can sneak in as the "error" value in non-strict mode.
  For values that business users will change often, use a lookup table instead.
- `utf8` in MySQL is **not** full UTF-8; it is the old 3-byte `utf8mb3`.
  Always use `utf8mb4` so emoji and many Indian scripts work.

### Dates and times

| Type | Range / meaning | Notes |
|---|---|---|
| `DATE` | `1000-01-01` … `9999-12-31` | birthdays, trip dates |
| `TIME` | `-838:59:59` … `838:59:59` | durations or clock time |
| `DATETIME` | `1000-01-01 00:00:00` … `9999-12-31 23:59:59` | wall-clock time, **no timezone conversion** |
| `TIMESTAMP` | `1970-01-01 00:00:01` UTC … `2038-01-19` | stored as UTC, converted to session time zone |
| `YEAR` | 1901 … 2155 | year only |

- Use `DATETIME` for "the pickup is at 06:00 local time" — a wall-clock value
  that should not shift when the server timezone changes.
- Use `TIMESTAMP` for "when did this row change" audit instants, if you accept
  the 2038 limit and timezone conversion.
- `DATETIME(6)` / `TIMESTAMP(6)` store microseconds. Default precision is 0.
- Never store dates as strings (`'12/11/2026'`). Sorting and date arithmetic
  become wrong and slow.
- MySQL has no separate `TIME ZONE` type. Store the IANA name
  (`'Asia/Kolkata'`) in a `VARCHAR` if you need it, and convert in the app.

### Other useful types

- `BINARY(16)` — compact UUID storage. `UUID_TO_BIN(uuid, 1)` reorders the
  time part for better index locality. `CHAR(36)` is simpler and readable.
- `BLOB` — binary data. Avoid storing large files in the database; use object
  storage and keep a URL.
- `GEOMETRY`, `POINT`, `POLYGON` — spatial data with `SPATIAL INDEX`.
- `BIT(1)` — one bit; usually `BOOLEAN`/`TINYINT(1)` is easier.

### Design rules of thumb

1. Smallest type that safely holds every realistic value.
2. `NOT NULL` unless "unknown" is a genuine state.
3. Money → `DECIMAL`, never `FLOAT`.
4. IDs → integer `AUTO_INCREMENT` (or `BINARY(16)` UUID when distributed
   generation matters).
5. Dates → date/time types, never strings.
6. One fact per column. `phone1, phone2, phone3` is a warning sign.

---

## 6. Constraints: rules the database enforces

```sql
CREATE TABLE demo_constraints (
    id          INT UNSIGNED AUTO_INCREMENT,
    email       VARCHAR(160) NOT NULL,
    age         TINYINT UNSIGNED,
    country     CHAR(2) NOT NULL DEFAULT 'IN',
    price       DECIMAL(10,2) NOT NULL,
    starts_at   DATE NOT NULL,
    ends_at     DATE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_demo_email (email),
    CONSTRAINT chk_demo_age CHECK (age IS NULL OR age >= 18),
    CONSTRAINT chk_demo_dates CHECK (ends_at >= starts_at),
    CONSTRAINT chk_demo_price CHECK (price >= 0)
) ENGINE = InnoDB;
```

| Constraint | Guarantees | Notes |
|---|---|---|
| `PRIMARY KEY` | unique + not null | one per table; usually the clustered index |
| `UNIQUE` | no duplicate values | allows multiple `NULL`s in MySQL |
| `NOT NULL` | value must exist | does not prevent empty string `''` |
| `DEFAULT` | value when omitted | `DEFAULT CURRENT_TIMESTAMP` |
| `CHECK` | expression must be true | enforced since 8.0.16; `NULL` passes |
| `FOREIGN KEY` | referenced row must exist | InnoDB only; needs an index |
| `AUTO_INCREMENT` | generates sequential-ish integers | gaps are normal |

### Primary keys

- Every table should have one. It is how you identify a row.
- **Surrogate key**: meaningless generated number (`booking_id`). Stable,
  compact, ideal for foreign keys.
- **Natural key**: real-world value (`plate_number`, `email`). Meaningful, but
  can change; use a `UNIQUE` constraint instead of making it the primary key.
- **Composite key**: two or more columns (`booking_id, addon_id` in a junction
  table). Common for many-to-many tables.

### Foreign keys

```sql
CREATE TABLE booking_addons (
    booking_id BIGINT UNSIGNED NOT NULL,
    addon_name VARCHAR(60) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (booking_id, addon_name),
    CONSTRAINT fk_addons_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

`ON DELETE` / `ON UPDATE` options:

| Action | Meaning |
|---|---|
| `RESTRICT` (default) | block the change if child rows exist |
| `CASCADE` | delete/update child rows too |
| `SET NULL` | set the child column to `NULL` (column must allow null) |
| `NO ACTION` | same as `RESTRICT` in InnoDB |

In `royal_travels`, deleting a customer sets `bookings.customer_id` to `NULL`
so historical bookings survive. Deleting a booking **cascades** to its payments
and events. Those are deliberate business decisions, not defaults.

> Foreign keys protect correctness but add write-time checks. High-volume
> systems sometimes drop them and enforce relationships in the application.
> For most business applications, keep them. A broken relationship costs far
> more than the check.

### `AUTO_INCREMENT` truth

- IDs are unique and increasing, but **not necessarily contiguous**. Rollbacks,
  failed inserts, bulk inserts, and server restarts consume numbers.
- Never use ID order as business order. Use `created_at` for that.
- `LAST_INSERT_ID()` returns the ID generated by your connection's last insert.
- Reaching the maximum value causes duplicate-key errors. `INT UNSIGNED` is
  usually enough; `BIGINT` for very high-volume event tables.

---

## 7. Changing tables (DDL)

Do these in `sql_lab`, not in `royal_travels`:

```sql
ALTER TABLE students
    ADD COLUMN phone VARCHAR(20) NULL AFTER email;

ALTER TABLE students
    MODIFY COLUMN full_name VARCHAR(150) NOT NULL;

ALTER TABLE students
    RENAME COLUMN phone TO mobile;          -- MySQL 8.0+

ALTER TABLE students
    ADD INDEX idx_students_name (full_name);

ALTER TABLE students
    DROP INDEX idx_students_name;

ALTER TABLE students
    ADD CONSTRAINT chk_students_name CHECK (CHAR_LENGTH(full_name) >= 2);

ALTER TABLE students
    DROP COLUMN mobile;
```

Important details:

- `MODIFY` replaces the whole column definition. If you forget `NOT NULL` or
  `DEFAULT`, you remove them.
- `CHANGE old_name new_name type` renames and retypes in one step.
- Adding an index to a large table can lock or rebuild it. MySQL 8 supports
  `ALGORITHM=INPLACE, LOCK=NONE` for many operations, but not all. Test on a
  copy and read the docs for your version.
- `ALTER TABLE ... ADD COLUMN` is `INSTANT` in 8.0 for most cases.
- Every schema change should be scripted, reviewed, and applied the same way in
  every environment. "I changed it in Workbench" is not a deployment process.

### `DELETE` vs `TRUNCATE` vs `DROP`

| | `DELETE FROM t` | `TRUNCATE TABLE t` | `DROP TABLE t` |
|---|---|---|---|
| Removes | some/all rows | all rows | rows **and** table |
| `WHERE` | yes | no | no |
| Transactional | yes | no (implicit commit) | no |
| `AUTO_INCREMENT` | keeps counter | resets to 1 | gone |
| Speed | slow for big tables | fast | fast |
| Triggers | fire | do not fire | n/a |

`DELETE FROM bookings;` can be rolled back. `TRUNCATE` cannot. On production,
always run a `SELECT` with the same `WHERE` first, and consider a soft delete
(`deleted_at`) when history matters.

---

## 8. Normalization: stop repeating yourself

Normalization is the process of removing redundancy so one fact lives in one
place. It prevents update anomalies.

### A bad design

| booking_id | customer_name | customer_phone | vehicle_name | driver_name | driver_phone | addons |
|---|---|---|---|---|---|---|
| 1 | Aarav | 98000… | Sedan | Ramesh | 99000… | "child seat, water" |
| 2 | Aarav | 98000… | Innova | Suresh | 99000… | "water" |

Problems:

- Aarav changes his phone → update every booking, or leave inconsistent data.
- Cannot store a customer before their first booking (insert anomaly).
- Deleting the last booking deletes the only record of the customer (delete anomaly).
- `addons` holds a comma-separated list → hard to query, count, or index (not 1NF).

### First normal form (1NF): atomic values

Each column holds **one** value. No comma-separated lists, no repeating groups.

Bad: `addons = 'child seat, water'`
Good: a separate `booking_addons` table with one row per addon.

### Second normal form (2NF): no partial dependency

Applies when the primary key is composite. Every non-key column must depend on
the **whole** key, not part of it.

If the key is `(booking_id, vehicle_id)` and `vehicle_name` depends only on
`vehicle_id`, move vehicle data to a `vehicles` table.

### Third normal form (3NF): no transitive dependency

Non-key columns must not depend on other non-key columns.

If `driver_phone` depends on `driver_id`, and `driver_id` is not the key,
move phone to `drivers`.

> The common summary: **every non-key attribute depends on the key, the whole
> key, and nothing but the key.**

### The course schema is 3NF

- `customers` owns customer facts.
- `vehicles` owns fleet facts.
- `drivers` owns driver facts.
- `bookings` stores only booking facts plus foreign keys.
- `payments` is a separate one-to-many table.
- `booking_events` is an audit log.

### When to denormalize

Normalization is the default, not a religion. Deliberate duplication is valid
when:

- reads vastly outnumber writes and joins are too slow (reporting tables,
  materialized summaries);
- you need a historical snapshot (`bookings.total_fare` must not change when
  the vehicle tariff changes — that is why the fare is copied, not calculated
  from the current tariff);
- analytics uses a star schema (fact table + dimension tables).

The rule: **denormalize on purpose, document it, and make one process
responsible for keeping the copies correct.**

---

## 9. The practice schema, table by table

Open `schema.sql` alongside this section.

### `customers`
One row per website account. `email` is unique. `password_hash` stores a hash,
never a password. `phone` is indexed because the app looks customers up by
phone.

### `vehicles`
One row per fleet vehicle. `plate_number` is a natural unique key.
`status` is an `ENUM` because the set is small and controlled by developers.
`tags` is `JSON` because it is a flexible display list, not something we filter
on heavily. `tariff_*` are `DECIMAL` because they are money.

### `drivers`
`license_number` and `phone` are unique. `rating` is `DECIMAL(2,1)` so `4.8`
is exact. `status` includes `on_leave`, which matters for assignment queries.

### `bookings`
The center of the schema.

- `booking_ref` is a UUID in `CHAR(36)` for public tracking links. The internal
  `booking_id` is a compact `BIGINT` used by foreign keys.
- `customer_id` is nullable: phone leads have no account.
- `vehicle_id` and `driver_id` are nullable until assignment.
- `balance_due` is a **generated column**: the database computes
  `total_fare - advance_amount` and stores it. It can never drift.
- `created_at` and `updated_at` are maintained by defaults.
- Indexes exist for the queries the app actually runs (customer, vehicle,
  driver, pickup time, status + created time).

### `payments`
A booking can have several payments (advance, balance, refund). `paid_at` is
nullable because a payment can be pending. The foreign key cascades on delete.

### `booking_events`
An append-only audit trail. This is how you answer "what happened to this
booking?" months later. Never update or delete audit rows in normal operation.

---

## 10. Common beginner mistakes

1. **Using `SELECT *` in application code.** Column order and count change when
   the schema changes, and you fetch data you do not need.
2. **Storing money as `FLOAT`.** Rounding errors appear in invoices.
3. **Using `VARCHAR(255)` for everything.** It hides intent and can waste index
   space. Choose a realistic limit.
4. **No primary key.** Duplicate rows become impossible to fix reliably.
5. **Making email the primary key.** Emails change. Use a surrogate ID plus a
   unique constraint.
6. **Assuming `AUTO_INCREMENT` has no gaps.** It does, and that is fine.
7. **Storing dates as strings.** `'2026-12-01'` sorts fine until someone writes
   `'01/12/2026'`.
8. **Not using `utf8mb4`.** Emoji and some scripts break.
9. **Adding indexes "just in case".** Every index slows writes and uses memory.
10. **Editing production schema by hand without a script.** You will forget one
    environment.

---

## 11. Quiz

Answer before scrolling.

1. Why is `DECIMAL` preferred over `DOUBLE` for fares?
2. What is the difference between `VARCHAR(20)` and `CHAR(20)`?
3. Does `UNIQUE` allow two `NULL` values in MySQL?
4. What does `ON DELETE SET NULL` require of the child column?
5. Name the three normalization forms and one sentence for each.
6. Why is `TIMESTAMP` limited to 2038, and when would you still choose it?
7. What is a generated column, and why is `balance_due` one?
8. Why is `SELECT *` risky in production code?

<details>
<summary>Answers</summary>

1. `DECIMAL` stores exact base-10 values; `DOUBLE` is binary floating point and
   introduces rounding errors. Money must be exact.
2. `CHAR(20)` always uses 20 characters (padded with spaces on retrieval rules);
   `VARCHAR(20)` uses only what is needed plus 1–2 bytes of length. `CHAR` is for
   fixed codes, `VARCHAR` for variable text.
3. Yes. In MySQL, `UNIQUE` permits multiple `NULL`s because `NULL` means
   "unknown" and two unknowns are not considered equal.
4. The child column must be nullable (`NULL` allowed). Otherwise the delete
   fails.
5. 1NF: atomic values, no repeating groups. 2NF: no partial dependency on part
   of a composite key. 3NF: no transitive dependency between non-key columns.
6. `TIMESTAMP` is stored as a 32-bit Unix time value in UTC and converted per
   session. It is good for audit instants but cannot represent dates beyond
   2038-01-19. Use `DATETIME` for far-future business dates.
7. A column whose value is computed by the database from other columns.
   `balance_due` ensures the outstanding amount is always consistent with
   `total_fare - advance_amount`; application code cannot forget to update it.
8. It couples code to column order/count, fetches unnecessary data (more I/O,
   no covering index), and breaks when columns are added or renamed.

</details>

---

## Before you move on

- [ ] You can create a database and a table with PK, unique, check, and FK.
- [ ] You can explain why the course schema is split into six tables.
- [ ] You know the difference between `DELETE`, `TRUNCATE`, and `DROP`.
- [ ] You can name the correct type for money, dates, flags, and long text.
- [ ] You have typed every example, not copied it.

Next: **[02-querying.md](02-querying.md)**
