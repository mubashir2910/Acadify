# Acadify — Developer & Onboarding Guide

A SaaS school management platform. Super Admins create and manage schools. Each school has Admins, Teachers, and Students. The platform handles attendance, calendars, profiles, and credentials.

---

## Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full platform — creates schools, manages subscriptions, sets session dates |
| `ADMIN` | School-level — imports students/teachers, manages attendance & calendar |
| `TEACHER` | Marks daily attendance, views class, calendar, birthdays |
| `STUDENT` | Views own attendance, profile, calendar, class teacher |

---

## School Lifecycle

### 1. Super Admin Creates a School

**UI:** Super Admin dashboard → "Add School"
**API:** `POST /api/schools`

Required fields:
- `schoolCode` — 2–5 characters, unique across the platform (e.g. `ABCD`)
- `schoolName` — 2–50 characters

What happens automatically on creation:
- `subscription_status` → `TRIAL`
- `trial_ends_at` → today + **60 days**
- `status` → `ACTIVE`

> The school code becomes the prefix for all student/teacher IDs within that school.

---

### 2. Trial Period (60 days)

- The school is **fully functional** during the trial — no restrictions
- Super Admin should set the **session start date** (required for attendance % calculations):
  - **API:** `PUT /api/schools/[schoolCode]/session-start`
  - This anchors the denominator for attendance rate (e.g. "working days since session began")
- If the school confirms they want to continue → Super Admin activates the subscription

> Trial days constant: `TRIAL_DAYS = 60` in `services/school.service.ts`

---

### 3. Subscription Management

**API:** `PUT /api/schools/[schoolCode]/subscription` (SUPER_ADMIN only)
**UI:** `app/super-admins/[schoolCode]/components/SubscriptionModal.tsx`

| Scenario | Status | `subscription_ends_at` |
|---|---|---|
| School pays / confirms | `ACTIVE` | Required — set a future end date |
| Non-payment or temporary freeze | `SUSPENDED` | Cleared to `null` |
| School closes permanently | `CANCELLED` | Cleared to `null` |

**What each status means:**
- `TRIAL` — auto-set on creation, school is on free trial
- `ACTIVE` — paid subscription, fully operational
- `SUSPENDED` — access blocked, data retained
- `CANCELLED` — permanent, no recovery path currently in code

> Note: There is no automated expiry check — subscription transitions are manual (Super Admin action only).

---

## Import Flow

### Import Students

**UI:** Import Students modal (Super Admin or Admin)
**API:** `POST /api/schools/[schoolCode]/import/students`

**CSV file:** `.csv` only, max **5MB**

| Column | Required | Notes |
|---|---|---|
| `name` | Yes | |
| `roll_no` | Yes | Unique per class + section |
| `class` | Yes | |
| `section` | Yes | |
| `guardian_name` | Yes | |
| `guardian_phone` | Yes | |
| `date_of_birth` | Yes | DD-MM-YYYY format |
| `email` | No | Must be valid & globally unique if provided |
| `admission_no` | No | Unique per school if provided |
| `phone` | No | |

**Validation:** All-or-nothing — if any single row fails validation, **nothing** is inserted. Errors are returned with row numbers.

**What happens on success:**
1. Student ID generated: `{schoolCode}{NNNN}` → e.g. `ABCD0001` (4-digit, zero-padded, up to 9999)
2. Temporary password generated: 8-char alphanumeric (excludes `0 O I l 1` for readability)
3. User created with `must_reset_password = true`, `is_profile_complete = false`
4. **PDFs generated and returned:**
   - One combined PDF (all students)
   - One PDF per class-section (e.g. `ABCD-10-A-Credentials.pdf`)
   - Frontend auto-downloads these
   - Each credential card shows: Name, Student ID, Class, Section, Roll No, Temp Password

---

### Import Teachers

**API:** `POST /api/schools/[schoolCode]/import/teachers`

**CSV file:** `.csv` only, max **5MB**

| Column | Required | Notes |
|---|---|---|
| `name` | Yes | Unique within file (case-insensitive) |
| `email` | Yes | Valid email, globally unique |
| `phone` | Yes | Min 10 digits |
| `joining_date` | No | Flexible date format |
| `date_of_birth` | No | DD-MM-YYYY format |
| `blood_group` | No | |

**Validation:** All-or-nothing (same as students).

