# Notifications Feature — Bug / Edge-Case Audit

## Summary

Reviewed the full Notifications surface:
- **API** — [route.ts](app/api/notifications/route.ts) (list + create), [[id]/route.ts](app/api/notifications/[id]/route.ts) (delete), [[id]/read/route.ts](app/api/notifications/[id]/read/route.ts), [unread-count/route.ts](app/api/notifications/unread-count/route.ts), [class-sections/route.ts](app/api/notifications/class-sections/route.ts)
- **Service** — [notifications.service.ts](services/notifications.service.ts)
- **Schema** — [notifications.schema.ts](schemas/notifications.schema.ts)
- **UI** — [NotificationsSection.tsx](components/notifications/NotificationsSection.tsx), [CreateNotificationModal.tsx](components/notifications/CreateNotificationModal.tsx), [NotificationCard.tsx](components/notifications/NotificationCard.tsx), [NotificationDetailModal.tsx](components/notifications/NotificationDetailModal.tsx), [utils.ts](components/notifications/utils.ts), badge in [sidebar-nav.tsx](components/layout/sidebar-nav.tsx)
- **Prisma** — [Notification / NotificationRead](prisma/schema.prisma#L261-L289)

Status legend: ✅ Fixed in this change · 🔭 Documented / deferred.

---

## 🐞 Bugs

### BUG 1 — Whitespace-only title/message bypasses validation ✅
> Severity: Medium — data quality

`createNotificationSchema` validated `min(1)` **before** the service called `.trim()`. A title of
`"   "` (3 spaces) passed Zod (length 3), then the service trimmed it to `""` and stored an empty
notification.

**Fix:** the Zod schema now uses `.trim().min(1).max(...)` so validation runs on the trimmed value
(and the stored value is pre-trimmed; the service no longer re-trims).

### BUG 2 — Ambiguous deleted-creator inbox visibility; comment contradicts code ✅
> Severity: Low — correctness/clarity

Inbox visibility used `NOT: { created_by: userId }`. The header comment claimed notifications from a
since-deleted creator (`created_by: null`) were *excluded*, yet the UI renders them as `"Deleted User"`
(implying they should show). Prisma's `NOT`-on-scalar NULL handling is ambiguous, so the real behavior
was unreliable.

**Fix:** intent is now explicit — `OR: [{ created_by: null }, { created_by: { not: userId } }]`
(extracted as a `notOwnNotification()` helper) and the comment corrected. Deleted-creator
notifications reliably appear in inboxes.

### BUG 3 — TEACHER/ALL audience ignores class/section, but the UI sets + labels it ✅
> Severity: Low-Medium — targeting correctness / UX

Teacher visibility deliberately ignores class/section (no teacher↔class mapping exists), yet the create
form let you choose a class for **any** audience and `audienceLabel` printed e.g. `"Teachers · Class 5-A"`
even though every teacher received it.

**Fix:** the create form now disables Class/Section selects (with a "applies to students only" hint)
when audience = TEACHER, and the service coerces `target_class`/`target_section` → `null` for
TEACHER-audience notifications so no misleading targeting is stored.

---

## ⚠️ Edge Cases

### EDGE 1 — No rate limiting on read (PATCH) and unread-count (GET) ✅
The [read route](app/api/notifications/[id]/read/route.ts) and
[unread-count route](app/api/notifications/unread-count/route.ts) had no `checkRateLimit`, while
POST/list/DELETE did. unread-count is fetched on every page mount.

**Fix:** read PATCH now uses `writeLimiter`; unread-count GET uses `expensiveReadLimiter`.

### EDGE 4 — `target_class`/`target_section` unvalidated and unbounded ✅
Schema accepted `z.string().min(1).nullable()` — no max length and no existence check, so a crafted
API call could target a non-existent "Class 99 / Section Z" (a notification visible to nobody) or send
unbounded strings.

**Fix:** added `.max(50)` to both. (Existence validation against the school's real class list is left
to the UI, which already constrains the options.)

### EDGE 5 — class/section persisted even when audience = TEACHER ✅
Companion to BUG 3 — the server stored meaningless targeting for TEACHER notifications.
**Fix:** coerced to `null` in `createNotification` (see BUG 3).

### EDGE 2 — Offset pagination can duplicate/skip on concurrent inserts 🔭
`getNotificationsForUser` uses `skip/take`. A notification created between "Load more" page fetches
shifts the window → the last item of the previous page repeats (React key collision) or an item is
skipped. **Recommendation:** cursor pagination keyed on `(created_at, id)`. *Deferred.*

### EDGE 3 — Unread badge is stale until a full page navigation 🔭
[sidebar-nav.tsx](components/layout/sidebar-nav.tsx) fetches unread-count only on mount and then just
decrements by 1 per read event. New notifications don't bump the badge in real time, and the local
decrement can drift from the true count over a long session. **Recommendation:** lightweight polling
(e.g. 60s) or a refetch on window focus. *Deferred.*

### EDGE 6 — Arbitrary school chosen for multi-school users 🔭
`resolveSchoolId` / `buildVisibilityWhere` use `schoolUser.findFirst({ where: { user_id, status: ACTIVE } })`
with no disambiguation. Non-deterministic if a user ever belongs to >1 school. Low risk today (one school
per user). *Deferred — note for any future multi-school support.*

### EDGE 7 — Hard delete, no soft-delete / undo 🔭
`deleteNotification` permanently deletes and cascades `NotificationRead`. Consistent with the rest of the
app; flagged for awareness. *Deferred.*

---

## ✅ Things that are correct

| Aspect | Status |
|--------|--------|
| Auth on every route | ✅ `session?.user` checked |
| Role gating | ✅ create/delete = ADMIN/TEACHER; read/list/unread = ADMIN/TEACHER/STUDENT |
| Multi-tenancy (`school_id`) | ✅ all queries school-scoped |
| Audience isolation | ✅ students never see TEACHER-only; teachers never see STUDENT-only |
| Class/section visibility (students) | ✅ null = school-wide; matched otherwise |
| `markAsRead` authorization | ✅ re-checks visibility before recording a read |
| Delete authorization | ✅ teacher own-only; admin same-school membership re-verified |
| Idempotent reads | ✅ upsert + `@@unique([notification_id, user_id])` |
| XSS safety | ✅ JSX escaping + `whitespace-pre-wrap`; no `dangerouslySetInnerHTML` |
| Fetch cleanup | ✅ AbortController on the class-section fetch |
| Badge resilience | ✅ unread-count returns 0 on error so the badge never breaks |

---

## ➕ Feature added — file/document attachment on create

A single optional attachment (PDF · image · Office doc) can now be attached when creating a notification:
- `Notification` gains `attachment_url` / `attachment_type` (`image|pdf|doc`) / `attachment_name`.
- The shared [upload route](app/api/upload/attachment/route.ts) now accepts Office formats
  (docx/xlsx/pptx + legacy) alongside images/PDF, returns the original filename, and allows up to 10MB.
- A `res.cloudinary.com` host allowlist (shared [lib/attachment.ts](lib/attachment.ts)) prevents storing
  arbitrary external links.
- Students/teachers/admins can open or download the attachment from the notification detail modal; the
  card shows a paperclip indicator.
