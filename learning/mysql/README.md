# MySQL: Zero to Advanced

A complete, hands-on MySQL course written for someone starting from zero.
Every example runs against the `royal_travels` practice database in this
folder, so you learn on realistic data (customers, vehicles, drivers,
bookings, payments) instead of abstract `foo`/`bar` tables.

> **Important:** this is a standalone learning track. The RoyalTravels
> application in this repository actually uses PostgreSQL/Supabase. Do **not**
> point these scripts at the application database. Load them only into a local
> MySQL server.

---

## What you will be able to do at the end

- Read, write, and explain SQL confidently, including joins, subqueries,
  CTEs, and window functions.
- Design a normalized schema with correct keys, data types, and constraints.
- Create the right indexes and read `EXPLAIN` to fix slow queries.
- Use transactions safely and understand isolation, locks, and deadlocks.
- Write stored procedures, triggers, views, and events when they are the right tool.
- Secure a MySQL server, back it up, restore it, and reason about replication.
- Answer typical MySQL interview questions without memorizing trivia.

---

## The files

| File | What it covers | Level |
|---|---|---|
| `schema.sql` | Practice database + seed data | setup |
| `01-foundations.md` | Databases, tables, data types, constraints, normalization | zero |
| `02-querying.md` | `SELECT`, filtering, `NULL`, sorting, functions, aggregation | beginner |
| `03-joins-subqueries-cte-windows.md` | Joins, subqueries, CTEs, recursive CTEs, window functions, set operations | intermediate |
| `04-design-indexes-performance.md` | Schema design, indexes, `EXPLAIN`, query tuning | advanced |
| `05-transactions-security-ops.md` | ACID, isolation, locks, procedures, triggers, JSON, security, backups, replication | advanced |
| `06-practice-and-cheatsheet.md` | 40 exercises with answers, cheat sheet, interview questions | all |

Read them in order. Each module ends with a short quiz and a "before you move
on" checklist.

---

## Setup (Windows, MySQL 8.0 or 8.4)

You already have MySQL 8.0 installed on this machine, so the fastest path is:

```powershell
# 1. Open the MySQL client (enter your root password when prompted)
mysql -u root -p

# 2. Load the practice database (use forward slashes)
SOURCE E:/projectsSpringboot/RoyalTravels/learning/mysql/schema.sql;

# 3. Switch to it
USE royal_travels;

# 4. Check the data
SELECT COUNT(*) FROM bookings;
```

Expected counts: 8 customers, 6 vehicles, 5 drivers, 24 bookings,
23 payments, 24 booking events.

### Create a dedicated student user (recommended)

Do not practise as `root`. Create a user that can only touch this database:

```sql
CREATE USER 'rt_student'@'localhost' IDENTIFIED BY 'Str0ngPass!';
GRANT ALL PRIVILEGES ON royal_travels.* TO 'rt_student'@'localhost';
```

Then connect with:

```powershell
mysql -u rt_student -p royal_travels
```

### GUI (optional)

- **MySQL Workbench** — official, free, good visual `EXPLAIN`.
- **DBeaver** — free, works with many databases, excellent editor.
- **VS Code + MySQL extension** — lightweight if you already live in VS Code.

The command line is worth learning because that is what you will use on a
server. Use the GUI as a convenience, not a crutch.

### Docker alternative

If you prefer an isolated server:

```powershell
docker run --name mysql-learn -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8.4
# wait ~20 seconds, then:
Get-Content -Raw .\learning\mysql\schema.sql | docker exec -i mysql-learn mysql -uroot -proot
```

### Reset the database at any time

```sql
SOURCE E:/projectsSpringboot/RoyalTravels/learning/mysql/schema.sql;
```

The script drops and recreates `royal_travels`, so you can experiment freely.

---

## How to study (the part most people get wrong)

**Do not read this like a novel.** SQL is a motor skill. You learn it by
typing queries, predicting the result, running them, and fixing your mistakes.

