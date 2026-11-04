-- Demo data from the Medo build (the same rows the original app shipped with).
BEGIN;

-- Insert Campuses
INSERT INTO student_portal.campuses (id, name, code, address, contact_phone, contact_email, is_active)
VALUES
('a0000000-0000-0000-0000-000000000001', 'Colombo City Campus (Headquarters)', 'COL-01', 'No. 425 Galle Road, Colombo 03, Sri Lanka', '+94 11 257 8900', 'colombo@esolpremier.edu.lk', true),
('a0000000-0000-0000-0000-000000000002', 'Kandy Hill Campus', 'KDY-02', 'No. 88 Peradeniya Road, Kandy, Sri Lanka', '+94 81 223 4567', 'kandy@esolpremier.edu.lk', true),
('a0000000-0000-0000-0000-000000000003', 'Galle Coastal Centre', 'GAL-03', 'No. 14 Wakwella Road, Galle, Sri Lanka', '+94 91 224 8899', 'galle@esolpremier.edu.lk', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Departments
INSERT INTO student_portal.departments (id, campus_id, name, code)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'School of English Language & Linguistics', 'SELL'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'School of Teacher Training & Pedagogy', 'STTP'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Cambridge International Examination Centre', 'CIEC')
ON CONFLICT DO NOTHING;

-- Insert Programmes
INSERT INTO student_portal.programmes (id, department_id, name, code, level, description, duration_months, total_fee, registration_fee, is_active)
VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Diploma in Professional English & Communication', 'DPEC-101', 'Diploma (NVQ Level 5)', 'Comprehensive professional English programme for corporate communication, writing, and presentation mastery.', 6, 145000.00, 15000.00, true),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Cambridge English C1 Advanced (CAE) Preparation', 'CAE-201', 'Advanced Level', 'Intensive preparation for Cambridge C1 Advanced examination with exam techniques, mock papers, and oral coaching.', 4, 98000.00, 10000.00, true),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Certificate in Teaching English to Speakers of Other Languages (CELTA/TESL Prep)', 'TESL-301', 'Professional Certificate', 'Classroom methodology, phonetics, lesson planning, and supervised practicum for prospective English educators.', 5, 88000.00, 10000.00, true),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'IELTS Academic & General Training Masterclass', 'IELTS-401', 'Exam Preparation', 'Comprehensive 8-week target-band training covering Listening, Reading, Academic Writing, and Speaking interviews.', 2, 55000.00, 8000.00, true),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Higher National Diploma (HND) in English Studies', 'HND-501', 'Higher National Diploma', 'Accredited 2-year higher national diploma in applied linguistics, literature, and educational psychology.', 18, 480000.00, 25000.00, true)
ON CONFLICT (code) DO NOTHING;

