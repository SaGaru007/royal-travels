# Module 5 — Transactions, Programmability, Security, and Operations

**Goal:** make changes safely when several users act at once, use MySQL's
server-side features wisely, and keep the data secure and recoverable.

This module is long. Treat each numbered section as one study session.

```sql
USE royal_travels;
```

---

## 1. Transactions and ACID

A transaction groups several statements into one **all-or-nothing** unit.

```sql
START TRANSACTION;

UPDATE bookings
SET status = 'cancelled', trip_stage = 'unassigned'
WHERE booking_id = 12;

INSERT INTO booking_events (booking_id, event_type, notes)
VALUES (12, 'status_changed', 'Cancelled by customer');

COMMIT;
```

If the server crashes between the two statements, neither change survives. If
the second statement fails, you can `ROLLBACK` and the first is undone.

### ACID

| Property | Meaning | How InnoDB delivers it |
|---|---|---|
| **Atomicity** | all statements or none | undo log |
| **Consistency** | constraints remain true | constraints + application logic |
| **Isolation** | concurrent transactions do not corrupt each other | MVCC + locks |
| **Durability** | committed data survives a crash | redo log, flushed to disk |

Important nuance: the database guarantees **consistency of constraints**, not
business consistency. It cannot know that "a cancelled booking must have a
refund". That is your application's job, often enforced with a transaction plus
a constraint.

### Autocommit

MySQL runs in `autocommit = 1` mode by default: every statement is its own
transaction.

```sql
SELECT @@autocommit;        -- 1

SET autocommit = 0;         -- now you must COMMIT
UPDATE ...;
COMMIT;
```

Most application frameworks manage this for you. Understand it anyway: a
`COMMIT` you did not expect (or a missing one) explains many "the data is
there, then it isn't" bugs.

### Savepoints

```sql
START TRANSACTION;

UPDATE bookings SET status = 'contacted' WHERE booking_id = 12;
SAVEPOINT after_status;

DELETE FROM payments WHERE booking_id = 12;
ROLLBACK TO SAVEPOINT after_status;   -- undo only the delete

COMMIT;
```

### Statements that implicitly commit

DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), `LOCK TABLES`, and some
administrative statements cause an implicit commit. You cannot roll back a
`TRUNCATE`. Do not mix schema changes into a business transaction.

---

## 2. Isolation levels and the anomalies they prevent

When two transactions run at once, three classic anomalies can occur:

| Anomaly | What happens |
|---|---|
| **Dirty read** | T1 reads data written by T2 that T2 has not committed (and may roll back) |
| **Non-repeatable read** | T1 reads a row, T2 updates it, T1 reads again and gets a different value |
| **Phantom read** | T1 runs a range query, T2 inserts a matching row, T1 re-runs and sees a new row |

SQL standard isolation levels:

| Level | Dirty read | Non-repeatable read | Phantom |
|---|---|---|---|
| `READ UNCOMMITTED` | possible | possible | possible |
| `READ COMMITTED` | prevented | possible | possible |
| `REPEATABLE READ` | prevented | prevented | possible* |
| `SERIALIZABLE` | prevented | prevented | prevented |

`*` InnoDB's default `REPEATABLE READ` prevents phantoms for **consistent
(non-locking) reads** using an MVCC snapshot. For locking reads it uses
next-key locks. The standard's definition is about locking reads, so the table
is a simplification — but the practical behaviour is what matters.

```sql
SELECT @@transaction_isolation;   -- REPEATABLE-READ

SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
-- ...
COMMIT;
```

How to choose:

- **REPEATABLE READ** (default): a transaction sees a stable snapshot; good for
  reports and multi-step reads. Costs more undo history and gap locks.
- **READ COMMITTED**: each statement sees the latest committed data; fewer gap
  locks, less contention, common for high-throughput web apps. But the same
  `SELECT` can return different rows within one transaction.
- **SERIALIZABLE**: converts plain `SELECT` into `SELECT ... FOR SHARE`; safest
  and slowest. Rarely needed.
- **READ UNCOMMITTED**: almost never. Dirty reads are as bad as they sound.

Set the level for the **whole server** in `my.cnf` (`transaction-isolation`),
or per session/transaction as above.

---

## 3. MVCC: how readers avoid blocking writers

InnoDB keeps multiple versions of a row using:

