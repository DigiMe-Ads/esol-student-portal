# ESOL Premier Campus – Student Portal

React + Vite + Tailwind (shadcn/ui) conversion of the Medo "ESOL student portal" build. Same screens
and features: CRM, SIS, barcode attendance, timetable, LMS, exams, finance (LKR), portals, RBAC.

## Database

Runs on the **ESOL HR Suite** Supabase project (`qwsdnflnaehnycqqhmkf`) but only in its own schema,
`student_portal`. The HR Suite (`public`) and the feedback app (`epc_feedback`) are never read or changed.

- `supabase/00001_student_portal_schema.sql` – tables, portal accounts/sessions, RLS, RPCs
- `supabase/00002_seed_demo_data.sql` – the demo data the Medo app shipped with
- `supabase/00003_expose_schema.sql` – adds `student_portal` to the Data API's exposed schemas

All three are already applied. Sign-in does **not** use Supabase Auth (the HR Suite gives every auth user an
HR profile). Accounts live in `student_portal.users`; the app sends its session token as the
`x-portal-session` header and every table's RLS policy requires a live session.

The first account is `admin` (Super Admin). Its password is in `ADMIN_CREDENTIALS.local.txt` (gitignored).
Change it under **Settings & RBAC → Change Password**; add staff accounts under **Portal Accounts**.

## Local

```bash
npm install
npm run dev     # http://localhost:5180
```

## Deploy to Vercel

1. Push this folder to its own Git repo and import it in Vercel (framework: Vite – `vercel.json` handles SPA routes).
2. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as `.env`).
3. Deploy.