-- Insert Intakes
INSERT INTO student_portal.intakes (id, programme_id, name, code, start_date, end_date, status)
VALUES
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026 Batch 01 (Spring)', 'DPEC-2026-B1', '2026-02-01', '2026-08-01', 'Ongoing'),
('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '2026 Cambridge Autumn Intake', 'CAE-2026-AUT', '2026-03-15', '2026-07-15', 'Ongoing'),
('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'TESL 2026 Intensive', 'TESL-2026-INT', '2026-04-01', '2026-09-01', 'Ongoing')
ON CONFLICT DO NOTHING;

-- Insert Batches
INSERT INTO student_portal.batches (id, intake_id, name, code, capacity, room_number, schedule_summary)
VALUES
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'DPEC Weekend Batch A', 'DPEC-26A', 35, 'Hall 302 (Multimedia)', 'Saturdays & Sundays 09:00 - 13:00'),
('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'CAE Fast-Track Evening', 'CAE-26E', 25, 'Language Lab 1', 'Tuesdays & Thursdays 17:30 - 20:00'),
('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'TESL Saturday Cohort', 'TESL-26S', 30, 'Hall 201 (Lecture Room)', 'Saturdays 08:30 - 16:30')
ON CONFLICT DO NOTHING;

-- Insert Modules
INSERT INTO student_portal.modules (id, programme_id, name, code, credits, term, description)
VALUES
('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Advanced Business Writing & Reporting', 'DPEC-M1', 15, 'Term 1', 'Executive business correspondence, report synthesis, and technical drafting.'),
('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Public Speaking & Oral Rhetoric', 'DPEC-M2', 15, 'Term 1', 'Persuasive speaking, presentation visual aids, debate, and executive pitch dynamics.'),
('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Cambridge C1 Reading & Use of English', 'CAE-M1', 20, 'Term 1', 'Collocations, idioms, sentence transformations, and complex text deconstruction.'),
('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Classroom Pedagogy & Microteaching', 'TESL-M1', 20, 'Term 1', 'Lesson plan structuring, student motivation, phonetics instruction, and peer practicum.')
ON CONFLICT DO NOTHING;

-- Insert Lecturers
INSERT INTO student_portal.lecturers (id, lecturer_id, full_name, email, phone, qualifications, specializations, employment_type, campus_id, photo_url, status)
VALUES
('10000000-0000-0000-0000-000000000001', 'LEC-0101', 'Dr. Manjula Senanayake', 'm.senanayake@esolpremier.edu.lk', '+94 77 123 4567', 'Ph.D. in Applied Linguistics (Univ of Kelaniya), MA (Leeds)', 'Linguistics, Discourse Analysis, Business Rhetoric', 'Full-time', 'a0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'Active'),
('10000000-0000-0000-0000-000000000002', 'LEC-0102', 'Prof. Priyantha Fernando', 'p.fernando@esolpremier.edu.lk', '+94 71 890 1234', 'M.Ed. in TESL, Cambridge CELTA & DELTA Assessor', 'Cambridge Exam Pedagogy, Phonology, IELTS Masterclasses', 'Full-time', 'a0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'Active'),
('10000000-0000-0000-0000-000000000003', 'LEC-0103', 'Ms. Dilrukshi Jayawardena', 'd.jaya@esolpremier.edu.lk', '+94 76 555 9876', 'BA (Hons) in English (Colombo), CELTA Certified', 'Oral Communication, Academic Writing, Phonetics', 'Visiting', 'a0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'Active')
ON CONFLICT (lecturer_id) DO NOTHING;

-- Insert Lecturer Allocations
INSERT INTO student_portal.lecturer_allocations (id, lecturer_id, module_id, batch_id)
VALUES
('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002'),
('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Insert Students
INSERT INTO student_portal.students (id, student_number, full_name, email, phone, whatsapp, dob, gender, address, emergency_contact, parent_name, parent_phone, parent_email, campus_id, status, photo_url, barcode_val, qr_code_val, enrollment_date)
VALUES
('20000000-0000-0000-0000-000000000001', 'EPC-2026-00001', 'Kavinda Dinushan Perera', 'kavinda.perera@gmail.com', '+94 77 412 8899', '+94 77 412 8899', '2004-05-14', 'Male', 'No 24, Templers Road, Mount Lavinia, Colombo', '+94 11 273 1122 (Mother)', 'Sunil Perera', '+94 71 223 9988', 'sunil.p@sltnet.lk', 'a0000000-0000-0000-0000-000000000001', 'Active', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80', 'EPC-2026-00001', 'EPC-2026-00001', '2026-02-05'),
('20000000-0000-0000-0000-000000000002', 'EPC-2026-00002', 'Ananya Rashmika Bandara', 'ananya.bandara@outlook.com', '+94 76 908 1234', '+94 76 908 1234', '2003-11-20', 'Female', '45/2 Rajapihilla Mawatha, Kandy', '+94 81 220 4455 (Father)', 'Gamini Bandara', '+94 77 334 7788', 'gamini.bandara@gmail.com', 'a0000000-0000-0000-0000-000000000002', 'Active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', 'EPC-2026-00002', 'EPC-2026-00002', '2026-02-08'),
('20000000-0000-0000-0000-000000000003', 'EPC-2026-00003', 'Tharushi Nilakshika Silva', 'tharushi.silva@yahoo.com', '+94 70 334 5566', '+94 70 334 5566', '2005-02-18', 'Female', '112 Main Street, Moratuwa, Colombo', '+94 11 264 5566 (Mother)', 'Nirmala Silva', '+94 72 889 0011', 'nirmala.silva@gmail.com', 'a0000000-0000-0000-0000-000000000001', 'Active', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', 'EPC-2026-00003', 'EPC-2026-00003', '2026-02-12'),
('20000000-0000-0000-0000-000000000004', 'EPC-2026-00004', 'Mohamed Rishard Farook', 'm.rishard@gmail.com', '+94 75 667 8901', '+94 75 667 8901', '2002-09-03', 'Male', '89 Matara Road, Galle', '+94 91 222 3456 (Brother)', 'Farook Marikar', '+94 77 889 2233', 'farook.m@gmail.com', 'a0000000-0000-0000-0000-000000000003', 'Active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'EPC-2026-00004', 'EPC-2026-00004', '2026-02-15')
ON CONFLICT (student_number) DO NOTHING;

-- Insert Student Enrollments
INSERT INTO student_portal.student_enrollments (id, student_id, programme_id, intake_id, batch_id, status, enrolled_date)
VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Active', '2026-02-05'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Active', '2026-02-08'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Active', '2026-02-12'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Active', '2026-02-15')
ON CONFLICT DO NOTHING;

-- Insert Inquiries
INSERT INTO student_portal.inquiries (id, ref_number, student_name, dob, contact_number, whatsapp_number, email, parent_name, parent_contact, preferred_campus_id, interested_programme_id, educational_background, school, source, assigned_to, status, notes, follow_up_date)
VALUES
('40000000-0000-0000-0000-000000000001', 'INQ-2026-1001', 'Sanuthi Jayasinghe', '2005-08-12', '+94 71 445 6677', '+94 71 445 6677', 'sanuthi.j@gmail.com', 'Nimal Jayasinghe', '+94 77 889 0011', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'G.C.E. Advanced Level 2025 (Arts Stream - 3 Passes)', 'Visakha Vidyalaya Colombo', 'Facebook', 'Chamari Wickramasinghe', 'New Inquiry', 'Wants to improve English fluency for overseas higher education.', '2026-10-12'),
('40000000-0000-0000-0000-000000000002', 'INQ-2026-1002', 'Dhanushka Randil Alwis', '2004-03-25', '+94 76 112 3344', '+94 76 112 3344', 'dhanushka.alwis@yahoo.com', 'Sujith Alwis', '+94 71 334 5566', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'G.C.E. A/L Commerce Stream', 'Ananda College Colombo', 'Walk-in', 'Chamari Wickramasinghe', 'Contacted', 'Walked in with parents. Very interested in CAE certification.', '2026-10-14'),
('40000000-0000-0000-0000-000000000003', 'INQ-2026-1003', 'Hansi Methma Gunawardena', '2003-12-19', '+94 77 990 8811', '+94 77 990 8811', 'hansi.methma@gmail.com', 'Chitral Gunawardena', '+94 71 889 2233', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Undergraduate at Peradeniya University', 'Mahamaya Girls College Kandy', 'Instagram', 'Kasun Rajapaksa', 'Counselling Completed', 'Completed academic counselling. Planning to join TESL weekend batch.', '2026-10-15'),
('40000000-0000-0000-0000-000000000004', 'INQ-2026-1004', 'Nuwan Chathuranga Kumara', '2001-07-04', '+94 70 889 4433', '+94 70 889 4433', 'nuwan.kumara@live.com', NULL, NULL, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Employed as Software QA Engineer', 'D.S. Senanayake College', 'Website', 'Chamari Wickramasinghe', 'Payment Pending', 'Registration invoice generated. Promised to wire initial deposit by Friday.', '2026-10-16'),
('40000000-0000-0000-0000-000000000005', 'INQ-2026-1005', 'Fathima Shamila Razik', '2004-10-10', '+94 78 554 2211', '+94 78 554 2211', 'shamila.razik@gmail.com', 'Razik Mohamed', '+94 77 445 1199', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'A/L Bio Science stream', 'Southlands College Galle', 'Referral', 'Kasun Rajapaksa', 'Registered', 'Successfully converted to registered student EPC-2026-00004.', '2026-10-01')
ON CONFLICT (ref_number) DO NOTHING;

-- Insert Invoices & Payments (in LKR)
INSERT INTO student_portal.invoices (id, invoice_number, student_id, inquiry_id, programme_id, title, total_amount, paid_amount, balance_due, due_date, status)
VALUES
('50000000-0000-0000-0000-000000000001', 'INV-2026-0001', '20000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', 'Registration & Tuition Installment 1 (DPEC)', 75000.00, 75000.00, 0.00, '2026-02-15', 'Paid'),
('50000000-0000-0000-0000-000000000002', 'INV-2026-0002', '20000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', 'Term 2 Tuition Installment (DPEC)', 70000.00, 35000.00, 35000.00, '2026-10-25', 'Partial'),
('50000000-0000-0000-0000-000000000003', 'INV-2026-0003', '20000000-0000-0000-0000-000000000002', NULL, 'c0000000-0000-0000-0000-000000000002', 'CAE Full Course Fee & Exam Registration', 108000.00, 108000.00, 0.00, '2026-02-20', 'Paid'),
('50000000-0000-0000-0000-000000000004', 'INV-2026-0004', '20000000-0000-0000-0000-000000000003', NULL, 'c0000000-0000-0000-0000-000000000001', 'DPEC Registration & Term 1 Fee', 75000.00, 75000.00, 0.00, '2026-02-28', 'Paid')
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO student_portal.payments (id, receipt_number, invoice_id, student_id, amount, payment_method, payment_reference, status, notes, verified_by, verified_at, payment_date)
VALUES
('60000000-0000-0000-0000-000000000001', 'REC-2026-0081', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 75000.00, 'Bank Transfer', 'BOC-TXN-8899120', 'Verified', 'Commercial Bank Online Deposit Slip verified', 'Roshani De Silva (Finance)', now(), '2026-02-05'),
('60000000-0000-0000-0000-000000000002', 'REC-2026-0082', '50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 108000.00, 'Card', 'HNB-POS-00912', 'Verified', 'Campus Reception POS terminal swipe', 'Roshani De Silva (Finance)', now(), '2026-02-08'),
('60000000-0000-0000-0000-000000000003', 'REC-2026-0083', '50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 35000.00, 'Bank Transfer', 'COMBANK-APP-77112', 'Verified', '50% installment payment received', 'Roshani De Silva (Finance)', now(), '2026-10-02')
ON CONFLICT (receipt_number) DO NOTHING;

-- Insert Class Sessions
INSERT INTO student_portal.class_sessions (id, batch_id, module_id, lecturer_id, campus_id, room_number, date, start_time, end_time, status)
VALUES
('70000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Hall 302', '2026-10-10', '09:00:00', '13:00:00', 'Scheduled'),
('70000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Language Lab 1', '2026-10-13', '17:30:00', '20:00:00', 'Scheduled'),
('70000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Hall 302', '2026-10-11', '09:00:00', '13:00:00', 'Scheduled')
ON CONFLICT DO NOTHING;

-- Insert Attendance Records
INSERT INTO student_portal.attendance_records (id, class_session_id, student_id, scan_time, status, scan_method, remarks, recorded_by)
VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-10-10 08:54:12+05:30', 'Present', 'Barcode', 'Gate scanner entrance scan verified', 'Barcode Scanner 01'),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '2026-10-10 09:18:45+05:30', 'Late', 'QR', 'Late check-in (+18 mins traffic)', 'Mobile Camera Scanner')
ON CONFLICT (class_session_id, student_id) DO NOTHING;

-- Insert LMS Courses & Materials
INSERT INTO student_portal.lms_courses (id, module_id, title, description, cover_url)
VALUES
('90000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Advanced Business Writing & Executive Reporting', 'Master professional correspondence, RFP proposals, analytical memos, and cross-cultural business communication.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80'),
('90000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'Cambridge C1 Use of English & Discourse Fluency', 'Specialized drills, syntax inversion, idioms, and comprehensive examination mastery for Cambridge Assessment.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80')
ON CONFLICT DO NOTHING;

INSERT INTO student_portal.lms_materials (id, course_id, title, type, url, description)
VALUES
('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Executive Summary Framework & Best Practice Guide (PDF)', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Core reading for Week 2 module on executive briefing synthesis.'),
('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'Lecture Recording: Persuasive Argumentation in Corporate Proposals', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2-hour recorded workshop led by Dr. Manjula Senanayake.'),
('91000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', 'Cambridge C1 Key Word Transformation 150 Drill Exercises', 'document', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Handout containing past paper transformation challenges with answer rationale.')
ON CONFLICT DO NOTHING;

INSERT INTO student_portal.lms_assignments (id, course_id, title, description, due_date, max_score, rubric)
VALUES
('92000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Assignment 1: Corporate Crisis Management Memo (1,200 Words)', 'Draft a formal communication briefing addressing internal employees and board members following an operational crisis scenario.', '2026-10-25 23:59:00+05:30', 100, 'Tone & Formality (30%), Coherence & Argument (40%), Grammatical Precision (30%)'),
('92000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'CAE Timed Essay: Sustainable Urban Transit in Megacities', 'Write a 260-word opinion essay evaluating two government investment strategies with clear recommendations.', '2026-10-28 23:59:00+05:30', 100, 'Content (25%), Communicative Achievement (25%), Organisation (25%), Language (25%)')
ON CONFLICT DO NOTHING;

INSERT INTO student_portal.lms_submissions (id, assignment_id, student_id, submission_text, file_url, score, feedback, graded_by, graded_at)
VALUES
('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Submitted crisis memo attached analyzing supply chain disruption response.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 88, 'Exceptional structural flow and diplomatic phrasing. Minor punctuation oversights on page 3.', 'Dr. Manjula Senanayake', '2026-10-08 14:20:00+05:30')
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Insert LMS Quiz
INSERT INTO student_portal.lms_quizzes (id, course_id, title, time_limit_mins, passing_score, questions)
VALUES
('94000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Mid-Term Grammar & Formal Syntax Quiz', 20, 60, '[
  {
    "id": 1,
    "question": "Which of the following salutations is most appropriate when the name of the recipient is unknown in British business correspondence?",
    "options": ["Dear Sir or Madam,", "To Whom It May Concern:", "Hi Team,", "Dear Manager,"],
    "correctAnswer": 0
  },
  {
    "id": 2,
    "question": "Identify the sentence that uses the subjunctive mood correctly for a business proposal:",
    "options": [
      "The committee recommended that he accepts the terms immediately.",
      "The committee recommended that he accept the terms immediately.",
      "The committee recommended that he will accept the terms.",
      "The committee recommended him accepting the terms."
    ],
    "correctAnswer": 1
  },
  {
    "id": 3,
    "question": "Choose the most concise and professional replacement for: ''In spite of the fact that we were delayed by rain...''",
    "options": ["Although delayed by rain,", "Owing to heavy rain delay factors,", "Even though it was raining down heavily,", "Because of the delay which was rain,"],
    "correctAnswer": 0
  }
]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert Examinations & Results
INSERT INTO student_portal.examinations (id, title, exam_code, module_id, exam_date, start_time, end_time, venue, fee_lkr, min_attendance_pct)
VALUES
('a1000000-0000-0000-0000-000000000001', 'DPEC Term 1 Comprehensive Examination', 'EXAM-DPEC-T1', 'f0000000-0000-0000-0000-000000000001', '2026-11-15', '09:30:00', '12:30:00', 'Main Examination Hall A (Colombo Campus)', 4500.00, 80),
('a1000000-0000-0000-0000-000000000002', 'Cambridge C1 Advanced Mock Examination', 'EXAM-CAE-MOCK', 'f0000000-0000-0000-0000-000000000003', '2026-11-20', '13:30:00', '17:00:00', 'Language Testing Center Hall B', 6000.00, 85)
ON CONFLICT (exam_code) DO NOTHING;

INSERT INTO student_portal.exam_registrations (id, exam_id, student_id, eligibility_status, eligibility_reason, marks, grade, result_status, approved_by, published_at)
VALUES
('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Eligible', 'Attendance 94% / Fees Cleared', 86, 'A (Distinction)', 'Published', 'Academic Dean Office', '2026-10-05 10:00:00+05:30'),
('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Eligible', 'Attendance 88% / Fees Cleared', 78, 'B+ (Merit)', 'Published', 'Academic Dean Office', '2026-10-05 10:00:00+05:30')
ON CONFLICT (exam_id, student_id) DO NOTHING;

-- Insert Certificates
INSERT INTO student_portal.certificates (id, certificate_number, student_id, programme_id, qualification, issue_date, verification_code, status)
VALUES
('a3000000-0000-0000-0000-000000000001', 'EPC-CERT-2026-0042', '20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Diploma in Professional English & Communication', '2026-09-30', 'VRF-9821-EPC', 'Issued')
ON CONFLICT (certificate_number) DO NOTHING;

-- Insert Support Tickets
INSERT INTO student_portal.support_tickets (id, ticket_number, student_id, student_name, category, priority, subject, description, status, assigned_to, resolution_notes)
VALUES
('a4000000-0000-0000-0000-000000000001', 'TCK-2026-0012', '20000000-0000-0000-0000-000000000001', 'Kavinda Dinushan Perera', 'Timetable', 'Medium', 'Request for Sunday Makeup Class Session', 'Missed Sunday class due to regional sports competition, requesting access to recorded video workshop.', 'Resolved', 'Academic Coordinator', 'Granted access to video archive and assigned tutor contact hours.'),
('a4000000-0000-0000-0000-000000000002', 'TCK-2026-0013', '20000000-0000-0000-0000-000000000002', 'Ananya Rashmika Bandara', 'Finance', 'Low', 'Installment Receipt Download Assistance', 'Need stamped PDF receipt of second installment for employer educational reimbursement.', 'In Progress', 'Finance Desk', 'Drafting certified stamped statement.')
ON CONFLICT (ticket_number) DO NOTHING;

-- Insert Evaluation Forms & Sample Responses
INSERT INTO student_portal.evaluation_forms (id, title, programme_id, module_id, lecturer_id, status, is_anonymous)
VALUES
('a5000000-0000-0000-0000-000000000001', 'End of Term 1 Lecturer & Module Assessment', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Active', true)
ON CONFLICT DO NOTHING;

INSERT INTO student_portal.evaluation_responses (id, form_id, lecturer_id, module_id, ratings, comments)
VALUES
('a6000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '{"clarity": 5, "engagement": 5, "punctuality": 5, "materials": 4, "overall": 5}'::jsonb, 'Dr. Senanayake provides stellar practical examples from corporate Sri Lanka. Greatly boosted my confidence.'),
('a6000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '{"clarity": 4, "engagement": 4, "punctuality": 5, "materials": 5, "overall": 4}'::jsonb, 'The assignment feedback was thorough and helped me understand where my report writing needed work.')
ON CONFLICT DO NOTHING;

COMMIT;