- a hidden transaction ID (`DB_TRX_ID`),
- a pointer to the previous version in the **undo log** (`DB_ROLL_PTR`),
- a **read view** that says which transactions are visible.

A consistent read uses the version visible to its snapshot. Readers do not
block writers, and writers do not block readers. That is MVCC.

```sql
-- Session A
START TRANSACTION;
SELECT status, total_fare FROM bookings WHERE booking_id = 1;
-- sees the snapshot as of the first read

-- Session B
UPDATE bookings SET total_fare = 9999 WHERE booking_id = 1;
COMMIT;

-- Session A again
SELECT status, total_fare FROM bookings WHERE booking_id = 1;
-- still sees the old value (REPEATABLE READ)
COMMIT;
```

The cost: old versions accumulate in the undo log while a transaction stays
open. A forgotten `COMMIT` can keep millions of row versions alive, bloating
disk and slowing every query. **Monitor long transactions.**

```sql
SELECT trx_id, trx_state, trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds,
       trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

---

## 4. Locking

### Row locks

```sql
START TRANSACTION;

-- Exclusive lock: others cannot update/delete these rows until COMMIT
SELECT * FROM bookings WHERE booking_id = 1 FOR UPDATE;

-- Shared lock: others can read but not update
SELECT * FROM bookings WHERE booking_id = 1 FOR SHARE;

COMMIT;
```

- `FOR UPDATE` is for read-modify-write sequences.
- `FOR SHARE` is for "do not let this change while I use it".
- Plain `SELECT` takes no locks (MVCC snapshot).
- Locks are held until `COMMIT` or `ROLLBACK`.

### Lock waits

```sql
SELECT @@innodb_lock_wait_timeout;   -- 50 seconds by default

SELECT * FROM bookings WHERE booking_id = 1 FOR UPDATE NOWAIT;
-- fails immediately with error 3572 if locked

SELECT * FROM bookings WHERE booking_id = 1 FOR UPDATE SKIP LOCKED;
-- skips locked rows instead of waiting
```

`SKIP LOCKED` is the standard way to build a job queue:

```sql
START TRANSACTION;
SELECT event_id
FROM booking_events
WHERE event_type = 'note'
ORDER BY event_id
LIMIT 10
FOR UPDATE SKIP LOCKED;
-- process these rows, then update/delete them
COMMIT;
```

### Which rows get locked?

InnoDB locks **index records**, not abstract rows. If a `WHERE` condition cannot
use an index, it may scan and lock far more rows than you expect. This is a
strong practical reason to index the columns used in `FOR UPDATE` predicates.

### Gap locks and next-key locks

Under `REPEATABLE READ`, a range query takes **next-key locks** = record locks +
gap locks. Gaps prevent other transactions from inserting into the range, which
helps avoid phantoms but increases deadlock potential.

```sql
-- Locks the range and the gaps around it
SELECT * FROM bookings
WHERE pickup_at BETWEEN '2026-12-01' AND '2026-12-31'
FOR UPDATE;
```

Under `READ COMMITTED`, gap locks are mostly disabled (except for foreign-key
and duplicate-key checks), which is one reason web apps often prefer it.

### Table-level intention locks

InnoDB sets intention locks at the table level to signal that a transaction
holds row locks. You usually do not manage these directly. `LOCK TABLES` is a
blunt instrument; avoid it in applications.

---

## 5. Deadlocks

A deadlock happens when T1 holds lock A and waits for B, while T2 holds B and
waits for A. InnoDB detects the cycle and rolls back one transaction (the
"victim") with:

```
ERROR 1213 (40001): Deadlock found when trying to get lock;
try restarting transaction
```

Inspect the last deadlock:

```sql
SHOW ENGINE INNODB STATUS\G
-- look for "LATEST DETECTED DEADLOCK"
```

### Preventing deadlocks

1. **Access tables/rows in a consistent order.** Always lock the booking before
   the payment, never the reverse.
2. **Keep transactions short.** Do not call external APIs, send emails, or wait
   for user input inside a transaction.
3. **Use indexes** for locking predicates so you lock few rows.
4. **Use the lowest isolation level that is correct** (`READ COMMITTED` reduces
   gap locks).
5. **Retry on deadlock** with backoff. Deadlocks are normal under concurrency;
   a transaction that is safe to retry should be retried.

Pseudo-code for a retry:

```
for attempt in 1..3:
    try:
        BEGIN
        ... work ...
        COMMIT
        break
    catch Deadlock (1213) or LockWaitTimeout (1205):
        ROLLBACK
        sleep(random 50-200ms * attempt)
