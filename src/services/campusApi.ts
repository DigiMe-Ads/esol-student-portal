import { supabase } from '@/db/supabase';
import type {
  Campus,
  Programme,
  Intake,
  Batch,
  Module,
  Inquiry,
  InquiryFollowup,
  Student,
  StudentEnrollment,
  Lecturer,
  ClassSession,
  AttendanceRecord,
  Invoice,
  Payment,
  LMSCourse,
  LMSMaterial,
  LMSAssignment,
  LMSSubmission,
  LMSQuiz,
  Examination,
  ExamRegistration,
  Certificate,
  SupportTicket,
  EvaluationForm,
  EvaluationResponse,
  SystemNotification,
  Department,
  QuizQuestion,
  QuizAttempt,
  Room,
  RoomBooking,
  AlumniProfile,
  AuditLog,
} from '@/types/campus';

// short unique suffix for document numbers (INV-2026-3F9A1C)
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

async function one<T>(q: PromiseLike<{ data: any; error: any }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw error;
  return data as T;
}
async function many<T>(q: PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as T[];
}

export const campusApi = {
  // Campuses
  async getCampuses(): Promise<Campus[]> {
    const { data, error } = await supabase.from('campuses').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  // Programmes & Structure
  async getProgrammes(): Promise<Programme[]> {
    const { data, error } = await supabase.from('programmes').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async getIntakes(): Promise<Intake[]> {
    const { data, error } = await supabase.from('intakes').select('*, programme:programmes(*)').order('start_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getBatches(): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*, intake:intakes(*, programme:programmes(*))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getModules(): Promise<Module[]> {
    const { data, error } = await supabase.from('modules').select('*, programme:programmes(*)').order('code');
    if (error) throw error;
    return data || [];
  },

  // Inquiries (CRM)
  async getInquiries(): Promise<Inquiry[]> {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, campus:campuses(*), programme:programmes(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createInquiry(payload: Partial<Inquiry>): Promise<Inquiry> {
    const ref_number = `INQ-${new Date().getFullYear()}-${uid()}`;
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        ...payload,
        ref_number,
        status: payload.status || 'New Inquiry',
      })
      .select('*, campus:campuses(*), programme:programmes(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async updateInquiryStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async getInquiryFollowups(inquiryId: string): Promise<InquiryFollowup[]> {
    const { data, error } = await supabase
      .from('inquiry_followups')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addInquiryFollowup(payload: Partial<InquiryFollowup>): Promise<InquiryFollowup> {
    const { data, error } = await supabase.from('inquiry_followups').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // Registers a student (+ enrolment, registration invoice and payment) in one server transaction.
  // Used by "Add Student" and by CRM inquiry conversion (pass inquiry_id).
  async enrollStudent(payload: Record<string, unknown>): Promise<{ student: Student; invoice: Invoice | null }> {
    const { data, error } = await supabase.rpc('enroll_student', { p: payload });
    if (error) throw error;
    return data as { student: Student; invoice: Invoice | null };
  },

  // Students (SIS)
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*, campus:campuses(*), enrollments:student_enrollments(*, programme:programmes(*), batch:batches(*))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getStudentById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*, campus:campuses(*), enrollments:student_enrollments(*, programme:programmes(*), batch:batches(*))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
    const { data, error } = await supabase.from('students').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Lecturers
  async getLecturers(): Promise<Lecturer[]> {
    const { data, error } = await supabase.from('lecturers').select('*, campus:campuses(*)').order('full_name');
    if (error) throw error;
    return data || [];
  },

  // Class Sessions & Timetable
  async getClassSessions(): Promise<ClassSession[]> {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*), campus:campuses(*)')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createClassSession(payload: Partial<ClassSession>): Promise<ClassSession> {
    // Conflict detection: Check room and lecturer overlap
    if (payload.room_number && payload.date && payload.start_time && payload.end_time) {
      const { data: roomConflict } = await supabase
        .from('class_sessions')
        .select('id, batch:batches(name)')
        .eq('date', payload.date)
        .eq('room_number', payload.room_number)
        .eq('status', 'Scheduled')
        .filter('start_time', 'lt', payload.end_time)
        .filter('end_time', 'gt', payload.start_time);

      if (roomConflict && roomConflict.length > 0) {
        throw new Error(`Room conflict detected: ${payload.room_number} is already occupied during this time window!`);
      }
    }

    if (payload.lecturer_id && payload.date && payload.start_time && payload.end_time) {
      const { data: lecConflict } = await supabase
        .from('class_sessions')
        .select('id, lecturer:lecturers(full_name)')
        .eq('date', payload.date)
        .eq('lecturer_id', payload.lecturer_id)
        .eq('status', 'Scheduled')
        .filter('start_time', 'lt', payload.end_time)
        .filter('end_time', 'gt', payload.start_time);

      if (lecConflict && lecConflict.length > 0) {
        throw new Error(`Lecturer conflict detected: Assigned instructor is already teaching another class at this time!`);
      }
    }

    const { data, error } = await supabase
      .from('class_sessions')
      .insert(payload)
      .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*), campus:campuses(*)')
      .single();
    if (error) throw error;
    return data;
  },

  // Attendance & Barcode Scan
  async recordAttendanceScan(params: {
    studentNumberOrCode: string;
    sessionId?: string;
    scanMethod?: string;
    recordedBy?: string;
  }): Promise<{ student: Student; record: AttendanceRecord; session: ClassSession }> {
    // 1. Find student by barcode, QR code or student number (codes are letters, digits and dashes only)
    const trimmed = params.studentNumberOrCode.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(trimmed)) throw new Error(`"${params.studentNumberOrCode}" is not a valid student ID / barcode.`);
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    const today = local.toISOString().slice(0, 10);
    const nowHM = local.toISOString().slice(11, 16);
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, enrollments:student_enrollments(*, batch:batches(*))')
      .or(`barcode_val.eq.${trimmed},qr_code_val.eq.${trimmed},student_number.eq.${trimmed}`)
      .maybeSingle();

    if (studentError || !student) {
      throw new Error(`Student record not found for code: "${trimmed}"`);
    }
    if (!['Active', 'Registered'].includes(student.status)) {
      throw new Error(`${student.full_name} is ${student.status}; check-in refused.`);
    }
    const enrolledBatchIds: string[] = (student.enrollments || []).map((e: any) => e.batch_id).filter(Boolean);

    // 2. Determine class session
    let session: ClassSession | null = null;
    if (params.sessionId) {
      const { data: s } = await supabase
        .from('class_sessions')
        .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*)')
        .eq('id', params.sessionId)
        .maybeSingle();
      session = s;
      if (session && !enrolledBatchIds.includes(session.batch_id)) {
        throw new Error(`${student.full_name} is not enrolled in ${session.batch?.name ?? 'this batch'}.`);
      }
      if (session && session.date !== today) throw new Error(`That session is on ${session.date}; only today's classes can be checked in.`);
      if (session?.status === 'Cancelled') throw new Error('That session was cancelled.');
    } else {
      // Today's class for the student's batch that is running now (or starts within 30 minutes)
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*)')
        .eq('date', today)
        .neq('status', 'Cancelled')
        .in('batch_id', enrolledBatchIds.length > 0 ? enrolledBatchIds : ['00000000-0000-0000-0000-000000000000'])
        .order('start_time');
      const soon = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const d = h * 60 + m - 30;
        return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
      };
      session = (sessions || []).find((x: ClassSession) => soon(x.start_time) <= nowHM && x.end_time.slice(0, 5) > nowHM) ?? null;
    }

    if (!session) {
      throw new Error(`No class running now for ${student.full_name} (${student.student_number}). Pick the session first.`);
    }

    // 3. Verify Duplicate Scan Check
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id, scan_time, status')
      .eq('class_session_id', session.id)
      .eq('student_id', student.id)
      .maybeSingle();

    if (existingRecord) {
      throw new Error(`Duplicate Scan Rejected: Student already checked in at ${new Date(existingRecord.scan_time).toLocaleTimeString()} (Status: ${existingRecord.status}).`);
    }

    // 4. Calculate Late / Present
    const now = new Date();
    let status: 'Present' | 'Late' = 'Present';
    let remarks = 'Checked in on time via scan';

    if (session.start_time) {
      const [sh, sm] = session.start_time.split(':').map(Number);
      const sessionStart = new Date(now);
      sessionStart.setHours(sh, sm, 0, 0);

      // Grace period 15 mins
      const diffMins = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);
      if (diffMins > 15) {
        status = 'Late';
        remarks = `Late arrival: +${diffMins} minutes past start time`;
      }
    }

    // 5. Insert Attendance Record
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert({
        class_session_id: session.id,
        student_id: student.id,
        status,
        scan_method: params.scanMethod || 'Barcode',
        recorded_by: params.recordedBy || 'Reception / Automated Scan',
        remarks,
        scan_time: new Date().toISOString(),
      })
      .select('*, student:students(*), class_session:class_sessions(*)')
      .single();

    if (recordError) throw recordError;

    return { student, record, session };
  },

  async getAttendanceRecords(sessionId?: string): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*, student:students(*), class_session:class_sessions(*, batch:batches(*), module:modules(*))')
      .order('scan_time', { ascending: false });

    if (sessionId) {
      query = query.eq('class_session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Finance: Invoices & Payments in LKR
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, student:students(*), programme:programmes(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, invoice:invoices(*), student:students(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async verifyPayment(paymentId: string): Promise<void> {
    const { error } = await supabase.rpc('verify_payment', { p_payment: paymentId });
    if (error) throw error;
  },

  async rejectPayment(paymentId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('reject_payment', { p_payment: paymentId, p_reason: reason });
    if (error) throw error;
  },

  async recordPayment(p: { invoiceId: string; amount: number; method: string; reference?: string; notes?: string }): Promise<Payment> {
    const { data, error } = await supabase.rpc('record_payment', {
      p_invoice: p.invoiceId, p_amount: p.amount, p_method: p.method, p_reference: p.reference ?? '', p_notes: p.notes ?? '',
    });
    if (error) throw error;
    return data as Payment;
  },

  // Student / parent uploads a bank slip; finance verifies it later.
  async submitPaymentSlip(p: { invoiceId: string; studentId: string; amount: number; method: string; reference?: string; proofUrl?: string }): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        receipt_number: `SLIP-${new Date().getFullYear()}-${uid()}`,
        invoice_id: p.invoiceId,
        student_id: p.studentId,
        amount: p.amount,
        payment_method: p.method,
        payment_reference: p.reference || null,
        proof_url: p.proofUrl || null,
        status: 'Pending',
        verified_by: null,
        verified_at: null,
        notes: 'Submitted online for verification',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createInvoice(payload: Partial<Invoice>): Promise<Invoice> {
    const invNumber = `INV-${new Date().getFullYear()}-${uid()}`;
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...payload,
        invoice_number: invNumber,
        paid_amount: payload.paid_amount || 0,
        balance_due: (payload.total_amount || 0) - (payload.paid_amount || 0),
        status: payload.status || 'Pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // LMS
  async getLMSCourses(): Promise<LMSCourse[]> {
    const { data, error } = await supabase
      .from('lms_courses')
      .select('*, module:modules(*), materials:lms_materials(*), assignments:lms_assignments(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getLMSCourseById(id: string): Promise<LMSCourse | null> {
    const { data, error } = await supabase
      .from('lms_courses')
      .select('*, module:modules(*), materials:lms_materials(*), assignments:lms_assignments(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createLMSMaterial(payload: Partial<LMSMaterial>): Promise<LMSMaterial> {
    const { data, error } = await supabase.from('lms_materials').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async getCourseAssignments(courseId: string): Promise<LMSAssignment[]> {
    const { data, error } = await supabase.from('lms_assignments').select('*').eq('course_id', courseId).order('due_date');
    if (error) throw error;
    return data || [];
  },

  async getAssignmentSubmissions(assignmentId: string): Promise<LMSSubmission[]> {
    const { data, error } = await supabase
      .from('lms_submissions')
      .select('*, student:students(*)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async submitAssignment(payload: Partial<LMSSubmission>): Promise<LMSSubmission> {
    const { data, error } = await supabase.from('lms_submissions').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async gradeSubmission(id: string, score: number, feedback: string, gradedBy: string): Promise<LMSSubmission> {
    const { data, error } = await supabase
      .from('lms_submissions')
      .update({
        score,
        feedback,
        graded_by: gradedBy,
        graded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getLMSQuizzes(courseId: string): Promise<LMSQuiz[]> {
    const { data, error } = await supabase.from('lms_quizzes').select('*').eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  // Graded on the server; students' attempts are recorded, staff get a preview score.
  async submitQuiz(quizId: string, answers: Record<number, number>): Promise<{ score: number; correct: number; total: number; passed: boolean; recorded: boolean }> {
    const { data, error } = await supabase.rpc('submit_quiz', { p_quiz: quizId, p_answers: answers });
    if (error) throw error;
    return data;
  },

  // Examinations & Results
  async getExaminations(): Promise<Examination[]> {
    const { data, error } = await supabase.from('examinations').select('*, module:modules(*)').order('exam_date');
    if (error) throw error;
    return data || [];
  },

  async getExamRegistrations(examId?: string): Promise<ExamRegistration[]> {
    let query = supabase.from('exam_registrations').select('*, exam:examinations(*), student:students(*)').order('created_at', { ascending: false });
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateExamResult(id: string, marks: number, grade: string, resultStatus: 'Draft' | 'Approved' | 'Published', approvedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('exam_registrations')
      .update({
        marks,
        grade,
        result_status: resultStatus,
        approved_by: approvedBy || 'Academic Board',
        published_at: resultStatus === 'Published' ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  // Student Evaluations
  async getEvaluationForms(): Promise<EvaluationForm[]> {
    const { data, error } = await supabase
      .from('evaluation_forms')
      .select('*, lecturer:lecturers(*), module:modules(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async submitEvaluation(lecturerId: string, moduleId: string, rating: number, comments: string): Promise<void> {
    const { error } = await supabase.rpc('submit_evaluation', { p_lecturer: lecturerId, p_module: moduleId, p_rating: rating, p_comments: comments });
    if (error) throw error;
  },

  async getMyEvaluations(): Promise<{ lecturer_id: string; module_id: string }[]> {
    const { data, error } = await supabase.rpc('my_evaluations');
    if (error) throw error;
    return data || [];
  },

  async getEvaluationResponses(lecturerId?: string): Promise<EvaluationResponse[]> {
    let query = supabase.from('evaluation_responses').select('*').order('created_at', { ascending: false });
    if (lecturerId) query = query.eq('lecturer_id', lecturerId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Certificates
  async getCertificates(): Promise<Certificate[]> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, student:students(*), programme:programmes(*)')
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async generateCertificate(studentId: string, programmeId: string, qualification: string): Promise<Certificate> {
    const certNum = `EPC-CERT-${new Date().getFullYear()}-${uid()}`;
    const vrfCode = `VRF-${uid()}${uid()}`;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        certificate_number: certNum,
        student_id: studentId,
        programme_id: programmeId,
        qualification,
        verification_code: vrfCode,
        status: 'Issued',
      })
      .select('*, student:students(*), programme:programmes(*)')
      .single();
    if (error) throw error;
    return data;
  },

  // Support Tickets
  async getSupportTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createSupportTicket(payload: Partial<SupportTicket>): Promise<SupportTicket> {
    const ticketNumber = `TCK-${new Date().getFullYear()}-${uid()}`;
    const { data, error } = await supabase.from('support_tickets').insert({ ...payload, ticket_number: ticketNumber }).select().single();
    if (error) throw error;
    return data;
  },

  async updateTicketStatus(id: string, status: string, resolutionNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, resolution_notes: resolutionNotes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // System Notifications
  async getNotifications(): Promise<SystemNotification[]> {
    const { data, error } = await supabase.from('system_notifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ---------------------------------------------------------------- academic structure
  async createCampus(p: Partial<Campus>): Promise<Campus> {
    return one(supabase.from('campuses').insert(p).select().single());
  },
  async createProgramme(p: Partial<Programme>): Promise<Programme> {
    return one(supabase.from('programmes').insert(p).select().single());
  },
  async updateProgramme(id: string, p: Partial<Programme>): Promise<Programme> {
    return one(supabase.from('programmes').update(p).eq('id', id).select().single());
  },
  async createModule(p: Partial<Module>): Promise<Module> {
    return one(supabase.from('modules').insert(p).select('*, programme:programmes(*)').single());
  },
  async createIntake(p: Partial<Intake>): Promise<Intake> {
    return one(supabase.from('intakes').insert(p).select('*, programme:programmes(*)').single());
  },
  async createBatch(p: Partial<Batch>): Promise<Batch> {
    return one(supabase.from('batches').insert(p).select('*, intake:intakes(*, programme:programmes(*))').single());
  },
  async getDepartments(): Promise<Department[]> {
    return many(supabase.from('departments').select('*').order('name'));
  },

  // ---------------------------------------------------------------- lecturers
  async createLecturer(p: Partial<Lecturer>): Promise<Lecturer> {
    return one(supabase.from('lecturers').insert(p).select('*, campus:campuses(*)').single());
  },
  async updateLecturer(id: string, p: Partial<Lecturer>): Promise<Lecturer> {
    return one(supabase.from('lecturers').update(p).eq('id', id).select('*, campus:campuses(*)').single());
  },
  async getLecturerAllocations(): Promise<any[]> {
    return many(supabase.from('lecturer_allocations').select('*, module:modules(*), batch:batches(*)'));
  },
  async allocateLecturer(p: { lecturer_id: string; module_id: string; batch_id: string }) {
    return one(supabase.from('lecturer_allocations').insert(p).select('*, module:modules(*), batch:batches(*)').single());
  },
  async removeAllocation(id: string) {
    const { error } = await supabase.from('lecturer_allocations').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------------------------------------------------------------- timetable
  async updateClassSessionStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('class_sessions').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // ---------------------------------------------------------------- students
  async updateStudentStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('students').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async getStudentLogins(studentId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('student_logins', { p_student: studentId });
    if (error) throw error;
    return data || [];
  },
  async createPortalUser(p: { username: string; displayName: string; role: string; password: string; studentId?: string; lecturerId?: string }) {
    const { data, error } = await supabase.rpc('create_user', {
      p_username: p.username, p_display_name: p.displayName, p_role: p.role, p_password: p.password,
      p_student: p.studentId ?? null, p_lecturer: p.lecturerId ?? null,
    });
    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------------- LMS authoring & student work
  async createLMSCourse(p: Partial<LMSCourse>): Promise<LMSCourse> {
    return one(supabase.from('lms_courses').insert(p).select('*, module:modules(*), materials:lms_materials(*), assignments:lms_assignments(*)').single());
  },
  async createAssignment(p: Partial<LMSAssignment>): Promise<LMSAssignment> {
    return one(supabase.from('lms_assignments').insert(p).select().single());
  },
  async createQuiz(p: { course_id: string; title: string; time_limit_mins: number; passing_score: number; questions: QuizQuestion[] }): Promise<LMSQuiz> {
    const answers = Object.fromEntries(p.questions.map((q) => [String(q.id), q.correctAnswer ?? 0]));
    const questions = p.questions.map(({ correctAnswer: _c, ...q }) => q);
    const quiz = await one<LMSQuiz>(supabase.from('lms_quizzes').insert({ ...p, questions }).select().single());
    const { error } = await supabase.from('lms_quiz_keys').insert({ quiz_id: quiz.id, answers });
    if (error) {
      await supabase.from('lms_quizzes').delete().eq('id', quiz.id);
      throw error;
    }
    return quiz;
  },
  async getQuizAttempts(quizId?: string, studentId?: string): Promise<QuizAttempt[]> {
    let q = supabase.from('lms_quiz_attempts').select('*').order('submitted_at', { ascending: false });
    if (quizId) q = q.eq('quiz_id', quizId);
    if (studentId) q = q.eq('student_id', studentId);
    return many(q);
  },
  async getStudentSubmissions(studentId: string): Promise<LMSSubmission[]> {
    return many(supabase.from('lms_submissions').select('*').eq('student_id', studentId));
  },

  // ---------------------------------------------------------------- examinations
  async createExamination(p: Partial<Examination>): Promise<Examination> {
    return one(supabase.from('examinations').insert(p).select('*, module:modules(*)').single());
  },
  async registerExamCandidates(examId: string): Promise<{ checked: number; registered: number }> {
    const { data, error } = await supabase.rpc('register_exam_candidates', { p_exam: examId });
    if (error) throw error;
    return data;
  },
  async getStudentResults(studentId: string): Promise<ExamRegistration[]> {
    return many(supabase.from('exam_registrations').select('*, exam:examinations(*, module:modules(*))').eq('student_id', studentId));
  },

  // ---------------------------------------------------------------- certificates
  async verifyCertificate(code: string): Promise<any | null> {
    const { data, error } = await supabase.rpc('verify_certificate', { p_code: code });
    if (error) throw error;
    return data;
  },

  async updateTicketAssignee(id: string, assignedTo: string): Promise<void> {
    const { error } = await supabase.from('support_tickets').update({ assigned_to: assignedTo || null }).eq('id', id);
    if (error) throw error;
  },

  // ---------------------------------------------------------------- notifications
  async createNotification(p: Partial<SystemNotification>): Promise<SystemNotification> {
    return one(supabase.from('system_notifications').insert({ channel: 'In-app', ...p }).select('*, batch:batches(*), student:students(*)').single());
  },
  async getNotificationFeed(): Promise<SystemNotification[]> {
    return many(supabase.from('system_notifications').select('*, batch:batches(*), student:students(*)').order('created_at', { ascending: false }).limit(100));
  },

  // ---------------------------------------------------------------- facilities
  async getRooms(): Promise<Room[]> {
    return many(supabase.from('rooms').select('*, campus:campuses(*)').order('name'));
  },
  async createRoom(p: Partial<Room>): Promise<Room> {
    return one(supabase.from('rooms').insert(p).select('*, campus:campuses(*)').single());
  },
  async getRoomBookings(fromDate?: string): Promise<RoomBooking[]> {
    let q = supabase.from('room_bookings').select('*, room:rooms(*)').order('date').order('start_time');
    if (fromDate) q = q.gte('date', fromDate);
    return many(q);
  },
  // Refuses overlaps with other bookings and with classes timetabled in the same room.
  async bookRoom(p: { room: Room; date: string; start_time: string; end_time: string; purpose: string; booked_by: string }): Promise<RoomBooking> {
    if (p.end_time <= p.start_time) throw new Error('End time must be after start time.');
    const { data: clash } = await supabase.from('room_bookings').select('id, purpose').eq('room_id', p.room.id).eq('date', p.date)
      .lt('start_time', p.end_time).gt('end_time', p.start_time);
    if (clash && clash.length) throw new Error(`${p.room.name} is already booked then (${clash[0].purpose}).`);
    const { data: cls } = await supabase.from('class_sessions').select('id').eq('room_number', p.room.name).eq('date', p.date)
      .neq('status', 'Cancelled').lt('start_time', p.end_time).gt('end_time', p.start_time);
    if (cls && cls.length) throw new Error(`${p.room.name} has a timetabled class at that time.`);
    return one(supabase.from('room_bookings').insert({ room_id: p.room.id, date: p.date, start_time: p.start_time, end_time: p.end_time,
      purpose: p.purpose, booked_by: p.booked_by }).select('*, room:rooms(*)').single());
  },
  async cancelRoomBooking(id: string) {
    const { error } = await supabase.from('room_bookings').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------------------------------------------------------------- alumni & audit
  async getAlumniProfiles(): Promise<AlumniProfile[]> {
    return many(supabase.from('alumni_profiles').select('*'));
  },
  async saveAlumniProfile(p: Partial<AlumniProfile> & { student_id: string }): Promise<AlumniProfile> {
    return one(supabase.from('alumni_profiles').upsert({ ...p, updated_at: new Date().toISOString() }).select().single());
  },
  async getAuditLogs(limit = 200): Promise<AuditLog[]> {
    return many(supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit));
  },
};
