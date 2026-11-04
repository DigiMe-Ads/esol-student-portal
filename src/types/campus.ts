export type UserRole =
  | 'super_admin'
  | 'management'
  | 'campus_manager'
  | 'admissions'
  | 'finance'
  | 'academic_coordinator'
  | 'lecturer'
  | 'exam_officer'
  | 'receptionist'
  | 'student'
  | 'parent';

export interface RoleConfig {
  id: UserRole;
  label: string;
  badge: string;
  description: string;
  allowedNav: string[];
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  campus_id?: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Programme {
  id: string;
  department_id?: string;
  name: string;
  code: string;
  level: string;
  description?: string;
  duration_months: number;
  total_fee: number;
  registration_fee: number;
  is_active: boolean;
  created_at: string;
}

export interface Intake {
  id: string;
  programme_id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  programme?: Programme;
}

export interface Batch {
  id: string;
  intake_id: string;
  name: string;
  code: string;
  capacity: number;
  room_number?: string;
  schedule_summary?: string;
  created_at: string;
  intake?: Intake;
}

export interface Module {
  id: string;
  programme_id: string;
  name: string;
  code: string;
  credits: number;
  term: string;
  description?: string;
  created_at: string;
  programme?: Programme;
}

export type InquirySource =
  | 'Facebook'
  | 'Instagram'
  | 'Website'
  | 'WhatsApp'
  | 'Walk-in'
  | 'Phone'
  | 'Referral'
  | 'School Promotion'
  | 'Other';

export type InquiryStatus =
  | 'New Inquiry'
  | 'Contact Attempted'
  | 'Contacted'
  | 'Counselling Scheduled'
  | 'Counselling Completed'
  | 'Programme Recommended'
  | 'Awaiting Registration'
  | 'Payment Pending'
  | 'Registered'
  | 'Lost'
  | 'Deferred';

export interface Inquiry {
  id: string;
  ref_number: string;
  student_name: string;
  dob?: string;
  contact_number: string;
  whatsapp_number?: string;
  email?: string;
  parent_name?: string;
  parent_contact?: string;
  preferred_campus_id?: string;
  interested_programme_id?: string;
  educational_background?: string;
  school?: string;
  source: InquirySource;
  assigned_to?: string;
  status: InquiryStatus;
  notes?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  campus?: Campus;
  programme?: Programme;
}

export interface InquiryFollowup {
  id: string;
  inquiry_id: string;
  contact_type: string;
  outcome?: string;
  notes: string;
  follow_up_date?: string;
  logged_by: string;
  created_at: string;
}

export type StudentStatus =
  | 'Registered'
  | 'Active'
  | 'On Hold'
  | 'Deferred'
  | 'Withdrawn'
  | 'Completed'
  | 'Graduated'
  | 'Alumni';

export interface Student {
  id: string;
  student_number: string; // e.g. EPC-2026-00001
  full_name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  dob?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  campus_id?: string;
  status: StudentStatus;
  photo_url?: string;
  barcode_val: string;
  qr_code_val: string;
  enrollment_date: string;
  created_at: string;
  updated_at: string;
  campus?: Campus;
  enrollments?: StudentEnrollment[];
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  programme_id: string;
  intake_id?: string;
  batch_id?: string;
  status: string;
  enrolled_date: string;
  completion_date?: string;
  created_at: string;
  programme?: Programme;
  intake?: Intake;
  batch?: Batch;
}

export interface Lecturer {
  id: string;
  lecturer_id: string;
  full_name: string;
  email: string;
  phone?: string;
  qualifications?: string;
  specializations?: string;
  employment_type: string;
  campus_id?: string;
  photo_url?: string;
  status: string;
  created_at: string;
  campus?: Campus;
}

export interface ClassSession {
  id: string;
  batch_id: string;
  module_id: string;
  lecturer_id?: string;
  campus_id?: string;
  room_number: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  batch?: Batch;
  module?: Module;
  lecturer?: Lecturer;
  campus?: Campus;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';

export interface AttendanceRecord {
  id: string;
  class_session_id: string;
  student_id: string;
  scan_time: string;
  status: AttendanceStatus;
  scan_method: string;
  remarks?: string;
  recorded_by?: string;
  created_at: string;
  student?: Student;
  class_session?: ClassSession;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  inquiry_id?: string;
  programme_id?: string;
  title: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  due_date: string;
  status: 'Pending' | 'Partial' | 'Paid' | 'Cancelled';
  created_at: string;
  student?: Student;
  programme?: Programme;
}

export interface Payment {
  id: string;
  receipt_number: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  proof_url?: string;
  status: 'Pending' | 'Awaiting Verification' | 'Verified' | 'Rejected';
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  payment_date: string;
  created_at: string;
  invoice?: Invoice;
  student?: Student;
}

export interface LMSCourse {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  module?: Module;
  materials?: LMSMaterial[];
  assignments?: LMSAssignment[];
}

export interface LMSMaterial {
  id: string;
  course_id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  url: string;
  description?: string;
  created_at: string;
}

export interface LMSAssignment {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  due_date: string;
  max_score: number;
  rubric?: string;
  created_at: string;
  submissions_count?: number;
}

export interface LMSSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text?: string;
  file_url?: string;
  score?: number;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
  submitted_at: string;
  student?: Student;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface LMSQuiz {
  id: string;
  course_id: string;
  title: string;
  time_limit_mins: number;
  passing_score: number;
  questions: QuizQuestion[];
  created_at: string;
}

export interface Examination {
  id: string;
  title: string;
  exam_code: string;
  module_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  fee_lkr: number;
  min_attendance_pct: number;
  created_at: string;
  module?: Module;
}

export interface ExamRegistration {
  id: string;
  exam_id: string;
  student_id: string;
  eligibility_status: 'Eligible' | 'Ineligible' | 'Approved_Override';
  eligibility_reason?: string;
  marks?: number;
  grade?: string;
  result_status: 'Draft' | 'Approved' | 'Published';
  approved_by?: string;
  published_at?: string;
  created_at: string;
  exam?: Examination;
  student?: Student;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  student_id: string;
  programme_id: string;
  qualification: string;
  issue_date: string;
  verification_code: string;
  status: string;
  pdf_url?: string;
  created_at: string;
  student?: Student;
  programme?: Programme;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  student_id?: string;
  student_name?: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationForm {
  id: string;
  title: string;
  programme_id: string;
  module_id: string;
  lecturer_id: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  lecturer?: Lecturer;
  module?: Module;
}

export interface EvaluationResponse {
  id: string;
  form_id: string;
  lecturer_id: string;
  module_id: string;
  ratings: Record<string, number>;
  comments?: string;
  created_at: string;
}

export interface SystemNotification {
  id: string;
  user_role?: string;
  student_id?: string;
  title: string;
  message: string;
  channel: 'In-app' | 'SMS' | 'WhatsApp' | 'Email';
  is_read: boolean;
  created_at: string;
}
