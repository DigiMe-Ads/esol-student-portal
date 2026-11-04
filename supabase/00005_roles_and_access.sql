-- Real per-role access for the student portal.
--
-- * Portal accounts can be linked to a student (student / parent accounts) or a lecturer.
-- * Staff roles read everything except finance, CRM and audit data, which only the roles that use
--   them can read; each staff role can only WRITE the tables its modules manage.
-- * Students and parents see only their own (or their child's) records plus the shared catalogue
--   (programmes, timetable, their own courses' LMS content). They can submit work, payment slips,
--   tickets, quiz answers and evaluations; nothing else.
-- * Multi-step operations (enrolment, payments, quiz grading, exam eligibility) run as functions so
--   they are atomic and can't be faked from the browser.
-- * Every change to key tables is written to audit_logs by a trigger; audit rows can't be edited.
BEGIN;

-- ================================================================ schema additions

ALTER TABLE student_portal.users
    ADD COLUMN student_id  UUID REFERENCES student_portal.students(id) ON DELETE SET NULL,
    ADD COLUMN lecturer_id UUID REFERENCES student_portal.lecturers(id) ON DELETE SET NULL;

ALTER TABLE student_portal.system_notifications
    ADD COLUMN target_batch_id UUID REFERENCES student_portal.batches(id) ON DELETE CASCADE,
    ADD COLUMN sent_by TEXT;

CREATE TABLE student_portal.rooms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id  UUID REFERENCES student_portal.campuses(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'Lecture Hall',
    capacity   INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rooms_name_campus UNIQUE (campus_id, name)
);

CREATE TABLE student_portal.room_bookings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    UUID NOT NULL REFERENCES student_portal.rooms(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time   TIME NOT NULL,
    purpose    TEXT NOT NULL,
    booked_by  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT booking_times CHECK (end_time > start_time)
);

CREATE TABLE student_portal.alumni_profiles (
    student_id       UUID PRIMARY KEY REFERENCES student_portal.students(id) ON DELETE CASCADE,
    graduation_year  INT,
    current_position TEXT,
    organization     TEXT,
    notes            TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz answers live apart from the questions so students (who can read lms_quizzes) never see them.
CREATE TABLE student_portal.lms_quiz_keys (
    quiz_id UUID PRIMARY KEY REFERENCES student_portal.lms_quizzes(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb   -- {"<question id>": <correct option index>}
);
INSERT INTO student_portal.lms_quiz_keys (quiz_id, answers)
SELECT q.id, coalesce(jsonb_object_agg(e ->> 'id', (e ->> 'correctAnswer')::int) FILTER (WHERE e ? 'correctAnswer'), '{}'::jsonb)
  FROM student_portal.lms_quizzes q LEFT JOIN LATERAL jsonb_array_elements(q.questions) e ON true
 GROUP BY q.id;
UPDATE student_portal.lms_quizzes q
   SET questions = coalesce((SELECT jsonb_agg(e - 'correctAnswer') FROM jsonb_array_elements(q.questions) e), '[]'::jsonb);

-- One evaluation per student per lecturer+module, without storing who wrote which response.
CREATE TABLE student_portal.evaluation_receipts (
    student_id  UUID NOT NULL REFERENCES student_portal.students(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES student_portal.lecturers(id) ON DELETE CASCADE,
    module_id   UUID NOT NULL REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, lecturer_id, module_id)
);

ALTER TABLE student_portal.evaluation_responses ALTER COLUMN form_id DROP NOT NULL;

-- Student numbers come from a sequence (count+1 collided after deletions).
CREATE SEQUENCE student_portal.student_number_seq;
SELECT setval('student_portal.student_number_seq',
  greatest(1, coalesce((SELECT max(nullif(regexp_replace(student_number, '^.*-', ''), '')::int) FROM student_portal.students), 0)),
  (SELECT count(*) > 0 FROM student_portal.students));

INSERT INTO student_portal.rooms (campus_id, name, kind, capacity)
SELECT c.id, r.name, r.kind, r.capacity
  FROM (VALUES
    ('COL-01', 'Hall 302', 'Multimedia Lecture Hall', 60),
    ('COL-01', 'Hall 201', 'Lecture Room', 40),
    ('COL-01', 'Hall 204', 'Language Lab & Audio Studio', 35),
    ('COL-01', 'Language Lab 1', 'Language Lab', 30),
    ('KDY-02', 'Seminar Room K1', 'Seminar Room', 45),
    ('GAL-03', 'Room G1', 'Lecture Room', 30)
  ) AS r(code, name, kind, capacity)
  JOIN student_portal.campuses c ON c.code = r.code;

-- ================================================================ identity helpers

CREATE FUNCTION student_portal.my_role() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT (_session_user()).role;
$$;

CREATE FUNCTION student_portal.my_student_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT CASE WHEN u.role IN ('student', 'parent') THEN u.student_id END FROM (SELECT (_session_user()).*) u;
$$;

CREATE FUNCTION student_portal.is_staff() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT coalesce((_session_user()).role NOT IN ('student', 'parent'), false);
$$;

-- true when the signed-in account has one of the given roles (Super Admin always passes)
CREATE FUNCTION student_portal.has_role(VARIADIC p_roles text[]) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT coalesce((_session_user()).role = 'super_admin' OR (_session_user()).role = ANY (p_roles), false);
$$;

CREATE FUNCTION student_portal.my_programme_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT programme_id FROM student_enrollments WHERE student_id = my_student_id();
$$;

CREATE FUNCTION student_portal.my_batch_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT batch_id FROM student_enrollments WHERE student_id = my_student_id() AND batch_id IS NOT NULL;
$$;

CREATE FUNCTION student_portal.course_visible(p_course uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT is_staff() OR EXISTS (
    SELECT 1 FROM lms_courses c JOIN modules m ON m.id = c.module_id
     WHERE c.id = p_course AND m.programme_id IN (SELECT my_programme_ids()));
$$;

-- ================================================================ policies

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
      'campuses', 'departments', 'programmes', 'intakes', 'batches', 'modules',
      'inquiries', 'inquiry_followups', 'students', 'student_enrollments',
      'lecturers', 'lecturer_allocations', 'class_sessions', 'attendance_records',
      'lms_courses', 'lms_materials', 'lms_assignments', 'lms_submissions',
      'lms_quizzes', 'lms_quiz_attempts', 'examinations', 'exam_registrations',
      'invoices', 'payments', 'evaluation_forms', 'evaluation_responses',
      'certificates', 'support_tickets', 'audit_logs', 'system_notifications'])
  LOOP
    EXECUTE format('DROP POLICY signed_in_access ON student_portal.%I', t);
  END LOOP;

  FOR t IN SELECT unnest(ARRAY['rooms', 'room_bookings', 'alumni_profiles', 'lms_quiz_keys', 'evaluation_receipts']) LOOP
    EXECUTE format('ALTER TABLE student_portal.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON student_portal.%I TO anon, authenticated', t);
  END LOOP;
END $$;

-- helper: one call per table group
CREATE FUNCTION student_portal._policies(p_tables text[], p_read text, p_write text) RETURNS void
  LANGUAGE plpgsql AS $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY p_tables LOOP
    IF p_read IS NOT NULL THEN
      EXECUTE format('CREATE POLICY staff_read ON student_portal.%I FOR SELECT TO anon, authenticated USING (%s)', t, p_read);
    END IF;
    IF p_write IS NOT NULL THEN
      EXECUTE format('CREATE POLICY staff_insert ON student_portal.%I FOR INSERT TO anon, authenticated WITH CHECK (%s)', t, p_write);
      EXECUTE format('CREATE POLICY staff_update ON student_portal.%I FOR UPDATE TO anon, authenticated USING (%s) WITH CHECK (%s)', t, p_write, p_write);
      EXECUTE format('CREATE POLICY staff_delete ON student_portal.%I FOR DELETE TO anon, authenticated USING (%s)', t, p_write);
    END IF;
  END LOOP;
END $$;

-- Staff reads/writes by module. (SELECT ...) wrappers make each check run once per statement.
SELECT student_portal._policies(ARRAY['campuses', 'departments', 'programmes', 'intakes', 'batches', 'modules',
         'lecturers', 'lecturer_allocations', 'rooms'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''academic_coordinator'', ''campus_manager''))');
SELECT student_portal._policies(ARRAY['class_sessions'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''academic_coordinator'', ''campus_manager''))');
SELECT student_portal._policies(ARRAY['room_bookings'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''academic_coordinator'', ''campus_manager'', ''receptionist'', ''lecturer''))');
SELECT student_portal._policies(ARRAY['inquiries', 'inquiry_followups'],
  '(SELECT student_portal.has_role(''management'', ''admissions'', ''receptionist''))',
  '(SELECT student_portal.has_role(''admissions'', ''receptionist''))');
SELECT student_portal._policies(ARRAY['students', 'student_enrollments'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''admissions'', ''academic_coordinator'', ''campus_manager''))');
SELECT student_portal._policies(ARRAY['invoices', 'payments'],
  '(SELECT student_portal.has_role(''management'', ''finance'', ''admissions'', ''exam_officer''))',
  '(SELECT student_portal.has_role(''finance'', ''admissions''))');
SELECT student_portal._policies(ARRAY['attendance_records'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''campus_manager'', ''receptionist'', ''lecturer'', ''academic_coordinator''))');
SELECT student_portal._policies(ARRAY['lms_courses', 'lms_materials', 'lms_assignments', 'lms_submissions',
         'lms_quizzes', 'lms_quiz_keys', 'lms_quiz_attempts'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''academic_coordinator'', ''lecturer''))');
SELECT student_portal._policies(ARRAY['examinations', 'exam_registrations'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''exam_officer'', ''academic_coordinator''))');
SELECT student_portal._policies(ARRAY['certificates'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''exam_officer''))');
SELECT student_portal._policies(ARRAY['evaluation_forms'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''management'', ''academic_coordinator''))');
SELECT student_portal._policies(ARRAY['evaluation_responses'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''super_admin''))');
SELECT student_portal._policies(ARRAY['support_tickets', 'system_notifications'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.is_staff())');
SELECT student_portal._policies(ARRAY['alumni_profiles'],
  '(SELECT student_portal.is_staff())',
  '(SELECT student_portal.has_role(''admissions'', ''management''))');
SELECT student_portal._policies(ARRAY['audit_logs'],
  '(SELECT student_portal.has_role(''management''))', NULL);
-- evaluation_receipts: no policies at all (written only by submit_evaluation)
DROP FUNCTION student_portal._policies(text[], text, text);

-- Audit rows are append-only, and only the trigger writes them.
REVOKE INSERT, UPDATE, DELETE ON student_portal.audit_logs FROM anon, authenticated;

-- ---- students & parents: read the shared catalogue
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['campuses', 'departments', 'programmes', 'intakes', 'batches', 'modules',
                               'lecturers', 'class_sessions', 'examinations', 'evaluation_forms', 'rooms']) LOOP
    EXECUTE format('CREATE POLICY member_read ON student_portal.%I FOR SELECT TO anon, authenticated
                      USING ((SELECT student_portal.my_student_id()) IS NOT NULL)', t);
  END LOOP;
  -- ...and their own records
  FOR t IN SELECT unnest(ARRAY['student_enrollments', 'attendance_records', 'invoices', 'payments',
                               'certificates', 'lms_submissions', 'lms_quiz_attempts', 'support_tickets']) LOOP
    EXECUTE format('CREATE POLICY own_read ON student_portal.%I FOR SELECT TO anon, authenticated
                      USING (student_id = (SELECT student_portal.my_student_id()))', t);
  END LOOP;
END $$;

CREATE POLICY own_read ON student_portal.students FOR SELECT TO anon, authenticated
  USING (id = (SELECT student_portal.my_student_id()));
-- results stay hidden until published; unmarked registrations show eligibility
CREATE POLICY own_read ON student_portal.exam_registrations FOR SELECT TO anon, authenticated
  USING (student_id = (SELECT student_portal.my_student_id()) AND (result_status = 'Published' OR marks IS NULL));
CREATE POLICY own_read ON student_portal.alumni_profiles FOR SELECT TO anon, authenticated
  USING (student_id = (SELECT student_portal.my_student_id()));

CREATE POLICY member_read ON student_portal.lms_courses FOR SELECT TO anon, authenticated
  USING (student_portal.course_visible(id));
CREATE POLICY member_read ON student_portal.lms_materials FOR SELECT TO anon, authenticated
  USING (student_portal.course_visible(course_id));
CREATE POLICY member_read ON student_portal.lms_assignments FOR SELECT TO anon, authenticated
  USING (student_portal.course_visible(course_id));
CREATE POLICY member_read ON student_portal.lms_quizzes FOR SELECT TO anon, authenticated
  USING (student_portal.course_visible(course_id));

CREATE POLICY member_read ON student_portal.system_notifications FOR SELECT TO anon, authenticated
  USING ((SELECT student_portal.my_student_id()) IS NOT NULL AND (
         student_id = (SELECT student_portal.my_student_id())
      OR target_batch_id IN (SELECT student_portal.my_batch_ids())
      OR (student_id IS NULL AND target_batch_id IS NULL AND user_role IN ('All', (SELECT student_portal.my_role())))));

-- ---- students & parents: what they may write
CREATE POLICY own_insert ON student_portal.support_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = (SELECT student_portal.my_student_id()) AND status = 'Open' AND resolution_notes IS NULL);

CREATE POLICY own_insert ON student_portal.payments FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = (SELECT student_portal.my_student_id()) AND status = 'Pending' AND verified_at IS NULL
              AND EXISTS (SELECT 1 FROM student_portal.invoices i WHERE i.id = invoice_id AND i.student_id = payments.student_id));

-- only the student (not the parent) submits coursework, and never sets a grade
CREATE POLICY own_insert ON student_portal.lms_submissions FOR INSERT TO anon, authenticated
  WITH CHECK ((SELECT student_portal.my_role()) = 'student' AND student_id = (SELECT student_portal.my_student_id())
              AND score IS NULL AND feedback IS NULL AND graded_by IS NULL AND graded_at IS NULL);
CREATE POLICY own_update ON student_portal.lms_submissions FOR UPDATE TO anon, authenticated
  USING ((SELECT student_portal.my_role()) = 'student' AND student_id = (SELECT student_portal.my_student_id()) AND score IS NULL)
  WITH CHECK (student_id = (SELECT student_portal.my_student_id()) AND score IS NULL AND graded_by IS NULL AND graded_at IS NULL);

-- ================================================================ functions

-- accounts now carry student / lecturer links
DROP FUNCTION student_portal.create_user(text, text, text, text);
DROP FUNCTION student_portal.list_users();
DROP FUNCTION student_portal.me();
DROP FUNCTION student_portal._user_json(student_portal.users);

CREATE FUNCTION student_portal._user_json(u student_portal.users) RETURNS json
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                           'role', u.role, 'created_at', u.created_at,
                           'student_id', u.student_id, 'lecturer_id', u.lecturer_id,
                           'student_name', (SELECT full_name FROM students WHERE id = u.student_id),
                           'lecturer_name', (SELECT full_name FROM lecturers WHERE id = u.lecturer_id));
$$;

CREATE FUNCTION student_portal.me() RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user();
BEGIN
  IF u.id IS NULL THEN RETURN NULL; END IF;
  RETURN _user_json(u);
END $$;

CREATE FUNCTION student_portal.list_users() RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  PERFORM _require_admin();
  RETURN coalesce((SELECT json_agg(_user_json(u) ORDER BY u.created_at) FROM users u), '[]'::json);
END $$;

CREATE FUNCTION student_portal._check_links(p_role text, p_student uuid, p_lecturer uuid) RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  IF p_role IN ('student', 'parent') AND p_student IS NULL THEN
    RAISE EXCEPTION 'Student and parent accounts must be linked to a student record.';
  END IF;
  IF p_role = 'lecturer' AND p_lecturer IS NULL THEN
    RAISE EXCEPTION 'Lecturer accounts must be linked to a lecturer record.';
  END IF;
END $$;

-- Super Admin can create any account; admissions staff can create student/parent logins.
CREATE FUNCTION student_portal.create_user(p_username text, p_display_name text, p_role text, p_password text,
                                           p_student uuid DEFAULT NULL, p_lecturer uuid DEFAULT NULL) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
DECLARE v_name text := lower(trim(p_username)); u users;
BEGIN
  IF NOT (has_role('super_admin') OR (has_role('admissions') AND p_role IN ('student', 'parent'))) THEN
    RAISE EXCEPTION 'You are not allowed to create this kind of account.' USING ERRCODE = '42501';
  END IF;
  IF v_name !~ '^[a-z0-9._-]{3,32}$' THEN
    RAISE EXCEPTION 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore.';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters.'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE username = v_name) THEN RAISE EXCEPTION 'That username is already taken.'; END IF;
  PERFORM _check_links(p_role, p_student, p_lecturer);
  INSERT INTO users (username, display_name, role, password_hash, student_id, lecturer_id)
  VALUES (v_name, coalesce(nullif(trim(p_display_name), ''), v_name), p_role, crypt(p_password, gen_salt('bf', 10)),
          CASE WHEN p_role IN ('student', 'parent') THEN p_student END,
          CASE WHEN p_role = 'lecturer' THEN p_lecturer END)
  RETURNING * INTO u;
  RETURN _user_json(u);
END $$;

-- Logins that belong to one student (for the student's 360° view)
CREATE FUNCTION student_portal.student_logins(p_student uuid) RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  IF NOT has_role('admissions') THEN RETURN '[]'::json; END IF;
  RETURN coalesce((SELECT json_agg(_user_json(u) ORDER BY u.role DESC) FROM users u WHERE u.student_id = p_student), '[]'::json);
END $$;

CREATE FUNCTION student_portal.next_student_number() RETURNS text
  LANGUAGE sql SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT 'EPC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('student_number_seq')::text, 5, '0');
$$;

-- Creates a student + enrolment (+ optional registration invoice and payment) in one transaction.
-- Used by "Add Student" and by CRM inquiry conversion.
CREATE FUNCTION student_portal.enroll_student(p jsonb) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE
  v_actor users := _session_user();
  v_num text; v_student students; v_batch batches; v_prog programmes;
  v_fee numeric := coalesce((p ->> 'registration_fee')::numeric, 0);
  v_paid numeric := coalesce((p ->> 'amount_paid')::numeric, 0);
  v_inv invoices;
BEGIN
  IF NOT has_role('admissions', 'academic_coordinator', 'campus_manager') THEN
    RAISE EXCEPTION 'You are not allowed to register students.' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(p ->> 'full_name'), '') = '' OR coalesce(trim(p ->> 'phone'), '') = '' THEN
    RAISE EXCEPTION 'Full name and phone number are required.';
  END IF;
  SELECT * INTO v_prog FROM programmes WHERE id = (p ->> 'programme_id')::uuid;
  IF v_prog.id IS NULL THEN RAISE EXCEPTION 'Choose a programme.'; END IF;
  IF p ->> 'batch_id' IS NOT NULL THEN
    SELECT b.* INTO v_batch FROM batches b JOIN intakes i ON i.id = b.intake_id
     WHERE b.id = (p ->> 'batch_id')::uuid AND i.programme_id = v_prog.id;
    IF v_batch.id IS NULL THEN RAISE EXCEPTION 'That batch does not belong to the chosen programme.'; END IF;
  END IF;
  IF v_paid < 0 OR v_fee < 0 OR v_paid > v_fee THEN RAISE EXCEPTION 'Amount paid must be between 0 and the registration fee.'; END IF;

  v_num := next_student_number();
  INSERT INTO students (student_number, full_name, email, phone, whatsapp, dob, gender, address, emergency_contact,
                        parent_name, parent_phone, parent_email, campus_id, status, barcode_val, qr_code_val, photo_url)
  VALUES (v_num, trim(p ->> 'full_name'), nullif(p ->> 'email', ''), trim(p ->> 'phone'), nullif(p ->> 'whatsapp', ''),
          nullif(p ->> 'dob', '')::date, nullif(p ->> 'gender', ''), nullif(p ->> 'address', ''), nullif(p ->> 'emergency_contact', ''),
          nullif(p ->> 'parent_name', ''), nullif(p ->> 'parent_phone', ''), nullif(p ->> 'parent_email', ''),
          nullif(p ->> 'campus_id', '')::uuid, 'Active', v_num, v_num, nullif(p ->> 'photo_url', ''))
  RETURNING * INTO v_student;

  INSERT INTO student_enrollments (student_id, programme_id, intake_id, batch_id, status)
  VALUES (v_student.id, v_prog.id, v_batch.intake_id, v_batch.id, 'Active');

  IF v_fee > 0 THEN
    INSERT INTO invoices (invoice_number, student_id, inquiry_id, programme_id, title, total_amount, paid_amount, balance_due, due_date, status)
    VALUES ('INV-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6)), v_student.id,
            nullif(p ->> 'inquiry_id', '')::uuid, v_prog.id, 'Registration & Enrollment Fee', v_fee, v_paid, v_fee - v_paid,
            coalesce(nullif(p ->> 'due_date', '')::date, current_date + 14),
            CASE WHEN v_paid >= v_fee THEN 'Paid' WHEN v_paid > 0 THEN 'Partial' ELSE 'Pending' END)
    RETURNING * INTO v_inv;
    IF v_paid > 0 THEN
      INSERT INTO payments (receipt_number, invoice_id, student_id, amount, payment_method, payment_reference, status, notes, verified_by, verified_at)
      VALUES ('REC-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6)), v_inv.id, v_student.id, v_paid,
              coalesce(nullif(p ->> 'payment_method', ''), 'Cash'), nullif(p ->> 'payment_reference', ''), 'Verified',
              'Registration payment taken at enrolment.', v_actor.display_name, now());
    END IF;
  END IF;

  IF p ->> 'inquiry_id' IS NOT NULL THEN
    UPDATE inquiries SET status = 'Registered', updated_at = now() WHERE id = (p ->> 'inquiry_id')::uuid;
  END IF;

  RETURN json_build_object('student', row_to_json(v_student), 'invoice', row_to_json(v_inv));
END $$;

CREATE FUNCTION student_portal._apply_payment(p_invoice uuid, p_amount numeric) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = student_portal AS $$
  UPDATE invoices
     SET paid_amount = paid_amount + p_amount,
         balance_due = greatest(0, total_amount - (paid_amount + p_amount)),
         status = CASE WHEN total_amount - (paid_amount + p_amount) <= 0 THEN 'Paid' ELSE 'Partial' END
   WHERE id = p_invoice;
$$;

-- Finance desk records a payment it has received (verified straight away)
CREATE FUNCTION student_portal.record_payment(p_invoice uuid, p_amount numeric, p_method text, p_reference text, p_notes text)
  RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE v_actor users := _session_user(); v_inv invoices; v_pay payments;
BEGIN
  IF NOT has_role('finance', 'admissions') THEN RAISE EXCEPTION 'Only finance staff can record payments.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice FOR UPDATE;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF coalesce(p_amount, 0) <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero.'; END IF;
  IF p_amount > v_inv.balance_due THEN RAISE EXCEPTION 'Amount is more than the balance due (LKR %).', v_inv.balance_due; END IF;
  INSERT INTO payments (receipt_number, invoice_id, student_id, amount, payment_method, payment_reference, status, notes, verified_by, verified_at)
  VALUES ('REC-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6)), v_inv.id, v_inv.student_id, p_amount,
          coalesce(nullif(p_method, ''), 'Cash'), nullif(p_reference, ''), 'Verified', nullif(p_notes, ''), v_actor.display_name, now())
  RETURNING * INTO v_pay;
  PERFORM _apply_payment(v_inv.id, p_amount);
  RETURN row_to_json(v_pay);
END $$;

-- Approve a slip a student/parent submitted
CREATE FUNCTION student_portal.verify_payment(p_payment uuid) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE v_actor users := _session_user(); v_pay payments; v_inv invoices;
BEGIN
  IF NOT has_role('finance') THEN RAISE EXCEPTION 'Only finance staff can verify payments.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_pay FROM payments WHERE id = p_payment FOR UPDATE;
  IF v_pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF v_pay.status <> 'Pending' THEN RAISE EXCEPTION 'This payment is already %.', lower(v_pay.status); END IF;
  SELECT * INTO v_inv FROM invoices WHERE id = v_pay.invoice_id FOR UPDATE;
  IF v_pay.amount > v_inv.balance_due THEN
    RAISE EXCEPTION 'Slip amount (LKR %) is more than the invoice balance (LKR %).', v_pay.amount, v_inv.balance_due;
  END IF;
  UPDATE payments SET status = 'Verified', verified_by = v_actor.display_name, verified_at = now()
   WHERE id = p_payment RETURNING * INTO v_pay;
  PERFORM _apply_payment(v_pay.invoice_id, v_pay.amount);
  INSERT INTO system_notifications (student_id, title, message, sent_by)
  VALUES (v_pay.student_id, 'Payment verified', format('Your payment of LKR %s (receipt %s) has been verified.', v_pay.amount, v_pay.receipt_number), v_actor.display_name);
  RETURN row_to_json(v_pay);
END $$;

CREATE FUNCTION student_portal.reject_payment(p_payment uuid, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE v_actor users := _session_user(); v_pay payments;
BEGIN
  IF NOT has_role('finance') THEN RAISE EXCEPTION 'Only finance staff can reject payments.' USING ERRCODE = '42501'; END IF;
  UPDATE payments SET status = 'Rejected', notes = coalesce(nullif(p_reason, ''), 'Rejected by finance'),
                      verified_by = v_actor.display_name, verified_at = now()
   WHERE id = p_payment AND status = 'Pending' RETURNING * INTO v_pay;
  IF v_pay.id IS NULL THEN RAISE EXCEPTION 'Only pending payments can be rejected.'; END IF;
  INSERT INTO system_notifications (student_id, title, message, sent_by)
  VALUES (v_pay.student_id, 'Payment slip rejected', format('Your payment slip for LKR %s was rejected: %s', v_pay.amount, v_pay.notes), v_actor.display_name);
END $$;

-- Grades a quiz on the server. Students' attempts are recorded; staff get a preview score only.
CREATE FUNCTION student_portal.submit_quiz(p_quiz uuid, p_answers jsonb) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE
  v_role text := my_role(); v_student uuid := my_student_id();
  v_quiz lms_quizzes; v_key jsonb; v_total int; v_correct int := 0; v_q jsonb; v_score int; v_passed boolean;
BEGIN
  IF v_role IS NULL THEN RAISE EXCEPTION 'Your session has expired. Please sign in again.' USING ERRCODE = '28000'; END IF;
  IF v_role = 'parent' THEN RAISE EXCEPTION 'Only students can take quizzes.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_quiz FROM lms_quizzes WHERE id = p_quiz;
  IF v_quiz.id IS NULL OR NOT course_visible(v_quiz.course_id) THEN RAISE EXCEPTION 'Quiz not found.'; END IF;
  SELECT answers INTO v_key FROM lms_quiz_keys WHERE quiz_id = p_quiz;
  v_total := jsonb_array_length(v_quiz.questions);
  FOR v_q IN SELECT * FROM jsonb_array_elements(v_quiz.questions) LOOP
    IF v_key ? (v_q ->> 'id') AND (p_answers ->> (v_q ->> 'id')) IS NOT NULL
       AND (p_answers ->> (v_q ->> 'id'))::int = (v_key ->> (v_q ->> 'id'))::int THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;
  v_score := CASE WHEN v_total > 0 THEN round(100.0 * v_correct / v_total) ELSE 0 END;
  v_passed := v_score >= v_quiz.passing_score;
  IF v_role = 'student' THEN
    INSERT INTO lms_quiz_attempts (quiz_id, student_id, score, total_questions, passed)
    VALUES (p_quiz, v_student, v_score, v_total, v_passed);
  END IF;
  RETURN json_build_object('score', v_score, 'correct', v_correct, 'total', v_total, 'passed', v_passed,
                           'recorded', v_role = 'student');
END $$;

CREATE FUNCTION student_portal.submit_evaluation(p_lecturer uuid, p_module uuid, p_rating int, p_comments text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE v_student uuid := my_student_id(); v_form uuid;
BEGIN
  IF my_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Only students can submit lecturer evaluations.' USING ERRCODE = '42501'; END IF;
  IF p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM modules WHERE id = p_module AND programme_id IN (SELECT my_programme_ids())) THEN
    RAISE EXCEPTION 'You can only evaluate modules in your own programme.';
  END IF;
  BEGIN
    INSERT INTO evaluation_receipts (student_id, lecturer_id, module_id) VALUES (v_student, p_lecturer, p_module);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already evaluated this lecturer for this module.';
  END;
  SELECT id INTO v_form FROM evaluation_forms
   WHERE lecturer_id = p_lecturer AND module_id = p_module AND status = 'Active' LIMIT 1;
  INSERT INTO evaluation_responses (form_id, lecturer_id, module_id, ratings, comments)
  VALUES (v_form, p_lecturer, p_module, jsonb_build_object('overall', p_rating), nullif(trim(p_comments), ''));
END $$;

-- What a student has already evaluated (so the UI can hide those)
CREATE FUNCTION student_portal.my_evaluations() RETURNS json
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT coalesce(json_agg(json_build_object('lecturer_id', lecturer_id, 'module_id', module_id)), '[]'::json)
    FROM evaluation_receipts WHERE student_id = my_student_id();
$$;

-- Attendance % for a student in one module (sessions of their batch held up to today)
CREATE FUNCTION student_portal._attendance_pct(p_student uuid, p_module uuid) RETURNS numeric
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  WITH held AS (
    SELECT cs.id FROM class_sessions cs
     WHERE cs.module_id = p_module AND cs.date <= current_date AND cs.status <> 'Cancelled'
       AND cs.batch_id IN (SELECT batch_id FROM student_enrollments WHERE student_id = p_student))
  SELECT CASE WHEN (SELECT count(*) FROM held) = 0 THEN NULL
              ELSE round(100.0 * (SELECT count(*) FROM attendance_records a
                                   WHERE a.student_id = p_student AND a.class_session_id IN (SELECT id FROM held)
                                     AND a.status IN ('Present', 'Late', 'Excused')) / (SELECT count(*) FROM held), 1) END;
$$;

-- Registers every actively enrolled student of the exam's programme and (re)checks eligibility:
-- attendance >= exam.min_attendance_pct and no outstanding invoice balance.
CREATE FUNCTION student_portal.register_exam_candidates(p_exam uuid) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE v_exam examinations; v_prog uuid; r record; v_pct numeric; v_due numeric; v_reason text; v_added int := 0; v_checked int := 0;
BEGIN
  IF NOT has_role('exam_officer', 'academic_coordinator') THEN RAISE EXCEPTION 'Only exam officers can register candidates.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_exam FROM examinations WHERE id = p_exam;
  IF v_exam.id IS NULL THEN RAISE EXCEPTION 'Exam not found.'; END IF;
  SELECT programme_id INTO v_prog FROM modules WHERE id = v_exam.module_id;
  FOR r IN SELECT DISTINCT e.student_id FROM student_enrollments e JOIN students s ON s.id = e.student_id
            WHERE e.programme_id = v_prog AND e.status = 'Active' AND s.status IN ('Active', 'Registered') LOOP
    v_pct := _attendance_pct(r.student_id, v_exam.module_id);
    SELECT coalesce(sum(balance_due), 0) INTO v_due FROM invoices WHERE student_id = r.student_id;
    v_reason := concat_ws('; ',
      CASE WHEN v_pct IS NOT NULL AND v_pct < v_exam.min_attendance_pct
           THEN format('Attendance %s%% is below %s%%', v_pct, v_exam.min_attendance_pct) END,
      CASE WHEN v_due > 0 THEN format('Outstanding fees LKR %s', v_due) END);
    INSERT INTO exam_registrations (exam_id, student_id, eligibility_status, eligibility_reason)
    VALUES (p_exam, r.student_id, CASE WHEN v_reason = '' THEN 'Eligible' ELSE 'Ineligible' END,
            coalesce(nullif(v_reason, ''), CASE WHEN v_pct IS NULL THEN 'No sessions held yet; fees clear' ELSE format('Attendance %s%%; fees clear', v_pct) END))
    ON CONFLICT (exam_id, student_id) DO UPDATE
       SET eligibility_status = EXCLUDED.eligibility_status, eligibility_reason = EXCLUDED.eligibility_reason
     WHERE exam_registrations.marks IS NULL;
    IF FOUND THEN v_checked := v_checked + 1; END IF;
  END LOOP;
  SELECT count(*) INTO v_added FROM exam_registrations WHERE exam_id = p_exam;
  RETURN json_build_object('checked', v_checked, 'registered', v_added);
END $$;

-- Public certificate check (used by the QR code; no sign-in needed)
CREATE FUNCTION student_portal.verify_certificate(p_code text) RETURNS json
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT json_build_object('certificate_number', c.certificate_number, 'student_name', s.full_name,
                           'student_number', s.student_number, 'programme', p.name, 'qualification', c.qualification,
                           'issue_date', c.issue_date, 'status', c.status)
    FROM certificates c JOIN students s ON s.id = c.student_id LEFT JOIN programmes p ON p.id = c.programme_id
   WHERE c.verification_code = p_code OR c.certificate_number = p_code
   LIMIT 1;
$$;

-- ================================================================ audit trail

CREATE FUNCTION student_portal._audit() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user(); v_old jsonb; v_new jsonb; v_changed text;
BEGIN
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'password_hash' END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'password_hash' END;
  IF TG_OP = 'UPDATE' THEN
    SELECT string_agg(k, ', ') INTO v_changed FROM jsonb_object_keys(v_new) k
     WHERE v_new -> k IS DISTINCT FROM v_old -> k AND k NOT IN ('updated_at', 'failed_logins', 'locked_until');
    IF v_changed IS NULL THEN RETURN NULL; END IF;
  END IF;
  INSERT INTO audit_logs (user_role, action, entity_type, entity_id, details, ip_address)
  VALUES (coalesce(u.display_name || ' (' || u.role || ')', 'System'), TG_OP, TG_TABLE_NAME,
          coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'student_id', v_old ->> 'student_id'),
          CASE TG_OP
            WHEN 'INSERT' THEN 'Created ' || coalesce(v_new ->> 'student_number', v_new ->> 'invoice_number', v_new ->> 'receipt_number',
                                 v_new ->> 'ref_number', v_new ->> 'ticket_number', v_new ->> 'certificate_number', v_new ->> 'exam_code',
                                 v_new ->> 'username', v_new ->> 'code', v_new ->> 'title', v_new ->> 'name', '')
            WHEN 'UPDATE' THEN 'Changed: ' || v_changed
            ELSE 'Deleted ' || coalesce(v_old ->> 'student_number', v_old ->> 'username', v_old ->> 'code', v_old ->> 'title', v_old ->> 'name', '')
          END,
          NULL);
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users', 'students', 'student_enrollments', 'inquiries', 'invoices', 'payments',
                               'programmes', 'modules', 'intakes', 'batches', 'lecturers', 'class_sessions',
                               'examinations', 'exam_registrations', 'certificates', 'lms_materials', 'lms_assignments',
                               'lms_quizzes', 'support_tickets', 'system_notifications', 'room_bookings', 'rooms']) LOOP
    EXECUTE format('CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON student_portal.%I
                      FOR EACH ROW EXECUTE FUNCTION student_portal._audit()', t);
  END LOOP;
END $$;

-- ================================================================ storage: per-folder access
-- lms/<course>/...            staff write; anyone signed in reads
-- submissions/<student>/...   that student writes; staff and the student/parent read
-- payments/<student>/...      that student/parent writes; finance staff and the student/parent read
DROP POLICY "student-portal-files read" ON storage.objects;
DROP POLICY "student-portal-files upload" ON storage.objects;
DROP POLICY "student-portal-files update" ON storage.objects;
DROP POLICY "student-portal-files delete" ON storage.objects;

CREATE POLICY "student-portal-files read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (
         (SELECT student_portal.is_staff())
      OR ((storage.foldername(name))[1] = 'lms' AND (SELECT student_portal.has_session()))
      OR ((storage.foldername(name))[1] IN ('submissions', 'payments')
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)));
CREATE POLICY "student-portal-files upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-portal-files' AND (
         ((storage.foldername(name))[1] = 'lms' AND (SELECT student_portal.has_role('academic_coordinator', 'lecturer')))
      OR ((storage.foldername(name))[1] = 'payments' AND (SELECT student_portal.has_role('finance', 'admissions')))
      OR ((storage.foldername(name))[1] = 'submissions' AND (SELECT student_portal.my_role()) = 'student'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)
      OR ((storage.foldername(name))[1] = 'payments'
          AND (storage.foldername(name))[2] = (SELECT student_portal.my_student_id())::text)));
