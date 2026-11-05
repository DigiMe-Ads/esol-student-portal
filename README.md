# ESOL Premier Campus – Student Portal

React + Vite + Tailwind (shadcn/ui) conversion of the Medo "ESOL student portal" build. Same screens
and features: CRM, SIS, barcode attendance, timetable, LMS, exams, finance (LKR), portals, RBAC.

## Database

Runs on the **ESOL HR Suite** Supabase project (`qwsdnflnaehnycqqhmkf`) but only in its own schema,
`student_portal`. The HR Suite (`public`) and the feedback app (`epc_feedback`) are never read or changed.

- `supabase/00001_student_portal_schema.sql` – tables, portal accounts/sessions, RLS, RPCs
- `supabase/00002_seed_demo_data.sql` – the demo data the Medo app shipped with
- `supabase/00003_expose_schema.sql` – adds `student_portal` to the Data API's exposed schemas
- `supabase/00004_file_storage.sql` – private `student-portal-files` bucket for uploads (50 MB per file)
- `supabase/00006_student_photos.sql` – private student photos (staff who manage students upload; staff and the student/parent view)
- `supabase/00005_roles_and_access.sql` – per-role access rules, account links, server-side actions, audit trail, rooms, alumni
- `supabase/00007_delete_records.sql` / `00008_restrict_deletes.sql` – Super-Admin-only permanent delete of students and lecturers (with linked logins), readable audit lines

All eight are already applied. Sign-in does **not** use Supabase Auth (the HR Suite gives every auth user an
HR profile). Accounts live in `student_portal.users`; the app sends its session token as the
`x-portal-session` header and every table's RLS policy requires a live session.

The first account is `admin` (Super Admin). Its password is in `ADMIN_CREDENTIALS.local.txt` (gitignored).
Change it under **Settings & RBAC → Change Password**; add staff accounts under **Portal Accounts**.

## Roles

Every table is protected per role in the database (not just hidden in the UI):

| Role | Can use |
| --- | --- |
| Super Admin | everything, account management, can preview any role / student / lecturer portal |
| Campus Management | dashboard, CRM, students, finance (read), academics, timetable, exams, evaluations, alumni, communications, reports, audit log |
| Campus Manager | academics & timetable (edit), attendance, lecturers, rooms & reservations, tickets, reports |
| Admissions | CRM, add/convert students + their logins, finance (invoices & desk payments), alumni, tickets |
| Finance | invoices, desk payments, verify/reject payment slips, reports |
| Academic Coordinator | programmes/modules/intakes/batches, timetable, LMS authoring, exams, attendance |
| Lecturer | own portal (sessions, register, slides), LMS authoring & grading, attendance, own evaluations |
| Exam Officer | exams (schedule, eligibility, marks, publish), certificates |
| Reception | CRM inquiries, attendance scanning, tickets, room bookings |
| Student | own portal (timetable, attendance, results, fees + slip upload, ID card, certificates, tickets, notices, evaluations) and own courses in the LMS |
| Parent | read-only view of their child's portal, slip upload, tickets |

Student, parent and lecturer logins must be linked to their record (Settings → Portal Accounts, or the
student's 360° view). Test accounts for every role are listed in `TEST_ACCOUNTS.local.txt` (gitignored);
delete them in Settings → Portal Accounts when you no longer need them.

## Network path

The browser never calls `*.supabase.co` directly: requests go to `/supabase/*` on the portal's own domain,
which `vercel.json` (and the Vite dev server) forward to the project. This avoids networks that block or
time out on supabase.co. Set `VITE_SUPABASE_DIRECT=true` to bypass the proxy.

Uploaded files are stored as `storage:<path>` in `lms_materials.url` and opened with 10-minute signed links.

## Local

```bash
npm install
npm run dev     # http://localhost:5180
```

## Deploy to Vercel

1. Push this folder to its own Git repo and import it in Vercel (framework: Vite – `vercel.json` handles SPA routes).
2. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as `.env`).
3. Deploy.
