-- Student photos live in the private student-portal-files bucket under photos/<student id>/...
-- Staff who manage students upload/replace them; any staff member and the student (or their parent)
-- can view them, through short-lived signed URLs. students.photo_url stores "storage:photos/...".
BEGIN;

DROP POLICY "student-portal-files read" ON storage.objects;
DROP POLICY "student-portal-files upload" ON storage.objects;
DROP POLICY "student-portal-files delete" ON storage.objects;

CREATE POLICY "student-portal-files read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (
         (SELECT student_portal.is_staff())
      OR ((storage.foldername(name))[1] = 'lms' AND (SELECT student_portal.has_session()))
      OR ((storage.foldername(name))[1] IN ('submissions', 'payments', 'photos')
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)));

CREATE POLICY "student-portal-files upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-portal-files' AND (
         ((storage.foldername(name))[1] = 'lms' AND (SELECT student_portal.has_role('academic_coordinator', 'lecturer')))
      OR ((storage.foldername(name))[1] = 'photos' AND (SELECT student_portal.has_role('admissions', 'academic_coordinator', 'campus_manager')))
      OR ((storage.foldername(name))[1] = 'payments' AND (SELECT student_portal.has_role('finance', 'admissions')))
      OR ((storage.foldername(name))[1] = 'submissions' AND (SELECT student_portal.my_role()) = 'student'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)
      OR ((storage.foldername(name))[1] = 'payments'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)));

CREATE POLICY "student-portal-files delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (
         (SELECT student_portal.has_role('academic_coordinator', 'lecturer', 'finance'))
      OR ((storage.foldername(name))[1] = 'photos' AND (SELECT student_portal.has_role('admissions', 'academic_coordinator', 'campus_manager')))));

COMMIT;
