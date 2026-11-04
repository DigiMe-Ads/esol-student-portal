-- Private storage bucket for portal uploads (lesson materials, slides). Kept apart from the HR Suite's
-- employee-files bucket: every policy below is limited to bucket_id = 'student-portal-files', so it adds
-- nothing to other buckets. Access needs a live portal session (x-portal-session header), the same
-- check as the student_portal tables. Files are opened through short-lived signed URLs.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('student-portal-files', 'student-portal-files', false, 52428800)  -- 50 MB per file
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "student-portal-files read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_session()));
CREATE POLICY "student-portal-files upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_session()));
CREATE POLICY "student-portal-files update" ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_session()))
  WITH CHECK (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_session()));
CREATE POLICY "student-portal-files delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_session()));

COMMIT;