```

Only retry if the transaction is **idempotent** (or you use an idempotency key).
Retrying a payment charge without one can charge twice.

---

## 6. A real race: double-booking

Two customers try to book the same vehicle at the same time.

### Attempt 1 — check then insert (broken)

```
T1: SELECT ... WHERE vehicle_id=3 AND pickup_at='2026-12-01 06:00'  -- no rows
T2: SELECT ... WHERE vehicle_id=3 AND pickup_at='2026-12-01 06:00'  -- no rows
T1: INSERT booking
T2: INSERT booking            -- both succeed: double-booked
```

### Attempt 2 — `SELECT ... FOR UPDATE` (better, but subtle)

```sql
START TRANSACTION;
SELECT booking_id
FROM bookings
WHERE vehicle_id = 3
  AND pickup_at = '2026-12-01 06:00:00'
FOR UPDATE;
-- if no row, insert
INSERT INTO bookings (...) VALUES (...);
COMMIT;
```

If the predicate uses an index, InnoDB takes gap locks on the empty range. Two
transactions can both hold compatible gap locks and then both try to insert,
causing a deadlock — one rolls back, but the other still inserted. It prevents
the double-booking only because the deadlock victim fails. Relying on that is
fragile.

### Attempt 3 — a unique constraint on the reservable unit (robust)

Model the thing you are reserving as a row:

```sql
CREATE TABLE vehicle_slots (
    vehicle_id  INT UNSIGNED NOT NULL,
    slot_start  DATETIME NOT NULL,
    booking_id  BIGINT UNSIGNED NULL,
    PRIMARY KEY (vehicle_id, slot_start),
    CONSTRAINT fk_slots_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles (vehicle_id)
) ENGINE = InnoDB;
```

Claim a slot atomically:

```sql
INSERT INTO vehicle_slots (vehicle_id, slot_start, booking_id)
VALUES (3, '2026-12-01 06:00:00', 18)
ON DUPLICATE KEY UPDATE
    booking_id = IF(vehicle_slots.booking_id IS NULL,
                    18,
                    vehicle_slots.booking_id);
-- ROW_COUNT(): 1 = inserted a new slot
--              2 = claimed an existing free slot
--              0 = already taken (no change)
```

If your slots are pre-created with `booking_id = NULL`, the simpler conditional
`UPDATE` below is easier to reason about. The `INSERT ... ON DUPLICATE KEY`
version is useful when slots are created on demand.

Or, when the slot row already exists:

```sql
UPDATE vehicle_slots
SET booking_id = 18
WHERE vehicle_id = 3
  AND slot_start = '2026-12-01 06:00:00'
  AND booking_id IS NULL;

SELECT ROW_COUNT();   -- 1 = won, 0 = lost
```

The database's unique constraint is the final arbiter. **Prefer constraints
over application-level checks** for invariants that must never break.

For payments, use an idempotency key:

```sql
ALTER TABLE payments
    ADD COLUMN provider_payment_id VARCHAR(80) NULL,
    ADD UNIQUE KEY uq_payments_provider (provider_payment_id);
```

A retried request with the same provider ID cannot create a second payment.

### Atomic updates beat read-modify-write

```sql
-- Bad: two concurrent requests both read 2000 and both write 2500
SELECT advance_amount FROM bookings WHERE booking_id = 2;
UPDATE bookings SET advance_amount = 2500 WHERE booking_id = 2;

-- Good: the database does the arithmetic atomically
UPDATE bookings
SET advance_amount = advance_amount + 500
WHERE booking_id = 2;

