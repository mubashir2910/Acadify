# Plan: Super Admin – Student Import System (MVP)

## Context
The super-admin dashboard currently renders schools as a plain list with no actions. This plan implements a full student import flow: school cards with action buttons, a CSV upload modal, bulk student creation with hashed passwords, a downloadable credentials PDF, and a school details page showing all imported students.

**Key clarification on `admission_no`:**
`admission_no` is the school's own pre-existing admission number (assigned before they joined this platform). Many schools don't use admission numbers, so it is **optional**. The system-generated `studentUniqueId` (e.g. `SA261`) goes **only into `users.username`** and is displayed as "Student ID" in the UI. This requires a Prisma schema change to make `admission_no` nullable.

---

## Prisma Schema Change (required)

**File:** `prisma/schema.prisma`

Change in the `Student` model:
```diff
- admission_no    String
+ admission_no    String?
```

The `@@unique([school_id, admission_no])` constraint still works correctly — PostgreSQL treats NULLs as distinct in unique indexes, so multiple students can have `NULL` admission_no.

Run migration after schema change:
```bash
npx prisma migrate dev --name make_admission_no_optional
```

---

## New Dependencies
```bash
npm install bcryptjs pdf-lib
npm install -D @types/bcryptjs
```

---

## Implementation Order

### 1. `schemas/student.schema.ts` _(create)_
Zod schema for one CSV row + TypeScript interfaces for in-memory enriched student and API response shapes.
- Required fields: `name`, `roll_no`, `class`, `section`, `guardian_name`, `guardian_phone`
- Optional fields: `email` (validated as email if provided), `phone`, `admission_no`
- `EnrichedStudent` interface carries `studentUniqueId`, `temporaryPassword`, `passwordHash` — server-only, never sent to client
- `ImportSuccessResponse` / `ImportErrorResponse` union types

### 2. `lib/student-id.ts` _(create)_
Pure utility — no Prisma, no bcrypt.
- `generateStudentUniqueId(schoolCode, year, sequence)` → `"SA261"` format
  - `{schoolCode}{last2digitsOfYear}{sequence}` (e.g. SA + 26 + 1 = SA261)
  - This ID is stored in `users.username` as the student's login ID
- `generateTemporaryPassword()` → 8-char alphanumeric using `crypto.randomBytes` (excludes ambiguous chars: 0,O,I,l,1)

### 3. `lib/pdf-generator.ts` _(create)_
Uses `pdf-lib` (pure JS, Node.js runtime only — do NOT add `export const runtime = "edge"`).
- `generateCredentialsPdf(schoolName, students[])` → base64 string
- A4 page, school name + subtitle header, striped table: Student Name | Student ID | Temporary Password
- Auto-paginates when rows exceed page height

### 4. `services/student.service.ts` _(create)_
Follows same pattern as `services/school.service.ts`.

**`getStudentsBySchoolCode(schoolCode)`**
- `prisma.school.findUnique({ where: { schoolCode } })` → if null, return null
- `prisma.student.findMany` with `user` join
- Select: `id, admission_no, roll_no, class, section, created_at, user.{ name, email, phone, username }`
- The `username` field from `user` is the system-generated Student ID displayed in the UI

**`importStudents(schoolCode, rows[])`**
1. Verify school exists → if not, return error
2. Cross-row duplicate `roll_no` check within the batch → return all duplicate errors if any
3. `prisma.student.count({ where: { school_id } })` → `existingCount` for sequence start
4. `Promise.all(rows.map(...))` — hash passwords concurrently with bcrypt (saltRounds=10) **before** transaction
5. `prisma.$transaction(async tx => { ... })`:
   - `tx.user.createManyAndReturn({ data: usersData, select: { id, username } })`
   - Build `Map<username → userId>` from result
   - `Promise.all([ tx.student.createMany(...), tx.schoolUser.createMany(...) ])`
6. `generateCredentialsPdf(schoolName, enrichedStudents)` → base64
7. Return `{ success: true, summary, pdf: base64 }`

**Field mapping:**
- `users.username` = generated `studentUniqueId` (e.g. `SA261`) — the system login ID
- `students.admission_no` = school's pre-existing admission number from CSV (optional, may be null)
- Plain passwords never stored — only used for PDF generation then garbage collected

### 5. `app/api/schools/[schoolCode]/students/route.ts` _(create)_
```
GET /api/schools/[schoolCode]/students
```
- `await params` (Next.js 16 params are a Promise)
- Call `getStudentsBySchoolCode` → 404 if null, 200 with array otherwise

### 6. `app/api/schools/[schoolCode]/import/students/route.ts` _(create)_
```
POST /api/schools/[schoolCode]/import/students
```
- `req.formData()` → get `file` field
- Validate: `.csv` extension only, size ≤ 5MB
- `file.text()` → strip UTF-8 BOM (`text.replace(/^\uFEFF/, "")`) to handle Excel exports
- Split on `/\r?\n/`, filter empty lines
- Validate headers contain all required columns → 422 if missing
- Per-row: `csvStudentRowSchema.parse(rawRow)` in a loop, collect errors as `"Row N: message (field: x)"`
- **All-or-nothing**: if ANY row invalid → return `{ success: false, errors, summary }` with 422, zero DB writes
- All valid → call `importStudents(schoolCode, validRows)` → return 201 on success

