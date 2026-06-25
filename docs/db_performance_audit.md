# Database Performance & Indexing Audit — Acadify

**Date:** 2026-06-15
**Scope:** All Prisma models, schema indexes, and every service-layer query
(`findMany / findFirst / findUnique / count / aggregate / groupBy / update / updateMany /
delete / deleteMany / upsert` + one `$queryRaw`).
**Stack:** Next.js → API → Services → Prisma 7 / PostgreSQL. Multi-tenant (per-`school_id`).

---

## Executive summary

**The schema is already well and competently indexed.** A prior performance pass clearly
happened (see the `Audit H7` comment on `StudentFeeLedger`, the `security_audit.md` history, and
the per-tenant composite indexes throughout). Almost every index an automated scan would flag as
"missing" — `Quiz(created_by)`, `Quiz(school_id, status)`, `Notification(school_id, created_at)`,
`Attendance(school_id, date)`, `FeeTransaction(school_id, status, paid_at)`,
`QuizAttempt(quiz_id, student_id)`, `SchoolCalendar(school_id, date)` — **already exists.**

So the production-readiness win here is the *opposite* of "add more indexes":

1. **Removed 11 redundant prefix indexes** that cost write/storage with zero read benefit. ✅ done
2. **Fixed 3 query patterns** that load unbounded rows or issue N+1 round-trips. ✅ done
3. **Confirmed no new index is justified at current scale** — candidates are documented with the
   reason each is declined.

Net effect: lower write amplification and storage, no functional change, hot reads stay covered.

### What was changed in this pass

| Area | File | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Dropped 11 redundant `@@index` lines (see 🟢) |
| Query | `services/fee-structure.service.ts` | `listFeeStructures`: `3×N` counts → 3 grouped queries |
| Query | `services/quiz.service.ts` | `getAdminQuizzes`: unbounded inline attempts → 1 `groupBy` |
| Query | `services/quiz.service.ts` | `getAdminLeaderboardOverview`: unbounded inline attempts → `take:1` + 1 `groupBy` |

> **⚠️ Follow-up required to apply schema changes to the database:**
> ```
> npx prisma db push        # this repo uses db push (migration drift); drops the 11 indexes
> npx prisma generate       # already run
> ```
> Dropping indexes in PostgreSQL is non-blocking and fully reversible. `prisma validate` and
> `tsc --noEmit` pass after all edits.

---

## 🔴 Critical performance issues

These were **query-level**, not index-level. All three are fixed in this pass.

### C1 — `listFeeStructures` ran 3 count queries per structure (N+1)
- **File/model:** `services/fee-structure.service.ts` → `StudentFeeLedger`, `StudentFeeWaiver`
- **Old pattern:** `Promise.all(structures.map(...))` where each structure fired 3 `count`s with a
  relation filter `fee_head: { structure_id: s.id }`. A school with 30 fee structures = **90 count
  round-trips** on a single admin page load; grows linearly with structures.
- **Fix:** load `fee_heads` once (already in the `include`), build a `fee_head_id → structure_id`
  map, then run **exactly 3 `groupBy({ by: ['fee_head_id'] })`** queries and fold the per-head
  counts back onto each structure in memory. Output shape (`ledger_row_count`,
  `paid_ledger_count`, `waiver_count`) is byte-for-byte identical.
- **Benefit:** `3N+` queries → constant **3** queries. Each is index-supported
  (`FeeHead` is keyed by `structure_id`; `StudentFeeLedger`/`StudentFeeWaiver` filter on
  `school_id` + `fee_head_id`).
- **Trade-off:** none functionally; marginally more in-JS folding (tiny).

### C2 — `getAdminQuizzes` loaded every submitted attempt inline (unbounded)
- **File/model:** `services/quiz.service.ts` → `QuizAttempt`
- **Old pattern:** `quiz.findMany(... attempts: { where: submitted, select: { score } })` pulled
  **every** submitted attempt row for **every** quiz, only to compute an average in JS. A school
  with 100 quizzes × 500 students ≈ **50,000 rows** materialised per admin list load.
- **Fix:** drop the inline `attempts`; compute avg + count with one
  `quizAttempt.groupBy({ by: ['quiz_id'], _sum: { score }, _count })` over the page's quiz IDs
  (new shared helper `aggregateSubmittedStats`). `_sum/_count` reproduces the old
  "null score = 0" math exactly (submitted attempts always have a non-null score anyway).