-- Optimistic concurrency: only update if nobody changed it
UPDATE bookings
SET advance_amount = 2500, updated_at = NOW()
WHERE booking_id = 2 AND advance_amount = 2000;
-- ROW_COUNT() = 0 means someone else won; re-read and retry
```

---

## 7. Views

A view is a named stored query. It does not store data (unless you build a
summary table manually).

```sql
CREATE OR REPLACE VIEW v_booking_summary AS
SELECT
    b.booking_id,
    b.booking_ref,
    b.contact_name,
    c.full_name                       AS account_name,
    v.name                            AS vehicle,
    d.full_name                       AS driver,
    b.service_type,
    b.pickup_at,
    b.status,
    b.payment_status,
    b.total_fare,
    COALESCE(p.paid, 0)               AS paid,
    b.total_fare - COALESCE(p.paid, 0) AS outstanding
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
SELECT * FROM v_booking_summary WHERE outstanding > 0;
```

Benefits:

- hides a complicated join from report authors;
- enforces a consistent definition of "outstanding";
- can restrict columns for a read-only user.

Caveats:

- A view is not a materialized view. Every query re-runs the underlying SQL.
- Deeply nested views can produce terrible plans. Inspect with `EXPLAIN`.
- `ALGORITHM=MERGE` (default where possible) merges the view into the outer
  query; `TEMPTABLE` materializes it. Use `TEMPTABLE` only when necessary.
- `SECURITY DEFINER` views run with the creator's privileges. That is powerful
  and dangerous; set it deliberately.

Updatable views:

```sql
CREATE VIEW v_confirmed_bookings AS
SELECT booking_id, contact_name, status, total_fare
FROM bookings
WHERE status = 'confirmed'
WITH CHECK OPTION;
```

`WITH CHECK OPTION` rejects inserts/updates that would make the row invisible
through the view (for example, changing `status` to `cancelled`). This is a
useful guard.

For expensive dashboards, create a **summary table** refreshed by an event or a
scheduled job. MySQL has no native materialized views.

---

## 8. Stored procedures and functions

Server-side code can reduce round trips and centralize rules. It also adds a
second programming language to your system, so use it deliberately.

### Procedure with a transaction and validation

```sql
DELIMITER //

CREATE PROCEDURE assign_driver (
    IN p_booking_id BIGINT UNSIGNED,
    IN p_driver_id  INT UNSIGNED
)
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
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found';
    ELSEIF v_status = 'cancelled' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot assign a cancelled booking';
    ELSE
        UPDATE bookings
        SET driver_id = p_driver_id,
            trip_stage = 'assigned'
        WHERE booking_id = p_booking_id;

        INSERT INTO booking_events (booking_id, event_type, notes)
        VALUES (p_booking_id, 'assigned',
                CONCAT('Driver ', p_driver_id, ' assigned'));
    END IF;

    COMMIT;
END //

DELIMITER ;
```

Call it:

```sql
CALL assign_driver(12, 1);
```

`DELIMITER //` is a **client** command, not SQL. It tells the `mysql` CLI where
the procedure body ends so the semicolons inside the body are not executed
prematurely. Application drivers send the `CREATE PROCEDURE` statement without
`DELIMITER`.

Key syntax:

- `IN`, `OUT`, `INOUT` parameters.
- `DECLARE` variables at the top of a block.
- `IF ... THEN ... ELSEIF ... ELSE ... END IF;`
- `CASE`, `WHILE`, `REPEAT`, `LOOP`, `LEAVE`.
- `SIGNAL SQLSTATE '45000'` raises a custom error; `RESIGNAL` re-raises.
- `DECLARE EXIT HANDLER FOR SQLEXCEPTION` rolls back and rethrows.
- Cursors: `DECLARE`, `OPEN`, `FETCH`, `CLOSE`; prefer set-based SQL.

### Function

```sql
DELIMITER //

CREATE FUNCTION booking_balance (p_booking_id BIGINT UNSIGNED)
RETURNS DECIMAL(10,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_balance DECIMAL(10,2) DEFAULT 0;
    SELECT balance_due INTO v_balance
    FROM bookings
    WHERE booking_id = p_booking_id;
    RETURN COALESCE(v_balance, 0);
END //

DELIMITER ;

SELECT booking_id, booking_balance(booking_id) AS balance
FROM bookings
WHERE booking_id IN (1, 2, 11);
```

Functions return one value and can be used in `SELECT`. Procedures cannot.
Functions must be declared `DETERMINISTIC`, `NO SQL`, or `READS SQL DATA`
correctly, especially with binary logging enabled.

### When to use stored code

Good uses:

- a rule that must be enforced no matter which app writes;
- a multi-step operation that benefits from running near the data;
- scheduled maintenance;
- reducing network round trips for a chatty operation.

Poor uses:

- business logic that changes often (harder to test/deploy/version);
- complex string/date manipulation better served by the application language;
- anything that hides a slow query from your normal code review.

