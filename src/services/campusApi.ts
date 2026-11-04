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
} from '@/types/campus';

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
    const ref_number = `INQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  // Inquiry Conversion to Student
  async convertInquiryToStudent(params: {
    inquiryId: string;
    studentName: string;
    email: string;
    phone: string;
    programmeId: string;
    intakeId: string;
    batchId: string;
    campusId: string;
    registrationFee: number;
    paymentMethod: string;
    paymentReference: string;
  }): Promise<{ student: Student; invoice: Invoice; payment: Payment }> {
    // 1. Generate unique sequential student number: EPC-2026-XXXXX
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const nextSeq = String((count || 0) + 1).padStart(5, '0');
    const studentNumber = `EPC-${new Date().getFullYear()}-${nextSeq}`;

    // 2. Create Student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        student_number: studentNumber,
        full_name: params.studentName,
        email: params.email,
        phone: params.phone,
        campus_id: params.campusId,
        status: 'Active',
        barcode_val: studentNumber,
        qr_code_val: studentNumber,
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      })
      .select('*, campus:campuses(*)')
      .single();
    if (studentError) throw studentError;

    // 3. Create Enrollment
    await supabase.from('student_enrollments').insert({
      student_id: student.id,
      programme_id: params.programmeId,
      intake_id: params.intakeId,
      batch_id: params.batchId,
      status: 'Active',
    });

    // 4. Create Registration Invoice
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invNumber,
        student_id: student.id,
        inquiry_id: params.inquiryId,
        programme_id: params.programmeId,
        title: 'Initial Registration & Enrollment Fee',
        total_amount: params.registrationFee,
        paid_amount: params.registrationFee,
        balance_due: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'Paid',
      })
      .select()
      .single();
    if (invError) throw invError;

    // 5. Create Payment Record (Verified)
    const recNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        receipt_number: recNumber,
        invoice_id: invoice.id,
        student_id: student.id,
        amount: params.registrationFee,
        payment_method: params.paymentMethod,
        payment_reference: params.paymentReference || 'REG-AUTO-CONFIRM',
        status: 'Verified',
        notes: 'Initial registration payment confirmed upon inquiry conversion.',
        verified_by: 'Admissions & Finance System',
      })
      .select()
      .single();
    if (payError) throw payError;

    // 6. Update Inquiry status to Registered
    await supabase.from('inquiries').update({ status: 'Registered', updated_at: new Date().toISOString() }).eq('id', params.inquiryId);

    // 7. Audit log
    await supabase.from('audit_logs').insert({
      user_role: 'Admissions Officer',
      action: 'INQUIRY_CONVERTED_TO_STUDENT',
      entity_type: 'Student',
      entity_id: student.id,
      details: `Inquiry ${params.inquiryId} converted to Student ${studentNumber}. Registration fee LKR ${params.registrationFee} verified.`,
    });

    return { student, invoice, payment };
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
  }): Promise<{ student: Student; record: AttendanceRecord; session: ClassSession }> {
    // 1. Find student by barcode, QR code or student number
    const trimmed = params.studentNumberOrCode.trim();
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, enrollments:student_enrollments(*, batch:batches(*))')
      .or(`barcode_val.eq.${trimmed},qr_code_val.eq.${trimmed},student_number.eq.${trimmed}`)
      .maybeSingle();

    if (studentError || !student) {
      throw new Error(`Student record not found for code: "${trimmed}"`);
    }

    // 2. Determine class session
    let session: ClassSession | null = null;
    if (params.sessionId) {
      const { data: s } = await supabase
        .from('class_sessions')
        .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*)')
        .eq('id', params.sessionId)
        .maybeSingle();
      session = s;
    } else {
      // Find today's active session for student's enrolled batch
      const today = new Date().toISOString().split('T')[0];
      const enrolledBatchIds = (student.enrollments || []).map((e: any) => e.batch_id).filter(Boolean);

      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('*, batch:batches(*), module:modules(*), lecturer:lecturers(*)')
        .eq('date', today)
        .in('batch_id', enrolledBatchIds.length > 0 ? enrolledBatchIds : ['none'])
        .limit(1);

      if (sessions && sessions.length > 0) {
        session = sessions[0];
      }
    }

    if (!session) {
      throw new Error(`No scheduled class session found for student ${student.full_name} (${student.student_number}) today.`);
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

  async verifyPayment(paymentId: string, verifiedBy: string): Promise<Payment> {
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'Verified',
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select('*, invoice:invoices(*)')
      .single();

    if (error) throw error;

    // Update invoice paid amount
    if (payment.invoice_id) {
      const { data: inv } = await supabase.from('invoices').select('paid_amount, total_amount').eq('id', payment.invoice_id).single();
      if (inv) {
        const newPaid = Number(inv.paid_amount) + Number(payment.amount);
        const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
        const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

        await supabase.from('invoices').update({ paid_amount: newPaid, balance_due: newBalance, status: newStatus }).eq('id', payment.invoice_id);
      }
    }

    return payment;
  },

  async createInvoice(payload: Partial<Invoice>): Promise<Invoice> {
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  async submitQuizAttempt(payload: { quiz_id: string; student_id: string; score: number; total_questions: number; passed: boolean }) {
    const { data, error } = await supabase.from('lms_quiz_attempts').insert(payload).select().single();
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

  async submitEvaluationResponse(payload: Partial<EvaluationResponse>): Promise<EvaluationResponse> {
    const { data, error } = await supabase.from('evaluation_responses').insert(payload).select().single();
    if (error) throw error;
    return data;
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
    const certNum = `EPC-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const vrfCode = `VRF-${Math.floor(1000 + Math.random() * 9000)}-EPC`;

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
    const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
};
