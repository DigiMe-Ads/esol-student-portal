-- ESOL Student Portal: everything lives in its own schema, student_portal, inside the ESOL HR Suite
-- Supabase project. Nothing in public (HR Suite) or epc_feedback (feedback app) is read or changed.
--
-- Logins do NOT use Supabase Auth: the HR Suite's on_auth_user_created trigger would give every auth
-- user an HR profile. Accounts are student_portal.users with bcrypt passwords. The app keeps an opaque
-- session token and sends it on every API request as the "x-portal-session" header; the RLS policies
-- below only let a request through when that header holds a live session.

BEGIN;

CREATE SCHEMA student_portal;

-- 1. Campuses
CREATE TABLE student_portal.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Departments
CREATE TABLE student_portal.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES student_portal.campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Programmes
CREATE TABLE student_portal.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES student_portal.departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    level TEXT NOT NULL,
    description TEXT,
    duration_months INT NOT NULL DEFAULT 6,
    total_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    registration_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Intakes
CREATE TABLE student_portal.intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ongoing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Batches
CREATE TABLE student_portal.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES student_portal.intakes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 35,
    room_number TEXT,
    schedule_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Modules
CREATE TABLE student_portal.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    credits INT NOT NULL DEFAULT 15,
    term TEXT NOT NULL DEFAULT 'Semester 1',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Inquiries (CRM)
CREATE TABLE student_portal.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_number TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    dob DATE,
    contact_number TEXT NOT NULL,
    whatsapp_number TEXT,
    email TEXT,
    parent_name TEXT,
    parent_contact TEXT,
    preferred_campus_id UUID REFERENCES student_portal.campuses(id) ON DELETE SET NULL,
    interested_programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE SET NULL,
    educational_background TEXT,
    school TEXT,
    source TEXT NOT NULL DEFAULT 'Website',
    assigned_to TEXT DEFAULT 'Admissions Team',
    status TEXT NOT NULL DEFAULT 'New Inquiry',
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Inquiry Follow-ups
CREATE TABLE student_portal.inquiry_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES student_portal.inquiries(id) ON DELETE CASCADE,
    contact_type TEXT NOT NULL DEFAULT 'Phone Call',
    outcome TEXT,
    notes TEXT NOT NULL,
    follow_up_date DATE,
    logged_by TEXT NOT NULL DEFAULT 'Admissions Officer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Students
CREATE TABLE student_portal.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    dob DATE,
    gender TEXT,
    address TEXT,
    emergency_contact TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    campus_id UUID REFERENCES student_portal.campuses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    photo_url TEXT,
    barcode_val TEXT NOT NULL UNIQUE,
    qr_code_val TEXT NOT NULL UNIQUE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Student Enrollments