### 7. `app/super-admins/components/SchoolCard.tsx` _(create)_
- Props: `school: { id, schoolName, schoolCode }`, `onImportClick: (school) => void`
- Card with school name + code
- "View Details" → `<Button asChild><Link href="/super-admins/{schoolCode}/details">` (Radix Slot prevents `<button>` inside `<a>`)
- "Import Students" → calls `onImportClick(school)`

### 8. `app/super-admins/components/ImportStudentsModal.tsx` _(create)_
State machine via discriminated union: `"idle" | "uploading" | "success" | "error"`

- **Download Sample CSV**: generates a Blob client-side with header row + 2 example rows, triggers download
  - Header: `name,email,admission_no,roll_no,class,section,phone,guardian_name,guardian_phone`
  - Note: `admission_no` is optional in the template
- **File input**: `accept=".csv"`, client-side extension check on change, reset state on new file
- **Import button**: disabled if no file or uploading
- **Backdrop click** closes modal (`e.target === e.currentTarget`)
- On success: show green summary box + auto-trigger PDF download (base64 → Blob → `<a>.click()`)
- On error: show red scrollable error list with all row-level messages

### 9. `app/super-admins/components/SchoolsSection.tsx` _(modify)_
- Preserve: school fetch, `handleSuccess`, form toggle
- Replace `<ul>/<li>` with `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`
- Render `<SchoolCard>` per school
- Add `importTargetSchool: School | null` state — `null` = no modal open
- Render `<ImportStudentsModal>` at bottom when `importTargetSchool !== null`

### 10. `app/super-admins/[schoolCode]/details/components/StudentsTable.tsx` _(create)_
- Client component, `useEffect` fetches `/api/schools/{schoolCode}/students`
- Loading / error / empty states
- Table columns: Student Name | **Student ID** (`user.username`) | Admission No. (`admission_no` or "—") | Roll No. | Class+Section | Email | Phone | Created Date
- Null values render "—"

### 11. `app/super-admins/[schoolCode]/details/page.tsx` _(create)_
- Async Server Component, `await params` for `schoolCode`
- Renders: back button (`← Back` → `/super-admins`), page heading, `<StudentsTable schoolCode={schoolCode} />`

---

## CSV Template Format
```
name,email,admission_no,roll_no,class,section,phone,guardian_name,guardian_phone
```
- **Required**: `name`, `roll_no`, `class`, `section`, `guardian_name`, `guardian_phone`
- **Optional**: `email`, `phone`, `admission_no`

---

## Key Gotchas

| Risk | Mitigation |
|------|-----------|
| Excel CSV BOM prefix breaks header parse | Strip `\uFEFF` before splitting |
| Concurrent imports: same sequence → duplicate username | `users.username @unique` rolls back conflicting tx atomically |
| `admission_no` nullable with unique constraint | PostgreSQL NULL ≠ NULL in unique indexes — multiple NULLs allowed |
| `pdf-lib` only works in Node.js runtime | Default runtime is Node.js; never add `export const runtime = "edge"` to import route |
| `createManyAndReturn` availability | Available since Prisma 5.14; project uses 7.4.2 ✓ |
| bcrypt inside transaction holds tx open | Hash passwords with `Promise.all` **before** `$transaction` |
| Cross-row email duplicates | `User.email @unique` — add cross-row email duplicate check same as roll_no check |

---

## Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — `admission_no String?` |
| `schemas/student.schema.ts` | Create |
| `lib/student-id.ts` | Create |
| `lib/pdf-generator.ts` | Create |
| `services/student.service.ts` | Create |
| `app/api/schools/[schoolCode]/students/route.ts` | Create |
| `app/api/schools/[schoolCode]/import/students/route.ts` | Create |
| `app/super-admins/components/SchoolCard.tsx` | Create |
| `app/super-admins/components/ImportStudentsModal.tsx` | Create |
| `app/super-admins/components/SchoolsSection.tsx` | Modify |
| `app/super-admins/[schoolCode]/details/components/StudentsTable.tsx` | Create |
| `app/super-admins/[schoolCode]/details/page.tsx` | Create |

---

## Verification

1. `npx prisma migrate dev` completes with no errors
2. `npm run build` passes with no TypeScript errors
3. `/super-admins` renders a card grid (not a list)
4. "View Details" navigates to `/super-admins/{schoolCode}/details`
5. "Import Students" opens modal with correct school name
6. Download Sample CSV → file downloads with correct headers including optional `admission_no`
7. Upload non-CSV → alert shown, no request sent
8. Upload CSV with missing `guardian_name` → error: `"Row 2: Guardian name is required"`
9. Upload valid CSV (some rows with `admission_no`, some without) → success summary + PDF auto-downloads
10. PDF shows school name + Student Name | Student ID (`username`) | Temp Password
11. `/super-admins/SA/details` shows imported students; Student ID column shows `users.username` (e.g. `SA261`)
12. Students without `admission_no` show "—" in that column