CREATE POLICY "student-portal-files delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'student-portal-files' AND (SELECT student_portal.has_role('academic_coordinator', 'lecturer', 'finance')));

-- ================================================================ grants

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA student_portal FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
    student_portal.has_session(), student_portal.my_role(), student_portal.my_student_id(),
    student_portal.is_staff(), student_portal.has_role(text[]), student_portal.my_programme_ids(),
    student_portal.my_batch_ids(), student_portal.course_visible(uuid),
    student_portal.sign_in(text, text), student_portal.sign_out(), student_portal.me(),
    student_portal.change_password(text, text), student_portal.list_users(),
    student_portal.create_user(text, text, text, text, uuid, uuid), student_portal.student_logins(uuid),
    student_portal.reset_user_password(uuid, text), student_portal.delete_user(uuid),
    student_portal.enroll_student(jsonb), student_portal.record_payment(uuid, numeric, text, text, text),
    student_portal.verify_payment(uuid), student_portal.reject_payment(uuid, text),
    student_portal.submit_quiz(uuid, jsonb), student_portal.submit_evaluation(uuid, uuid, int, text),
    student_portal.my_evaluations(), student_portal.register_exam_candidates(uuid),
    student_portal.verify_certificate(text)
  TO anon, authenticated;
GRANT USAGE ON SEQUENCE student_portal.student_number_seq TO anon, authenticated;

COMMIT;