Most teams keep the schema and simple invariants in SQL, and business workflows
in application code. Both are valid; be consistent.

---

## 9. Triggers

A trigger runs automatically on `INSERT`, `UPDATE`, or `DELETE`.

```sql
DELIMITER //

CREATE TRIGGER trg_bookings_status_audit
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO booking_events (booking_id, event_type, notes)
        VALUES (
            NEW.booking_id,
            'status_changed',
            CONCAT('Status: ', OLD.status, ' -> ', NEW.status)
        );
    END IF;
END //

DELIMITER ;
```

Test it:

```sql
UPDATE bookings SET status = 'contacted' WHERE booking_id = 12;
SELECT * FROM booking_events WHERE booking_id = 12 ORDER BY event_id DESC;
```

Then remove it so later exercises are not surprised:

```sql
DROP TRIGGER trg_bookings_status_audit;
```

Rules and dangers:

- `BEFORE` triggers can modify `NEW`; `AFTER` triggers cannot.
- A trigger cannot modify the table that fired it (no recursion on the same
  table), but it can modify other tables.
- Triggers are invisible in application code. A developer can insert one row
  and accidentally create five more.
- Triggers fire per row, which slows bulk writes.
- Errors inside a trigger abort the statement.
- Use them for audit, simple invariants, and derived values that must never be
  forgotten. Do not hide core business workflows in them.

---

## 10. Events (scheduled jobs)

```sql
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS ev_purge_old_events
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
    DELETE FROM booking_events
    WHERE created_at < NOW() - INTERVAL 2 YEAR
    LIMIT 10000;
```

- `SHOW EVENTS;` lists them; `ALTER EVENT ... DISABLE;` pauses one.
- Events run inside the server, so they run even if the app is down.
- They require the `EVENT` privilege.
- Keep them idempotent, batched, and logged. A giant nightly `DELETE` can lock
  tables and blow up the undo log.
- In a replicated setup, be careful about which server runs events
  (`event_scheduler` on replicas can duplicate work).

Alternatives: a cron job, a queue worker, or your application's scheduler. Use
events when the job is purely database maintenance.

---

## 11. JSON

MySQL 8 stores JSON in a binary format and validates it on insert.

```sql
SELECT
    vehicle_id,
    tags,
    JSON_EXTRACT(tags, '$[0]')        AS first_tag_json,
    tags ->> '$[0]'                   AS first_tag_text,
    JSON_LENGTH(tags)                 AS tag_count
FROM vehicles;
```

Operators:

| Operator | Meaning |
|---|---|
| `->` | extract and keep JSON type |
| `->>` | extract and unquote to text |
| `JSON_EXTRACT(doc, path)` | same as `->` |
| `JSON_UNQUOTE(...)` | remove JSON quotes |
| `JSON_CONTAINS(doc, value)` | does it contain a value? |
| `JSON_KEYS(doc)` | object keys |
| `JSON_ARRAYAGG(col)` | aggregate rows into a JSON array |
| `JSON_OBJECT(k, v, ...)` | build an object |
| `JSON_TABLE(...)` | turn JSON into relational rows |

```sql
SELECT v.vehicle_id, j.tag
FROM vehicles v,
JSON_TABLE(v.tags, '$[*]' COLUMNS (tag VARCHAR(40) PATH '$')) AS j
WHERE j.tag LIKE '%AC%';
```

Indexing JSON:

```sql
-- Functional index on a hot expression (8.0.13+)
CREATE INDEX idx_vehicles_first_tag
ON vehicles ((CAST(tags->>'$[0]' AS CHAR(40))));

-- Multi-valued index for array membership (8.0.17+)
CREATE INDEX idx_vehicles_tags
ON vehicles ((CAST(tags AS CHAR(40) ARRAY)));

SELECT vehicle_id, name
FROM vehicles
WHERE JSON_CONTAINS(tags, '"4x4"');
```

Guidelines:

- Use JSON for optional, variable attributes (display tags, provider payloads).
- Promote frequently filtered/joined fields to real columns.
- Validate shape in the application; MySQL only guarantees valid JSON syntax.
- JSON columns cannot be compared/sorted as easily as native types, and
  `SELECT *` on a large JSON document is expensive.

---

## 12. Full-text search

`LIKE '%term%'` cannot use a normal index. For word search, use `FULLTEXT`.

