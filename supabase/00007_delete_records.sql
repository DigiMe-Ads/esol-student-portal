-- Permanent deletion of students and lecturers (Super Admin only).
-- *_delete_summary tells the confirmation dialog what will go with the record; delete_* needs the
-- record's own number typed back (student number / staff ID) as a guard against misclicks.
-- Linked portal logins are removed too, so no login is left pointing at nothing.
-- Rows that reference the record are removed by the existing ON DELETE CASCADE foreign keys
-- (support tickets and class sessions are kept, just unlinked). Every delete is audited.
BEGIN;

CREATE FUNCTION student_portal.student_delete_summary(p_student uuid) RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  PERFORM _require_admin();
  RETURN json_build_object(
    'enrolments',   (SELECT count(*) FROM student_enrollments WHERE student_id = p_student),
    'invoices',     (SELECT count(*) FROM invoices WHERE student_id = p_student),
    'payments',     (SELECT count(*) FROM payments WHERE student_id = p_student),
    'attendance',   (SELECT count(*) FROM attendance_records WHERE student_id = p_student),
    'submissions',  (SELECT count(*) FROM lms_submissions WHERE student_id = p_student),
    'quiz_attempts',(SELECT count(*) FROM lms_quiz_attempts WHERE student_id = p_student),
    'exam_results', (SELECT count(*) FROM exam_registrations WHERE student_id = p_student),
    'certificates', (SELECT count(*) FROM certificates WHERE student_id = p_student),
    'logins',       (SELECT count(*) FROM users WHERE student_id = p_student));
END $$;

CREATE FUNCTION student_portal.delete_student(p_student uuid, p_confirm text) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE s students;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO s FROM students WHERE id = p_student;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Student not found.'; END IF;
  IF upper(trim(coalesce(p_confirm, ''))) <> upper(s.student_number) THEN
    RAISE EXCEPTION 'Type the student number % to confirm.', s.student_number;
  END IF;
  DELETE FROM users WHERE student_id = p_student;
  DELETE FROM students WHERE id = p_student;
  RETURN json_build_object('student_number', s.student_number, 'full_name', s.full_name, 'photo_url', s.photo_url);
END $$;

CREATE FUNCTION student_portal.lecturer_delete_summary(p_lecturer uuid) RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  PERFORM _require_admin();
  RETURN json_build_object(
    'allocations',  (SELECT count(*) FROM lecturer_allocations WHERE lecturer_id = p_lecturer),
    'sessions',     (SELECT count(*) FROM class_sessions WHERE lecturer_id = p_lecturer),
    'evaluations',  (SELECT count(*) FROM evaluation_responses WHERE lecturer_id = p_lecturer),
    'logins',       (SELECT count(*) FROM users WHERE lecturer_id = p_lecturer));
END $$;

CREATE FUNCTION student_portal.delete_lecturer(p_lecturer uuid, p_confirm text) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE l lecturers;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO l FROM lecturers WHERE id = p_lecturer;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Lecturer not found.'; END IF;
  IF upper(trim(coalesce(p_confirm, ''))) <> upper(l.lecturer_id) THEN
    RAISE EXCEPTION 'Type the staff ID % to confirm.', l.lecturer_id;
  END IF;
  DELETE FROM users WHERE lecturer_id = p_lecturer;
  DELETE FROM lecturers WHERE id = p_lecturer;   -- timetabled sessions stay, shown as "TBA"
  RETURN json_build_object('lecturer_id', l.lecturer_id, 'full_name', l.full_name);
END $$;

REVOKE EXECUTE ON FUNCTION student_portal.student_delete_summary(uuid), student_portal.delete_student(uuid, text),
  student_portal.lecturer_delete_summary(uuid), student_portal.delete_lecturer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION student_portal.student_delete_summary(uuid), student_portal.delete_student(uuid, text),
  student_portal.lecturer_delete_summary(uuid), student_portal.delete_lecturer(uuid, text) TO anon, authenticated;

COMMIT;
