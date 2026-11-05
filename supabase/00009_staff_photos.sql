-- Lecturer (staff) photos: student-portal-files bucket, folder staff/<lecturer id>/...
-- Uploaded and replaced by the roles that manage lecturers (Academic Coordinator, Campus Manager, Super Admin);
-- readable by all staff (already covered by the staff read rule). lecturers.photo_url stores "storage:staff/...".
BEGIN;

DROP POLICY "student-portal-files upload" ON storage.objects;
DROP POLICY "student-portal-files delete" ON storage.objects;

CREATE POLICY "student-portal-files upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-portal-files' AND (
         ((storage.foldername(name))[1] = 'lms' AND (SELECT student_portal.has_role('academic_coordinator', 'lecturer')))
      OR ((storage.foldername(name))[1] = 'photos' AND (SELECT student_portal.has_role('admissions', 'academic_coordinator', 'campus_manager')))
      OR ((storage.foldername(name))[1] = 'staff' AND (SELECT student_portal.has_role('academic_coordinator', 'campus_manager')))
      OR ((storage.foldername(name))[1] = 'payments' AND (SELECT student_portal.has_role('finance', 'admissions')))
      OR ((storage.foldername(name))[1] = 'submissions' AND (SELECT student_portal.my_role()) = 'student'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)
      OR ((storage.foldername(name))[1] = 'payments'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)));

CREATE POLICY "student-portal-files delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (
         (SELECT student_portal.has_role('academic_coordinator', 'lecturer', 'finance'))
      OR ((storage.foldername(name))[1] = 'photos' AND (SELECT student_portal.has_role('admissions', 'academic_coordinator', 'campus_manager')))
      OR ((storage.foldername(name))[1] = 'staff' AND (SELECT student_portal.has_role('academic_coordinator', 'campus_manager')))));

COMMIT;