```sql
ALTER TABLE bookings
    ADD FULLTEXT INDEX ft_bookings_notes (notes);

SELECT
    booking_id,
    notes,
    MATCH(notes) AGAINST ('airport' IN NATURAL LANGUAGE MODE) AS score
FROM bookings
WHERE MATCH(notes) AGAINST ('airport' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC;
```

Modes:

```sql
-- Natural language: relevance-ranked, ignores stopwords and short tokens
MATCH(notes) AGAINST ('airport transfer' IN NATURAL LANGUAGE MODE)

-- Boolean: +must, -must not, "exact phrase", wildcard*
MATCH(notes) AGAINST ('+airport -cancelled' IN BOOLEAN MODE)

-- Query expansion: also find related terms
MATCH(notes) AGAINST ('airport' WITH QUERY EXPANSION)
```

Details:

- InnoDB full-text indexes are maintained on insert/update (not free).
- Default minimum token length is 3 (`innodb_ft_min_token_size`). Shorter words
  are ignored.
- Stopwords (common words like "the") are ignored.
- For Chinese/Japanese/Korean, use the `ngram` parser.
- Full-text is not a replacement for a search engine (Elasticsearch/OpenSearch)
  when you need fuzzy matching, faceting, or language analysis.

---

## 13. Security

### Users, hosts, and privileges

```sql
CREATE USER 'rt_app'@'10.0.0.%' IDENTIFIED BY 'use-a-secret-manager';

GRANT SELECT, INSERT, UPDATE, DELETE
    ON royal_travels.* TO 'rt_app'@'10.0.0.%';

GRANT EXECUTE
    ON PROCEDURE royal_travels.assign_driver TO 'rt_app'@'10.0.0.%';

SHOW GRANTS FOR 'rt_app'@'10.0.0.%';
```

Principles:

1. **One user per application/environment.** Never share `root`.
2. **Least privilege.** The API usually needs `SELECT, INSERT, UPDATE, DELETE`
   on one schema — not `ALL PRIVILEGES`, not `FILE`, not `SUPER`.
3. **Restrict hosts.** `'rt_app'@'10.0.0.%'` is better than `'%'`.
4. **Separate migration and runtime users.** Migrations need DDL; the app does
   not.
5. **Rotate passwords** and store them in a secret manager, never in Git.
6. **Use TLS** for connections across untrusted networks.

Roles (MySQL 8):

```sql
CREATE ROLE 'app_read', 'app_write';

GRANT SELECT ON royal_travels.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON royal_travels.* TO 'app_write';

GRANT 'app_read', 'app_write' TO 'rt_app'@'10.0.0.%';
SET DEFAULT ROLE ALL TO 'rt_app'@'10.0.0.%';
```

Authentication:

- MySQL 8 default plugin is `caching_sha2_password`; modern drivers support it.
- `mysql_native_password` is deprecated; avoid it for new users.
- Require TLS for remote users if the network is not trusted.

### SQL injection

Never build SQL by concatenating user input:

```
"SELECT * FROM bookings WHERE booking_ref = '" + ref + "'"
```

Input `' OR '1'='1` returns every booking. Input
`'; DROP TABLE bookings; --` may destroy data if the user has DDL rights.

Use **prepared statements** with bound parameters:

```sql
PREPARE stmt FROM 'SELECT * FROM bookings WHERE booking_ref = ?';
SET @ref = 'b0000000-0000-4000-8000-000000000001';
EXECUTE stmt USING @ref;
DEALLOCATE PREPARE stmt;
```

Application drivers do this for you:

```java
// JDBC
PreparedStatement ps = conn.prepareStatement(
    "SELECT * FROM bookings WHERE booking_ref = ?");
ps.setString(1, ref);
```

```js
// Node.js mysql2
const [rows] = await conn.execute(
  'SELECT * FROM bookings WHERE booking_ref = ?', [ref]
);
```

Caveats:

- Placeholders work for **values**, not identifiers (table/column names). If
  you must build identifiers dynamically, allowlist them.
- ORMs protect values but raw fragments (`whereRaw`, string interpolation) can
  reintroduce injection.
- Validate input types and lengths too; defence in depth.

Other settings:

```sql
SELECT @@sql_mode;
-- Keep STRICT_TRANS_TABLES and ONLY_FULL_GROUP_BY.
```