- **Benefit:** payload drops from O(attempts) to O(quizzes); one aggregate query replaces a giant
  row transfer. Uses the existing `QuizAttempt(quiz_id, status)` index.
- **Trade-off:** one extra round-trip (the `groupBy`) — negligible vs. the rows saved.

### C3 — `getAdminLeaderboardOverview` same unbounded inline attempts
- **File/model:** `services/quiz.service.ts` → `QuizAttempt`
- **Old pattern:** identical unbounded inline `attempts` (ordered `score desc`, **no `take`**), even
  though only the **single top scorer** plus avg/count are consumed.
- **Fix:** bound the nested load to `take: 1` (top scorer name + score), and get avg + submitted
  count from the same `aggregateSubmittedStats` helper.
- **Benefit:** nested fetch goes from "all submitted attempts" to **1 row per quiz**.
- **Trade-off:** none; output shape preserved (`submittedCount`, `avgScore`, `topScore`,
  `topScorer`, `_count.attempts`).

---

## 🟠 Recommended indexes

**Honest conclusion: no new index is strongly justified at current scale.** The hot paths are
already covered by existing composites. Candidates considered and **declined**, with reasons:

| Candidate | Query it would help | Verdict & reason |
|---|---|---|
| `Quiz(school_id, status, start_time)` | `buildLeaderboard` monthly view filters `school_id + status + start_time` range; today uses `(school_id, status)` then a residual range scan | **Optional / declined now.** Quizzes-per-school is bounded (hundreds). Add only if production `EXPLAIN` shows this as a hot scan. Cost: +1 index on a write-moderate table. |
| `FeeTransaction(school_id, status, created_at)` | Pending-verification list sorts by `created_at`; after dropping the redundant `(school_id, status)` no index covers that sort | **Optional / declined now.** Pending rows per school are few; the sort is cheap. The retained `(school_id, status, paid_at)` covers the main paid-history list. |
| `User(role)` | role-based counts | **Declined.** No hot query filters `User` by `role` alone; dashboard counts go through `Student`/`Teacher`/`SchoolUser` (each already indexed by `school_id`). |
| `QuizAttempt(student_id, status)` | `getStudentArenaProfile` filters `student_id + status` | **Declined.** `(student_id, submitted_at)` already serves the `student_id` prefix; `status` is a cheap residual filter over one student's (small) attempt set. |
| `Notification(... target_audience/class/section)` | visibility filtering | **Declined.** `(school_id, created_at desc)` already drives the list + ordering; audience/class/section are low-cardinality residual filters over a per-school-modest table. |

This section is intentionally minimal — it documents the anti-over-indexing discipline rather than
padding the schema.

---

## 🟡 Queries that should be rewritten / watched

- **C1, C2, C3** above — rewritten in this pass.
- **`getStudentArenaProfile`** (`services/quiz-analytics.service.ts:113`) — `findMany` of **all**
  lifetime submitted attempts (+ nested answers), no pagination. **Verified intentional and
  acceptable:** the function's lifetime totals and `bySubjectGroup` genuinely need all-time data;
  the `monthsBack` window is applied in JS only to `monthlyTrend` (line ~256). The fetch is bounded
  by **one student's participation** (tens–low hundreds of contests), not by school/global scale,
  so it is *not* a real unbounded risk. **No change made** — windowing the query would silently
  break lifetime stats. Re-evaluate only if a single student can ever accrue thousands of attempts.
- **`saveAnswer`** (`services/quiz-attempt.service.ts:203`) — one `findFirst` on `QuizAnswer` per
  answer save (to anchor per-question timing). **Acceptable, not a defect:** it is one query per
  save (inherent), bounded by question count, and served by the `QuizAnswer(attempt_id,
  question_id)` unique key. No index or rewrite needed.

---

## 🟢 Redundant / unnecessary indexes — **removed**

Each was a single- or short-prefix index **fully covered** by a longer composite or a unique
constraint sharing the same leading columns. A PostgreSQL B-tree on `(a, b, …)` already serves any
query that filters/sorts on a leading prefix (`a`, or `a, b`), so these prefix indexes added
INSERT/UPDATE cost and disk with **zero** read benefit.