**What happens on success:**
1. Teacher ID generated: `{schoolCode}T{NNN}` → e.g. `ABCDT001` (3-digit, zero-padded, up to 999)
2. Stored as both `username` (login ID) and `employee_id`
3. Temp password: same 8-char format, `must_reset_password = true`
4. **Single combined PDF returned** with all teacher credentials

---

## First Login Flow (Students & Teachers)

Every imported user follows this forced sequence:

```
Login (username + temp password)
    ↓
Reset Password  [forced — must_reset_password = true]
    ↓
Complete Profile  [forced — is_profile_complete = false]
    ↓
Dashboard
```

> SUPER_ADMIN and ADMIN skip the "Complete Profile" step.

**Student editable profile fields:** house name, date of birth, blood group, Aadhaar, address, profile picture, father name, mother name
**Non-editable (CSV-imported):** name, admission no, roll no, class, section

---

## Key Constants & Limits

| Item | Value | Where |
|---|---|---|
| Trial days | 60 | `services/school.service.ts` → `TRIAL_DAYS` |
| Max students per school | 9,999 | Student ID is 4-digit |
| Max teachers per school | 999 | Teacher ID is 3-digit |
| CSV max file size | 5 MB | Import API routes |
| Password length | 8 chars | `lib/student-id.ts` / `lib/teacher-id.ts` |
| Bcrypt rounds | 10 | Student & teacher services |
| Attendance edit window (teacher) | Current week Mon–Sun | `services/attendance.service.ts` |
| Attendance edit window (admin) | Any past date | `services/attendance.service.ts` |
| Attendance rate formula | (PRESENT + LATE) / total × 100 | LATE counts as attended |

---

## Architecture

```
Frontend (Next.js App Router)
    ↓
API Routes  (app/api/**)          ← validate input, call services
    ↓
Services    (services/**)         ← business logic, Prisma queries
    ↓
Prisma ORM  (lib/prisma.ts)
    ↓
PostgreSQL  (Aiven cloud)
```

> Never query the database directly from frontend components or API routes. All DB access goes through service functions.

---

## Key File Map

| Area | Files |
|---|---|
| DB schema | `prisma/schema.prisma` |
| School creation | `app/api/schools/route.ts`, `services/school.service.ts`, `schemas/school.schema.ts` |
| Subscription | `app/api/schools/[schoolCode]/subscription/route.ts`, `schemas/subscription.schema.ts` |
| Session start | `app/api/schools/[schoolCode]/session-start/route.ts` |
| Student import | `app/api/schools/[schoolCode]/import/students/route.ts`, `services/student.service.ts` |
| Teacher import | `app/api/schools/[schoolCode]/import/teachers/route.ts`, `services/teacher.service.ts` |
| ID generation | `lib/student-id.ts`, `lib/teacher-id.ts` |
| PDF generation | `lib/pdf-generator.ts` |
| Auth | `auth.ts`, `middleware.ts`, `services/auth.service.ts` |
| Profile | `services/profile.service.ts`, `app/complete-profile/`, `app/student/profile/`, `app/teacher/profile/` |
| Attendance | `services/attendance.service.ts`, `app/api/attendance/` |
| Calendar/Holidays | `services/calendar.service.ts`, `app/api/calendar/` |
| Super Admin UI | `app/super-admins/` |
| Admin UI | `app/admins/` |
| Teacher UI | `app/teacher/` |
| Student UI | `app/student/` |

---

## Super Admin Credentials (Development)

| Username | Default Password | Notes |
|---|---|---|
| `acadify_sa1` | `Acad!SA1@2026` | Forced password reset on first login |
| `acadify_sa2` | `Acad!SA2@2026` | Forced password reset on first login |

To reset these to defaults:
```bash
npx tsx prisma/seed-super-admins.ts
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL via Aiven |
| ORM | Prisma |
| Auth | next-auth v5 (beta) — JWT sessions, CredentialsProvider |
| Validation | Zod v4 (use `.issues`, not `.errors`) |
| Forms | React Hook Form + `@hookform/resolvers` v5 |
| UI | shadcn/ui (radix-ui v1), Tailwind CSS v4 |
| Tables | ag-grid-react v35 (`ag-theme-quartz`) |
| File upload | Cloudinary (server-side, env: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`) |
| Notifications | sonner (`<Toaster>` in `app/layout.tsx`) |