- Avoid `FILE` privilege unless you truly need `LOAD DATA`/`SELECT INTO FILE`.
- Audit accounts, `mysql.user`, and grants regularly.
- Enable general/slow logs carefully; they may contain sensitive data.
- Encrypt backups and disks. MySQL does not encrypt data at rest by itself
  (InnoDB tablespace encryption is available in Enterprise; community users
  rely on filesystem/cloud encryption).

---

## 14. Backup and restore

A backup you have never restored is not a backup.

### Logical backup (portable, slower for large data)

```powershell
mysqldump -u root -p `
  --single-transaction `
  --routines --triggers --events `
  --databases royal_travels > royal_travels_backup.sql
```

- `--single-transaction` takes a consistent InnoDB snapshot without locking
  tables. It does not work for MyISAM.
- `--routines --triggers --events` includes stored code; forgetting these is a
  classic restore surprise.
- `--set-gtid-purged=OFF` if you need to restore to a server with different GTID
  settings.

Restore:

```powershell
mysql -u root -p < royal_travels_backup.sql
```

### Physical backup (fast, large data)

- Percona XtraBackup (open source).
- MySQL Enterprise Backup (commercial).
- Cloud provider snapshots (with care for consistency).

Physical backups copy data files; they are faster but tied to the MySQL
version/platform.

### Point-in-time recovery (PITR)

Requires binary logging:

```ini
[mysqld]
log_bin = mysql-bin
binlog_format = ROW
server_id = 1
```

Recovery = restore the last base backup + replay binlogs up to the desired
moment:

```powershell
mysqlbinlog --start-datetime="2026-11-11 09:00:00" `
            --stop-datetime="2026-11-11 10:15:00" `
            mysql-bin.000042 | mysql -u root -p
```

Test PITR on a staging server. A backup strategy without a tested restore
procedure is a hope, not a plan.

### Retention

- Keep daily backups for 7–30 days, weekly for months, depending on regulation.
- Store copies off-site/off-account (3-2-1 rule: 3 copies, 2 media, 1 off-site).
- Encrypt backups; they contain personal data.
- Monitor backup failures and restore drills.

---

## 15. Replication and high availability (overview)

```
App writes ──▶ Source (primary)
                  │ binary log
                  ▼
             Replica (read-only)
                  │ relay log
                  ▼
             apply changes