| Model | Index dropped | Already covered by | Benefit of removal |
|---|---|---|---|
| `SchoolCalendar` | `@@index([school_id, date])` | `@@unique([school_id, date])` | −1 index on a hot-write table (attendance/calendar) |
| `Teacher` | `@@index([school_id])` | `@@unique([school_id, employee_id])` | −1 index |
| `ClassLog` | `@@index([school_id, date])` | `@@index([school_id, class, section, date])` | −1 index on a per-period write table |
| `FeeStructure` | `@@index([school_id, session_id])` | `@@index([school_id, session_id, class, section, is_active])` | −1 index |
| `FeeTransaction` | `@@index([school_id, status])` | `@@index([school_id, status, paid_at])` | −1 index on a financial write path |
| `FeeHeadAppliedMonth` | `@@index([fee_head_id])` | `@@id([fee_head_id, period_year, period_month])` | −1 index |
| `TimetableGroup` | `@@index([school_id])` | `@@unique([school_id, name])` | −1 index |
| `StudentFeeWaiver` | `@@index([school_id, session_id])` | `@@index([school_id, session_id, period_year, period_month])` | −1 index |
| `StudentFeeWaiver` | `@@index([student_id, session_id])` | `@@index([student_id, session_id, fee_head_id, period_year, period_month])` | −1 index |
| `QuizAnswer` | `@@index([attempt_id])` | `@@unique([attempt_id, question_id])` | −1 index on a hot quiz-write table |
| `QuizAttempt` | `@@index([student_id])` | `@@index([student_id, submitted_at])` | −1 index on a hot quiz-write table |

**Total: 11 indexes removed.** Lower write amplification on the busiest tables (attendance, quiz
attempts/answers, fee transactions) with no read regression.

### Deliberately kept (NOT redundant)
- `StudentMonthlyLateFee`: both `(school_id, period_year, period_month)` and
  `(school_id, session_id, period_year, period_month)` — different 2nd column; serve cross-session
  vs within-session queries.
- `Session`: `(school_id, is_current)` vs `unique(school_id, name)` — different 2nd column.
- `Student`: `(school_id, status)` is **not** covered by `unique(school_id, admission_no)` /
  `unique(school_id, class, section, roll_no)` (those carry different 2nd columns) — kept.

---

## Multi-tenant (per-school) coverage — verified healthy

Tenant-scoped hot tables already lead their composite indexes with `school_id` (or a tenant-scoped
unique), so cross-tenant scans are avoided:

- `Attendance` → `unique(school_id, student_id, date)` + `(school_id, date)` + `(student_id, date)`
- `Quiz` → `(school_id, status)`, `(school_id, class, section)`, `(school_id, subject_group, end_time)`
- `FeeTransaction` → `(school_id, status, paid_at)`, `(school_id, receipt_no)`, `(student_id, paid_at)`
- `StudentFeeLedger` → 5 `school_id`-leading composites incl. the `Audit H7` per-student one
- `Notification` → `(school_id, created_at desc)`
- `Student`/`Teacher`/`SchoolUser` → `school_id`-leading uniques + `(user_id…)` for auth resolves

No query was found returning cross-school rows unfiltered.

---

## Broader query-health notes (no action required)

- **Pagination:** present on the heavy list endpoints (`FeeTransaction` lists, both `Notification`
  inboxes use `skip/take`). Leaderboards are bounded (`buildLeaderboard` caps at top 200 via DB
  `groupBy + orderBy + take`).
- **N+1:** after the 3 fixes above, the remaining `Promise.all([...])` blocks are fixed-arity
  (e.g. dashboard's 6 parallel counts, auth's 3 role probes) — not data-driven fan-out.
- **Bulk imports** (`student`/`teacher.service.ts`) use `createMany` / `createManyAndReturn` inside
  transactions with pre-checks — no per-row inserts in loops.
- **Receipt numbering** uses an atomic `$queryRaw` upsert on `SchoolReceiptCounter` (TOCTOU-safe) —
  correct as-is.

---

## Verification performed
- `npx prisma validate` → schema valid.
- `npx prisma generate` → client regenerated (v7.8.0).
- `npx tsc --noEmit` → **0 errors** (all rewrites incl. `groupBy` typings + fold helper compile).
- **Pending (DB side):** `npx prisma db push` to drop the 11 indexes in the database.

### Suggested functional spot-checks after `db push`
1. Admin **fee structures** page — `ledger_row_count` / `paid_ledger_count` / `waiver_count` match
   pre-change values for a school with existing ledgers + waivers.
2. Admin **quiz list** — `avgScore` + `submittedCount` unchanged for quizzes with submissions.
3. Admin **arena leaderboard overview** — top scorer / avg per quiz unchanged.
4. (Optional) Enable Prisma query logging, reload the fee-structures page, confirm a **constant**
   number of count/groupBy queries regardless of structure count.