Use this 25-minute loop:

1. **Read** one small section (5 min).
2. **Predict** the output of the example before running it (2 min).
3. **Type** the query yourself — no copy-paste (5 min).
4. **Break** it on purpose: remove a `WHERE`, change a join, use `= NULL` (5 min).
5. **Explain** out loud why the result changed (5 min).
6. **Write down** one sentence of takeaway (3 min).

### 8-week plan (45–60 minutes a day, 5 days a week)

| Week | Focus | Deliverable |
|---|---|---|
| 1 | Module 1 + first half of Module 2 | Create your own small table and insert data |
| 2 | Module 2 rest | 10 report queries on `royal_travels` |
| 3 | Module 3: joins and subqueries | Answer 10 join exercises without looking |
| 4 | Module 3: CTEs and window functions | 5 analytical reports (rankings, running totals) |
| 5 | Module 4: design and indexes | Re-design one table, add indexes, compare `EXPLAIN` |
| 6 | Module 5: transactions and security | Simulate a double-booking race and fix it |
| 7 | Module 6: all exercises | 40/40 attempted, mistakes reviewed |
| 8 | Review + mock interview | Explain every concept in your own words |

If you only have 2 weeks, do Modules 1–3 properly and skim 4–5. Depth beats
checklist completion.

### The three questions to ask about every query

1. **What rows?** Which table(s), and which rows survive the filters?
2. **What grain?** Is one output row per booking, per customer, per day?
3. **What columns?** Raw values, aggregates, or window calculations?

Most SQL bugs are really grain bugs: you joined a one-to-many table and
silently multiplied your revenue.

---

## Conventions used in this course

- SQL keywords are uppercase (`SELECT`, `FROM`); identifiers are lowercase.
- Strings use single quotes: `'Bengaluru'`.
- `--` starts a comment; `/* ... */` is a block comment.
- `NULL` means "unknown", not zero and not an empty string.
- Examples assume `USE royal_travels;` unless stated otherwise.
- MySQL 8.0+ syntax. Anything that differs in MySQL 5.7 is called out.

---

## A note on PostgreSQL

The RoyalTravels backend uses PostgreSQL, and you will see differences:

| Task | MySQL | PostgreSQL |
|---|---|---|
| Auto number | `AUTO_INCREMENT` | `GENERATED ... AS IDENTITY` / `serial` |
| Quote identifier | `` `name` `` | `"name"` |
| Limit rows | `LIMIT 10 OFFSET 20` | `LIMIT 10 OFFSET 20` |
| Concatenate | `CONCAT(a,b)` | `a || b` |
| Cast | `CAST(x AS CHAR)` | `x::text` |
| Upsert | `ON DUPLICATE KEY UPDATE` | `ON CONFLICT ... DO UPDATE` |
| Boolean | `TINYINT(1)` | real `boolean` |
| UUID | `CHAR(36)` / `BINARY(16)` | native `uuid` |
| Current time | `NOW()` | `now()` |

The *concepts* (joins, indexes, transactions, MVCC) transfer almost 1:1.
Learn the concepts here; look up syntax when you switch databases.

---

## Progress checklist

- [ ] I loaded `schema.sql` and can query all six tables.
- [ ] I can explain the difference between `WHERE` and `HAVING`.
- [ ] I can write an inner, left, and self join without help.
- [ ] I know why `NOT IN` with `NULL` returns nothing.
- [ ] I can use a CTE and a window function in a real report.
- [ ] I can read a basic `EXPLAIN` and say whether a query uses an index.
- [ ] I can explain ACID and the four isolation levels.
- [ ] I can create a user with least privilege and take a backup.
- [ ] I finished the 40 exercises and reviewed my mistakes.

When every box is ticked, you are at a solid junior-to-mid backend level.
Seniority comes from production experience: slow queries, incidents, data
migrations, and careful schema changes.

---

Next: **[01-foundations.md](01-foundations.md)**