```

- The source writes every change to the **binary log**.
- Replicas fetch it, write a **relay log**, and apply events.
- Default replication is **asynchronous**: the source commits without waiting
  for replicas. A failover can lose the last few transactions.
- **Semi-synchronous** replication waits for at least one replica to acknowledge
  receipt (not apply). Reduces loss, adds latency.
- **GTIDs** make failover and reconciliation much easier; use them.
- `binlog_format=ROW` is the safe default; it makes replication deterministic.

Useful commands (8.0.22+ terminology):

```sql
SHOW REPLICA STATUS\G
SHOW REPLICAS;
```

Watch `Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`,
and `Last_Error`.

Read replicas:

- Scale reads, run analytics, and provide a failover target.
- They can lag. Reading immediately after a write may return stale data
  (**read-after-write** inconsistency). Route those reads to the source or use
  a session stickiness strategy.

High availability:

- **Orchestrator** / **MHA** for automated failover of async replication.
- **Group Replication + InnoDB Cluster** for built-in consensus and failover.
- **ProxySQL** or a load balancer for routing.
- Cloud managed services (RDS Multi-AZ, Cloud SQL HA) hide much of this, but you
  still need to understand lag, failover, and connection retry.

Replication is **not a backup**: a `DROP TABLE` replicates instantly. Keep
independent backups.

---

## 16. Monitoring: what to watch

```sql
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
SHOW GLOBAL STATUS LIKE 'Aborted_connects';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits';
SHOW GLOBAL STATUS LIKE 'Created_tmp_disk_tables';
SHOW ENGINE INNODB STATUS\G
SHOW FULL PROCESSLIST;
```

Key signals:

| Signal | Why it matters |
|---|---|
| Connections vs `max_connections` | running out rejects clients |
| Buffer pool hit ratio | low ratio = disk-bound reads |
| Disk usage | binlogs, undo, data growth |
| Replication lag | stale reads, failover risk |
| Slow queries | user-facing latency |
| Deadlocks / lock waits | contention |
| `Created_tmp_disk_tables` | sorts/groups spilling to disk |
| Long transactions | undo bloat, locks, vacuum-like pressure |

Tools: MySQL Enterprise Monitor, Percona PMM, Prometheus `mysqld_exporter`,
Grafana, cloud provider metrics. Alert on symptoms users feel, not on every
counter.

---

## 17. Common mistakes

1. **Long-running transactions** holding locks and undo history.
2. **Calling an external API inside a transaction.**
3. **No deadlock retry** in application code.
4. **`SELECT ... FOR UPDATE` on an unindexed column** → locks far too many rows.
5. **Check-then-insert** for uniqueness instead of a constraint.
6. **Granting `ALL` to the application user.**
7. **Using `root` in the app or in scripts.**
8. **Assuming a replica is a backup.**
9. **Never testing a restore.**
10. **Binary logging off**, making PITR impossible.
11. **Hiding business logic in triggers** that nobody can find.
12. **Storing JSON for everything** and then wondering why filters are slow.
13. **Ignoring `sql_mode`** and silently truncating data.
14. **Putting secrets in `my.cnf` committed to Git.**

---

## 18. Quiz

1. What does the undo log provide? What does the redo log provide?
2. What is the difference between `READ COMMITTED` and `REPEATABLE READ` in
   InnoDB?
3. Why do readers not block writers in InnoDB?
4. What is a gap lock, and when does it matter?
5. How do you inspect the last deadlock?
6. Why is `SELECT ... FOR UPDATE` on an unindexed column dangerous?
7. What is the safest database-level defence against double-booking?
8. When is a view updatable?
9. Why must a stored function be declared `DETERMINISTIC` or `READS SQL DATA`?
10. Give two good uses and two bad uses for triggers.
11. Why can `LIKE '%term%'` not use a B-tree index, and what is the alternative?
12. Why is `--single-transaction` important in `mysqldump`?
13. What is the difference between replication and a backup?
14. Why can reading from a replica immediately after a write be wrong?

<details>
<summary>Answers</summary>

1. Undo log stores previous row versions for rollback and MVCC; redo log stores
   committed changes for crash recovery and durability.
2. `READ COMMITTED` takes a fresh snapshot per statement, so the same query can
   see different rows within a transaction. `REPEATABLE READ` takes one snapshot
   at the first consistent read, so repeated reads see the same data (plus gap
   locks for locking reads).
3. MVCC serves readers from a consistent snapshot of row versions, so they do
   not need locks that writers hold.
4. A lock on the gap between index records, preventing inserts into that range.
   It matters under `REPEATABLE READ` for range queries and can cause deadlocks.
5. `SHOW ENGINE INNODB STATUS\G`, section `LATEST DETECTED DEADLOCK`.
6. Without an index, the server scans many rows and locks each one, blocking
   unrelated work and increasing deadlock risk.
7. A unique constraint on the reservable unit (for example,
   `PRIMARY KEY (vehicle_id, slot_start)`), plus an atomic insert/update.
8. Generally, a view based on one table without aggregates, `DISTINCT`,
   `GROUP BY`, `UNION`, or certain subqueries; `WITH CHECK OPTION` adds
   validation. Multi-table views are not updatable.
9. With binary logging, MySQL needs to know whether the function is safe to
   replicate deterministically. The declaration is a promise about behaviour.
10. Good: audit trail, enforcing a derived value/invariant. Bad: hiding a core
    workflow, per-row heavy logic that slows bulk writes.
11. A leading wildcard means the search can start anywhere, so the sorted index
    cannot be used for a range seek. Use full-text search or a specialized
    search engine.
12. It gives a consistent snapshot of InnoDB tables without locking them for the
    duration of the dump.
13. Replication copies changes continuously to another server; a backup is a
    restorable point-in-time copy. A replicated `DROP TABLE` is replicated too.
14. Replication is asynchronous, so the replica may not have applied the latest
    transaction yet (`Seconds_Behind_Source` > 0).

</details>

---

## Before you move on

- [ ] You can explain ACID and name the isolation levels.
- [ ] You can write a transaction with `COMMIT`, `ROLLBACK`, and a savepoint.
- [ ] You know why deadlocks happen and how to retry them.
- [ ] You can secure a database user with least privilege.
- [ ] You can take and restore a logical backup.
- [ ] You know why replication is not a backup.

Next: **[06-practice-and-cheatsheet.md](06-practice-and-cheatsheet.md)**