CREATE TABLE student_portal.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE RESTRICT,
    intake_id UUID REFERENCES student_portal.intakes(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES student_portal.batches(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Lecturers
CREATE TABLE student_portal.lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    qualifications TEXT,
    specializations TEXT,
    employment_type TEXT NOT NULL DEFAULT 'Full-time',
    campus_id UUID REFERENCES student_portal.campuses(id) ON DELETE SET NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Lecturer Allocations
CREATE TABLE student_portal.lecturer_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID REFERENCES student_portal.lecturers(id) ON DELETE CASCADE,
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES student_portal.batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Class Sessions
CREATE TABLE student_portal.class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES student_portal.batches(id) ON DELETE CASCADE,
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES student_portal.lecturers(id) ON DELETE SET NULL,
    campus_id UUID REFERENCES student_portal.campuses(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Attendance Records
CREATE TABLE student_portal.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_session_id UUID REFERENCES student_portal.class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    scan_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'Present',
    scan_method TEXT NOT NULL DEFAULT 'Barcode',
    remarks TEXT,
    recorded_by TEXT DEFAULT 'Reception / Automated Scan',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_session_student_scan UNIQUE (class_session_id, student_id)
);

-- 15. LMS Courses & Materials
CREATE TABLE student_portal.lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.lms_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES student_portal.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'document',
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.lms_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES student_portal.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    max_score INT NOT NULL DEFAULT 100,
    rubric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.lms_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES student_portal.lms_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    score INT,
    feedback TEXT,
    graded_by TEXT,
    graded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE TABLE student_portal.lms_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES student_portal.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    time_limit_mins INT NOT NULL DEFAULT 30,
    passing_score INT NOT NULL DEFAULT 50,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.lms_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES student_portal.lms_quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Examinations & Results
CREATE TABLE student_portal.examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    exam_code TEXT NOT NULL UNIQUE,
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue TEXT NOT NULL,
    fee_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_attendance_pct INT NOT NULL DEFAULT 80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.exam_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES student_portal.examinations(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    eligibility_status TEXT NOT NULL DEFAULT 'Eligible',
    eligibility_reason TEXT,
    marks INT,
    grade TEXT,
    result_status TEXT NOT NULL DEFAULT 'Draft',
    approved_by TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

-- 17. Finance (Invoices & Payments in LKR)
CREATE TABLE student_portal.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    inquiry_id UUID REFERENCES student_portal.inquiries(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    invoice_id UUID REFERENCES student_portal.invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    payment_reference TEXT,
    proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'Verified',
    notes TEXT,
    verified_by TEXT DEFAULT 'Finance Desk',
    verified_at TIMESTAMPTZ DEFAULT now(),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Evaluations & Feedback
CREATE TABLE student_portal.evaluation_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE CASCADE,
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES student_portal.lecturers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Active',
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_portal.evaluation_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES student_portal.evaluation_forms(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES student_portal.lecturers(id) ON DELETE CASCADE,
    module_id UUID REFERENCES student_portal.modules(id) ON DELETE CASCADE,
    ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Documents & Certificates
CREATE TABLE student_portal.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES student_portal.programmes(id) ON DELETE CASCADE,
    qualification TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    verification_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Issued',
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Support Tickets
CREATE TABLE student_portal.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES student_portal.students(id) ON DELETE SET NULL,
    student_name TEXT,
    category TEXT NOT NULL DEFAULT 'Academic',
    priority TEXT NOT NULL DEFAULT 'Medium',
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_to TEXT DEFAULT 'Student Affairs',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. Audit Logs
CREATE TABLE student_portal.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_role TEXT NOT NULL DEFAULT 'Administrator',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. System Notifications
CREATE TABLE student_portal.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_role TEXT DEFAULT 'All',
    student_id UUID REFERENCES student_portal.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'In-app',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------- portal accounts & sessions

CREATE TABLE student_portal.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'super_admin',
    password_hash TEXT NOT NULL,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_format CHECK (username ~ '^[a-z0-9._-]{3,32}$'),
    CONSTRAINT role_valid CHECK (role IN ('super_admin', 'management', 'campus_manager', 'admissions', 'finance',
        'academic_coordinator', 'lecturer', 'exam_officer', 'receptionist', 'student', 'parent'))
);
CREATE UNIQUE INDEX users_username_key ON student_portal.users (username);

CREATE TABLE student_portal.sessions (
    token_hash BYTEA PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES student_portal.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX sessions_user_idx ON student_portal.sessions (user_id);

-- ---------------------------------------------------------------- session helpers

CREATE FUNCTION student_portal._request_token() RETURNS text
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT nullif(current_setting('request.headers', true), '')::json ->> 'x-portal-session';
$$;

CREATE FUNCTION student_portal._session_user() RETURNS student_portal.users
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal, extensions AS $$
  SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
   WHERE s.token_hash = digest(coalesce(_request_token(), ''), 'sha256') AND s.expires_at > now();
$$;

-- Used by every RLS policy; wrapped in (SELECT ...) there so it runs once per statement.
CREATE FUNCTION student_portal.has_session() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
  SELECT (_session_user()).id IS NOT NULL;
$$;

CREATE FUNCTION student_portal._require_admin() RETURNS uuid
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user();
BEGIN
  IF u.id IS NULL THEN RAISE EXCEPTION 'Your session has expired. Please sign in again.' USING ERRCODE = '28000'; END IF;
  IF u.role <> 'super_admin' THEN RAISE EXCEPTION 'Only a Super Admin can manage portal accounts.' USING ERRCODE = '42501'; END IF;
  RETURN u.id;
END $$;

CREATE FUNCTION student_portal._user_json(u student_portal.users) RETURNS json
  LANGUAGE sql IMMUTABLE AS $$
  SELECT json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name,
                           'role', u.role, 'created_at', u.created_at);
$$;

-- ---------------------------------------------------------------- auth RPCs

CREATE FUNCTION student_portal.sign_in(p_username text, p_password text) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
DECLARE u users; v_token text;
BEGIN
  SELECT * INTO u FROM users WHERE username = lower(trim(p_username));
  IF u.id IS NOT NULL AND u.locked_until > now() THEN
    RETURN json_build_object('error', 'Too many failed attempts. Try again in a few minutes.');
  END IF;
  IF u.id IS NULL OR u.password_hash <> crypt(coalesce(p_password, ''), u.password_hash) THEN
    IF u.id IS NOT NULL THEN
      UPDATE users SET failed_logins = failed_logins + 1,
        locked_until = CASE WHEN failed_logins + 1 >= 8 THEN now() + interval '15 minutes' END
       WHERE id = u.id;
    END IF;
    -- RETURN instead of RAISE so the failed-attempt counter is not rolled back
    RETURN json_build_object('error', 'Incorrect username or password.');
  END IF;
  UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = u.id;
  DELETE FROM sessions WHERE user_id = u.id AND expires_at < now();
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO sessions (token_hash, user_id) VALUES (digest(v_token, 'sha256'), u.id);
  RETURN json_build_object('token', v_token, 'user', _user_json(u));
END $$;

CREATE FUNCTION student_portal.sign_out() RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
  DELETE FROM sessions WHERE token_hash = digest(coalesce(_request_token(), ''), 'sha256');
$$;

CREATE FUNCTION student_portal.me() RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user();
BEGIN
  IF u.id IS NULL THEN RETURN NULL; END IF;
  RETURN _user_json(u);
END $$;

CREATE FUNCTION student_portal.change_password(p_old text, p_new text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
DECLARE u users := _session_user();
BEGIN
  IF u.id IS NULL THEN RAISE EXCEPTION 'Your session has expired. Please sign in again.' USING ERRCODE = '28000'; END IF;
  IF u.password_hash <> crypt(coalesce(p_old, ''), u.password_hash) THEN RAISE EXCEPTION 'Current password is incorrect.'; END IF;
  IF length(coalesce(p_new, '')) < 8 THEN RAISE EXCEPTION 'New password must be at least 8 characters.'; END IF;
  UPDATE users SET password_hash = crypt(p_new, gen_salt('bf', 10)) WHERE id = u.id;
  -- sign out every other device
  DELETE FROM sessions WHERE user_id = u.id AND token_hash <> digest(_request_token(), 'sha256');
END $$;

-- ---------------------------------------------------------------- account management (Super Admin)

CREATE FUNCTION student_portal.list_users() RETURNS json
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  PERFORM _require_admin();
  RETURN coalesce((SELECT json_agg(_user_json(u) ORDER BY u.created_at) FROM users u), '[]'::json);
END $$;

CREATE FUNCTION student_portal.create_user(p_username text, p_display_name text, p_role text, p_password text) RETURNS json
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
DECLARE v_name text := lower(trim(p_username)); u users;
BEGIN
  PERFORM _require_admin();
  IF v_name !~ '^[a-z0-9._-]{3,32}$' THEN
    RAISE EXCEPTION 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore.';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters.'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE username = v_name) THEN RAISE EXCEPTION 'That username is already taken.'; END IF;
  INSERT INTO users (username, display_name, role, password_hash)
  VALUES (v_name, coalesce(nullif(trim(p_display_name), ''), v_name), p_role, crypt(p_password, gen_salt('bf', 10)))
  RETURNING * INTO u;
  RETURN _user_json(u);
END $$;

CREATE FUNCTION student_portal.reset_user_password(p_user uuid, p_password text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal, extensions AS $$
BEGIN
  PERFORM _require_admin();
  IF length(coalesce(p_password, '')) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters.'; END IF;
  UPDATE users SET password_hash = crypt(p_password, gen_salt('bf', 10)), failed_logins = 0, locked_until = NULL
   WHERE id = p_user;
  DELETE FROM sessions WHERE user_id = p_user;
END $$;

CREATE FUNCTION student_portal.delete_user(p_user uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
BEGIN
  IF _require_admin() = p_user THEN RAISE EXCEPTION 'You cannot delete the account you are signed in with.'; END IF;
  DELETE FROM users WHERE id = p_user;
END $$;

-- ---------------------------------------------------------------- access control

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'campuses', 'departments', 'programmes', 'intakes', 'batches', 'modules',
        'inquiries', 'inquiry_followups', 'students', 'student_enrollments',
        'lecturers', 'lecturer_allocations', 'class_sessions', 'attendance_records',
        'lms_courses', 'lms_materials', 'lms_assignments', 'lms_submissions',
        'lms_quizzes', 'lms_quiz_attempts', 'examinations', 'exam_registrations',
        'invoices', 'payments', 'evaluation_forms', 'evaluation_responses',
        'certificates', 'support_tickets', 'audit_logs', 'system_notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE student_portal.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('CREATE POLICY signed_in_access ON student_portal.%I FOR ALL TO anon, authenticated
                          USING ((SELECT student_portal.has_session())) WITH CHECK ((SELECT student_portal.has_session()))', tbl);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON student_portal.%I TO anon, authenticated', tbl);
    END LOOP;
END $$;

-- Accounts and sessions are reachable only through the functions above.
ALTER TABLE student_portal.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_portal.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON student_portal.users, student_portal.sessions FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA student_portal TO anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA student_portal FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
    student_portal.has_session(),
    student_portal.sign_in(text, text),
    student_portal.sign_out(),
    student_portal.me(),
    student_portal.change_password(text, text),
    student_portal.list_users(),
    student_portal.create_user(text, text, text, text),
    student_portal.reset_user_password(uuid, text),
    student_portal.delete_user(uuid)
  TO anon, authenticated;

COMMIT;
