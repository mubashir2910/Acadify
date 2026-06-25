# Acadify — Security & Architecture Audit

**Date:** 2026-06-14 · **Branch:** feature/exam-management · **Auditor:** senior security review (Claude Code)
**Scope:** full multi-school SaaS — Next.js 16 App Router → API routes → services → Prisma/Postgres; next-auth v5 (JWT).

---

## Executive summary

The codebase is in **good shape** for production. Tenant isolation, RBAC, the fee/payment
module, quiz grading, DB transactions, secrets handling, and HTTP security headers are all
sound and were verified against source.

- 🔴 **Critical:** none (no remotely-exploitable critical found).
- 🟠 **High:** 1 — quiz detail leaked another school's questions + answer key (**FIXED this session**).
- 🟡 **Medium:** 2 — rate-limiting could be silently disabled in prod; expensive reads were unthrottled (**both FIXED this session**).
- 🟢 **Low:** 4 — all FIXED this session (L1–L4).

Every finding was verified by reading the file (three parallel automated passes generated
leads; each material claim was re-checked by hand). That overturned several false/stale
claims — see [Corrections](#corrections).

---

## Method & coverage

- **Verified by hand:** `middleware.ts`, `auth.ts`, quiz service + quiz-attempt service + all
  quiz routes, the full fee-transaction service + schema + gateway webhook stub,
  `lib/rate-limit.ts`, `lib/working-days.ts`, `lib/attachment.ts`, the attachment upload
  route, `school.service.deleteSchool`, `quiz.schema.ts`, `fee-transaction.schema.ts`,
  calendar + arena leaderboard routes, plus git/secret checks.
- **Mapped + spot-checked:** route-by-route auth/RBAC/school-scoping for the remaining
  ~100 API routes; the highest-risk routes were all opened directly.
- **Roles:** SUPER_ADMIN, ADMIN, TEACHER, STUDENT. There is **no PARENT role** in the system
  (it was listed in the brief but does not exist).

---

## Findings

### 🟠 H1 — Quiz detail leaked another school's questions + correct answers — ✅ FIXED

| | |
|---|---|
| **Description** | `getQuizDetail()` fetched a quiz by id with **no check that it belongs to the caller's school or was created by them**. For non-student roles it set `includeQuestions = role !== "STUDENT"` and returned full question text, `correct_answer`, and which option `is_correct`. Any authenticated TEACHER/ADMIN could read the complete contents (incl. answer key) of *any* school's quiz by id; a STUDENT could read any quiz's cross-school metadata. |
| **Why dangerous** | Tenant isolation is the core security boundary of a multi-school SaaS. This exposed exam content + the answer key across tenants, breaking exam integrity. (Ids are UUIDs, so an attacker must obtain a valid id — shared link, screenshot, referrer/history, prior employment, or a malicious tenant — which is why this is High, not Critical.) |
| **Files** | `app/api/quiz/[quizId]/route.ts` (GET only checked "logged in"), `services/quiz.service.ts` `getQuizDetail`. |
| **Fix (applied)** | Added a per-role tenant/ownership gate in `getQuizDetail`, mirroring the existing `updateQuizStatus` / `getQuizLeaderboard` checks: STUDENT must be in the quiz's school **and** its class/section (or already have an attempt); TEACHER must be the creator; ADMIN must hold an ACTIVE admin `SchoolUser` row for the quiz's school; any other role is denied. Question content stays gated behind a student attempt. The route now maps `FORBIDDEN → 403`. |
| **Priority** | P0 (done). Add a regression test asserting cross-school `getQuizDetail` throws `FORBIDDEN`. |

### 🟡 M1 — Rate limiting could be silently disabled in production — ✅ FIXED

| | |
|---|---|
| **Description** | All limiters become `null` and `checkRateLimit` returns "allow" when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are unset. There was no startup assertion, so a prod deploy missing those vars would silently drop **every** rate limit, including login brute-force protection. |
| **Why dangerous** | Login/password-reset/contact throttling is the primary defense against credential stuffing and spam; losing it with no signal is a config foot-gun. |
| **Files** | `lib/rate-limit.ts`. |
| **Fix (applied)** | Fail fast: throw at startup when `NODE_ENV === "production"` and the Upstash vars are unset. Also wrapped `limiter.limit()` in try/catch so a transient Upstash outage **fails open with a logged error** instead of 500-ing (which in middleware could otherwise break login). Updated `.env.example` to mark the vars required in production. |
| **Priority** | P1 (done). |

### 🟡 M2 — Expensive authenticated reads had no rate limit — ✅ FIXED

| | |
|---|---|
| **Description** | Several read endpoints running heavy aggregations / large queries were auth-gated but **not** rate-limited, so any one logged-in user could hammer them. |
| **Why dangerous** | Cheap DB-pressure / DoS vector (leaderboards recompute aggregates on every call). Lower impact than an anonymous endpoint since a valid session is required. |
| **Files** | `app/api/arena/leaderboard/route.ts`, `app/api/quiz/[quizId]/leaderboard/route.ts`, `app/api/quiz/[quizId]/route.ts` (GET), `app/api/quiz/route.ts` (GET), `app/api/calendar/route.ts` (GET). |
| **Fix (applied)** | Added `checkRateLimit(expensiveReadLimiter, ` + "`read:${session.user.id}`" + `)` after the auth check on each, using the existing limiter (100/60s) and the established pattern from `app/api/notifications`. |
| **Priority** | P1 (done). |

### 🟢 Low — ✅ ALL FIXED (2026-06-14)

| ID | Description | Files | Fix (applied) |
|---|---|---|---|
| **L1** | `saveAnswerSchema.givenAnswer` had no max length; a scripted client (within the 120/min quiz limiter) could store very large strings → DB bloat / slower grading. | `schemas/quiz.schema.ts` | ✅ Added `.max(1000)` (MCQ answers are option UUIDs; FILL_BLANK/ONE_WORD are short). `PATCH /api/quiz/[id]/attempt` already parses this schema → 422 on oversize. |
| **L2** | All 5 upload routes trusted the extension (attachment, payment-proof) or client MIME (profile/logo/qr) — none verified bytes; profile/logo/qr also stored `contentType: file.type`. | new `lib/file-signature.ts`; `app/api/upload/{attachment,payment-proof,profile-picture,school-logo,qr-code}/route.ts` | ✅ Added dependency-free `magicMatchesExtension()` magic-byte check to all 5 routes (→ 400 on mismatch) + switched profile/logo/qr to `CONTENT_TYPES[ext]`. (Filename XSS: verified already safe — rendered React-escaped.) |
| **L3** | Profile-completion was not enforced on `/api/*` (middleware excluded API paths). | `middleware.ts` | ✅ Added an `/api/*` guard returning 403 JSON for incomplete STUDENT/TEACHER/ADMIN, with an allowlist for the completion flow (`/api/profile/complete`, `/api/profile`, `/api/upload/profile-picture`; `/api/auth/*` already public). |
| **L4** | Per-quiz leaderboard ranked ties by `submitted_at` instead of total time-taken (inconsistent with the monthly/accumulated boards + the route's own disclaimer). | `services/quiz.service.ts` | ✅ `getQuizLeaderboard` now sorts/ranks by `[score desc, timeTakenMs asc]`, mirroring `buildLeaderboard`. |

---

## Corrections

Claims raised by the automated passes or stale project memory that were **disproven** by
reading the code — do **not** re-file these:

- ❌ "startAttempt / submitAttempt / getQuizLeaderboard have cross-school IDOR." False —
  `startAttempt` scopes the student lookup to `quiz.school_id`; save/submit/result require
  an attempt a cross-school user can't create; leaderboard requires attempt (student) /
  created_by (teacher) / admin-of-school. Only `getQuizDetail` was unguarded (H1).
- ❌ "Fee amounts can be negative." False — `amount`/`amountApplied` are
  `z.coerce.number().positive().max(...)`; allocations must sum to amount; duplicate
  targets rejected.
- ❌ "deleteSchool isn't transactional" (stale memory). It is — `prisma.$transaction([...])`.
- ❌ "getWeekStart uses local time (timezone bug)" (stale memory). Fixed in code — uses
  `getNowIST()` + UTC parts.
- ❌ "Quiz question marks aren't validated to equal total." False — enforced in
  `createQuizSchema.superRefine`.
- ❌ ".env may be committed." False — `.env`/`.env.local` untracked, gitignored, never in
  history.

---

## Verified secure (no action needed)

- **Auth/RBAC** — middleware enforces authn (+ suspension, password-reset, profile-completion
  for page routes) and per-route handlers enforce role; JWT is signed and carries role from
  the DB and **not** a spoofable `schoolId`.
- **Multi-tenant scoping** — every data service re-derives `school_id` from session → DB and
  filters by it (fees, attendance, calendar, notifications, students/teachers, quiz attempt,
  leaderboards). H1 was the sole exception.
- **Fee / payment module** — atomic `$transaction`s, over-allocation guard, positive-amount
  + sum validation, duplicate external-ref guard, **replay-safe** verify/reject via
  conditional `updateMany` + count check, atomic receipt-number counter (`INSERT … ON
  CONFLICT … RETURNING`), full audit log. The gateway webhook is a safe **501 stub** carrying
  a written HMAC-verification checklist for whoever implements it.
- **Quiz integrity** — grading is server-side from stored correct answers; deadline + 5s
  grace enforced server-side; double-submit blocked by a unique `(quiz_id, student_id)`
  constraint; question/option order is deterministically seeded.
- **DB/ORM** — Prisma everywhere; the only raw SQL is the parameterized receipt counter (no
  injection surface).
- **Secrets** — no `NEXT_PUBLIC_` secrets; server-only env usage; `.env` never committed.
- **Headers** — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy set in `next.config.ts`; image `remotePatterns` allowlisted.
- **Errors** — `error.tsx` present in every role segment; API routes return generic messages
  and log server-side; ZodError → 422, Prisma P2002/P2025 mapped.

---

## Pre-deploy hardening (2026-06-14)

Verified a senior-engineer pre-deploy checklist and applied light hardening:
- **Business logic backend-authoritative** — ✅ confirmed, no change needed. Scores, XP/levels,
  leaderboard ranks, attendance %, and fee amounts/allocations/ledger status are all
  server-derived or server-revalidated; the frontend never supplies a trusted total/score.
- **Backend re-validates frontend input** — ✅ ~all mutating routes Zod-validate. Added the
  missing param/query checks: `z.string().uuid()` on `groupId` (`app/api/timetable`,
  `app/api/timetable/periods`) and on `[id]` (`notifications` DELETE, `fees/transactions/[id]`
  GET+PATCH, `fees/structures/[id]` DELETE), plus a Zod body parse for `deleteLedgers`.
  Malformed ids now return 422 instead of a 500.
- **No secrets in the client bundle** — ✅ confirmed clean (no `NEXT_PUBLIC_*` secrets; no
  client component imports a server module — the only `services/**` imports are erased
  `import type`). Added `server-only` build-time guards to `lib/prisma.ts`, `lib/spaces.ts`,
  `auth.ts` so any future client import of the data/auth layer fails `next build` (zero
  runtime cost). Deliberately NOT on `lib/rate-limit.ts` (imported by edge middleware) or
  `lib/attachment.ts` (its Zod schema is intentionally browser-shared; holds no secrets).

Verification: `npx tsc --noEmit` clean; `next build` "Compiled successfully" — proving the
`server-only` boundary holds (no guarded module reaches a client/edge bundle).

## Pre-deploy vuln-class check (2026-06-15)

Audited six classes from a senior-engineer checklist — **five already in place; LPDoS fixed.**
- **SSTI** ✅ no template engine (package.json), no `eval`/`new Function`; contact email is escaped string interpolation; PDFs via pdf-lib.
- **SQL / NoSQL injection** ✅ Prisma parameterized everywhere; the only raw SQL is the tagged-template receipt counter; no `*Unsafe` APIs; no dynamic field-name `orderBy`; no NoSQL.
- **ReDoS** ✅ every regex anchored & linear (no nested quantifiers / overlapping alternation); `new RegExp` built from `escapeRegex(schoolCode)` + bounded `\d{3,4}`, matched against DB values.
- **Clipboard** ✅ write-only (`writeText`: share links + admin-initiated credential copies); no `readText`/`onPaste`/`clipboardData`, no `onCopy` rewriting → no untrusted-clipboard ingestion / pastejacking.
- **Replay** ✅ payments (conditional `updateMany` + count, dup `external_txn_ref`, atomic receipt, hybrid dup-period), quiz unique `(quiz_id, student_id)`, idempotent attendance/calendar upserts, next-auth CSRF + SameSite=Lax, session-gated password reset, gateway webhook 501 stub w/ HMAC checklist. *(Accepted: a few non-financial creates lack idempotency; JWT has no server-side revocation list — valid until exp, up to 30 days with remember-me.)*
- **LPDoS** ✅ **FIXED (2026-06-15)** — added per-field `.max()` to all previously-uncapped user-input strings (student / teacher / profile / quiz / admin / timetable; codes ~20–30, names ~100, address 300, titles 150, free-text 1000–5000, URLs 500) and `.max()` to unbounded arrays (attendance records 2000, quiz questions 100 / options 10, fee allocations 100, fee-structure feeHeads 50 / appliedMonths 24 / classes 50, timetable-group classes 100, reorder periods 60). Added a ~1MB `Content-Length` body guard in `middleware.ts` (`/api/upload/*` and `/import/` excluded) returning 413; document `client_max_body_size` at the reverse proxy as the chunked-request backstop.

## Coverage against the requested audit areas

| Area | Result |
|---|---|
| 1. AuthN / AuthZ / RBAC | ✅ enforced (middleware + per-route); 1 gap fixed (H1) |
| 2. Rate limiting | ✅ broad coverage; hardened (M1) + read gaps closed (M2) |
| 3. Backend validation | ✅ Zod on all mutating routes; L1 length cap added |
| 4. Business logic / calculations | ✅ XP/levels/leaderboards/grading/attendance computed server-side |
| 5. Multi-tenant security / IDOR | ✅ school-scoped throughout; H1 was the one IDOR, fixed |
| 6. API security | ✅ role + ownership checks; no mass-assignment (explicit `select`/mapped writes) |
| 7. Database / ORM | ✅ transactions present; only parameterized raw SQL |
| 8. File upload security | ✅ size + extension + host allowlist + magic-byte check (L2 done) |
| 9. Payment security | ✅ server-side amounts, replay-safe, webhook stubbed with checklist |
| 10. Frontend security | ✅ no exposed secrets; no unsafe `dangerouslySetInnerHTML` with user input |
| 11. Environment / secrets | ✅ server-side only; not committed; `server-only` build guards added |
| 12. Logging / error handling | ✅ no sensitive data logged; generic client errors |
| 13. Production readiness | ✅ headers, error boundaries; indexes/monitoring noted below |
| 14. This report | ✅ |

---

## Remaining follow-ups

1. ✅ **L1–L4** — done (2026-06-14). Suggested: add a regression test for cross-school
   `getQuizDetail` (H1) and a unit test for `magicMatchesExtension` (L2).
2. **Indexes/perf** (low priority): confirm indexes for high-traffic filters; most FKs are
   already indexed.
3. **Webhook:** when the payment gateway lands, implement the handler exactly per the
   checklist already written in `app/api/fees/gateway/webhook/route.ts`.
