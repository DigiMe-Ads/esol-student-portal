# Requirements Document

## 1. Application Overview
- Application Name: ESOL Premier Campus Management System
- Application Description: A comprehensive campus management web application for ESOL Premier Campus (Sri Lanka) covering the entire student lifecycle including lead inquiries and admissions, student information records, digital ID card generation, barcode/QR attendance tracking, academic structuring, lecturer operations, learning management, examination governance, tuition fee processing in Sri Lankan Rupees (LKR), student/parent portals, lecturer evaluations, executive KPI reporting, documents/certificates, alumni records, support ticketing, and role-based access control.

## 2. Target Users & Core Scenarios
- Target Users:
  - Super Admin & Campus Management: Oversee multi-campus operations, configure global system settings, view executive KPI analytics, and inspect audit logs.
  - Admissions & Reception Officers: Record inquiries, manage pipeline stages, conduct follow-ups, and convert leads to registered students upon initial payment verification.
  - Finance Officers: Set up fee structures, issue installment invoices in LKR, verify payment slips/transactions, record cash receipts, and monitor receivables.
  - Academic Coordinators & Exam Officers: Configure academic hierarchy (campuses, programmes, batches, modules), resolve timetable conflicts, determine exam eligibility, and approve final grades.
  - Lecturers: Manage assigned modules, record attendance, publish lesson content and quizzes, grade assignments, and submit module marks.
  - Students: View schedules, access LMS course materials, submit assignments, take online quizzes, monitor attendance/grades, check fee balances, and access digital ID cards.
  - Parents: Monitor enrolled student attendance, view academic progress reports, and check fee payment status.
- Core Scenarios:
  - Inquiry to Registration: Admissions officers register a prospect into the CRM pipeline, log follow-up actions, initiate registration conversion with initial fee invoicing, and generate a permanent student registration number upon payment verification.
  - Real-Time ID Attendance: Lecturers or campus staff scan student ID barcodes/QR codes via webcam or scanner device; the system verifies active batch schedule, rejects duplicate scans, and records present/late timestamps.
  - Academic Delivery & Assessment: Lecturers create syllabus content, assign coursework with rubrics, conduct quizzes, evaluate student work, and submit examination marks for coordinator sign-off.
  - Financial Processing: Finance officers track installment payment schedules in LKR, verify submitted payment proofs, issue automated digital receipts, and track overdue receivables.

## 3. Page Structure & Functional Specifications

```
ESOL Campus Management System
├── Authentication & Access
│   ├── Login Page
│   └── Password Reset Page
├── Executive Dashboard
│   ├── Admissions & Enrollment KPIs
│   ├── Academic & Attendance Analytics
│   └── Financial Overview (LKR Collections & Dues)
├── Admissions & CRM
│   ├── Inquiry Directory & Filter
│   ├── Admissions Kanban Pipeline
│   ├── Inquiry Detail & Follow-up Log
│   └── Registration & Conversion Modal
├── Student Information System (SIS)
│   ├── Student Directory & Status Filter
│   ├── Student 360 Profile (Personal, Academic, Financial, Logs)
│   └── Student ID Card Generator & Print View
├── Attendance Management
│   ├── Barcode / QR Scanner Interface
│   ├── Manual Class Attendance Register
│   └── Attendance History & Reports
├── Academic Administration
│   ├── Campus & Department Structure
│   ├── Programmes & Modules Configuration
│   ├── Intakes & Batches Management
│   └── Timetable Scheduler with Conflict Detection
├── Lecturer Management & Portal
│   ├── Lecturer Directory & Profiles
│   ├── Module & Batch Allocations
│   └── Lecturer Workspace (Classes, Grading, Content)
├── Learning Management System (LMS)
│   ├── Course Dashboard & Syllabus
│   ├── Lesson Materials & Video Links
│   ├── Assignments, Rubrics & Submissions
│   ├── Quizzes & Online Assessments
│   └── Module Discussion Board
├── Examination Management
│   ├── Exam Schedules & Venue Allocation
│   ├── Candidate Eligibility Verification
│   ├── Marks Entry & Approval Workflow
│   └── Transcripts & Resit Management
├── Finance Management (LKR)
│   ├── Fee Structures & Installment Rules
│   ├── Invoicing & Receipt Ledger
│   ├── Payment Verification Queue
│   └── Financial Summaries & Defaulters List
├── Portals
│   ├── Student Portal
│   └── Parent Monitoring Portal
├── Evaluations & Feedback
│   ├── Evaluation Form Builder
│   ├── Anonymous Student Feedback Submission
│   └── Aggregated Lecturer Feedback Reports
├── Documents, Certificates & Operations
│   ├── Document Archive
│   ├── Certificate Generator with Verification QR
│   ├── Campus Support Ticket Desk
│   └── Alumni Directory & Progression
└── System Administration
    ├── Role-Based Access Control (RBAC)
    ├── Notification & Communication Templates
    └── System Audit Logs
```

### 3.1 Authentication & Executive Dashboard
- Login Page: Authenticate users by username/email and password with role-based routing to respective workspaces.
- Password Reset: Enable credential recovery via registered email.
- Executive Dashboard: High-level metric cards and visual charts displaying total enrollments, monthly lead conversions, active batch counts, overall attendance rates, fee collection versus overdue amounts in LKR, and campus operational alerts.

### 3.2 Admissions & CRM
- Inquiry Directory: Filterable list of student leads by campus, program, counselor, and acquisition channel.
- Kanban Pipeline: Drag-and-drop stage tracking (New Inquiry, Contacted, Counseling, Document Pending, Invoice Issued, Registered, Lost).
- Follow-up Logging: Schedule next contact dates, log interaction outcomes (calls, visits, emails), and manage counselor task lists.
- Student Conversion: Validate registration payment, convert lead record, auto-assign formatted student ID (e.g., EPC-2026-XXXXX), and create an active student record.

### 3.3 Student Information System (SIS) & ID Generator
- Student Directory: Searchable list of students with status indicators (Active, Suspended, Deferred, Graduated, Withdrawn).
- Student 360 Profile: Centralized profile displaying bio-data, guardian details, enrolled batch and modules, attendance summary, financial balance, uploaded documents, and timeline log.
- Student ID Card Generator: Configurable ID card layout containing student photo, name, student number, barcode (Code 128) and QR code, program, validity period, and downloadable/printable PDF output.

### 3.4 Attendance Management
- Barcode / QR Scanner Interface: Input scanning via connected scanner device or device camera, performing instant enrollment verification against the scheduled class session.
- Duplicate Prevention & Timestamping: Reject repeat scans of the same student within a single session, record exact check-in time, and flag late arrivals past grace periods.
- Manual Register: Table grid enabling lecturers or administrators to manually mark or correct session attendance (Present, Absent, Late, Excused).
- Attendance Analytics: Batch and student-level attendance percentage calculations for exam clearance.

### 3.5 Academic Administration & Timetabling
- Academic Structure: Define campuses, academic departments, programmes, modules, intakes, and student batches.
- Timetable Scheduler: Weekly calendar scheduling grid per batch and lecturer with automated conflict checking for overlapping room allocations and lecturer double-booking.

### 3.6 Lecturer Management & Portal
- Lecturer Directory: Profiles containing contact info, specialization, assigned modules, and teaching schedules.
- Lecturer Workspace: Interface for lecturers to view class schedules, open attendance scanners, upload module content, distribute assignments, evaluate submissions, and submit final marks.

### 3.7 Learning Management System (LMS)
- Course Dashboard: Module view organizing weekly or topic-based syllabus items.
- Learning Resources: Upload and attach study notes, reference documents, and embedded lecture video links.
- Assignments & Submissions: Publish coursework with instructions, due dates, submission attachments, and grading rubrics; view student submission files.
- Quizzes & Assessments: Create multiple-choice and short-answer quizzes with auto-scoring and manual grading options.
- Discussion Board: Module forum for student questions and academic discussions.

### 3.8 Examination Management
- Exam Scheduling: Define examination timetables, assign test venues, and set invigilators.
- Candidate Eligibility: Automated candidate list generation based on module attendance percentage thresholds and fee settlement status.
- Marks Entry & Sign-off: Lecturer interface for marks input, multi-tier review workflow for Academic Coordinators/Exam Officers, and final publication to student view.
- Transcripts & Resits: Generate official academic transcripts and manage resit registrations for failed modules.

### 3.9 Finance Management
- Fee Configuration: Define program fee structures, registration fees, examination fees, and installment breakdown in LKR.
- Invoicing & Receipts: Issue batch or individual invoices, manage installment schedules, and produce downloadable payment receipts upon confirmation.
- Payment Verification Queue: Review student bank deposit slips or payment receipts, approve/reject transactions, and update student ledger balances.
- Financial Reporting: Track total collections, pending receivables, overdue payments by batch, and generate defaulters lists.

### 3.10 Student & Parent Portals
- Student Portal: Access personal class timetable, enrolled LMS modules, assignment submission deadlines, quiz attempts, published exam results, fee balances/invoices in LKR, and digital ID card.
- Parent Portal: Read-only view for linked parent/guardian accounts showing student daily attendance, academic grades, and fee payment histories.

### 3.11 Evaluations, Feedback & Quality Assurance
- Evaluation Forms: Create end-of-term questionnaires for module and lecturer performance.
- Anonymous Submission: Enforce anonymous feedback collection from enrolled students upon module completion.
- Aggregate Reports: Analytical reports summarizing feedback scores and comments by lecturer and module for management review.

### 3.12 Documents, Certificates, Alumni & Support
- Document Archive: Repository for student identity documents, educational certificates, and institutional circulars.
- Certificate Generator: Issue completion and graduation certificates featuring dynamic student details and a verification QR code.
- Support Ticket Desk: Helpdesk for student requests, academic appeals, and administrative queries with status tracking (Open, In Progress, Resolved).
- Alumni Directory: Record of graduated students, current career/employment status, and postgraduate pursuits.

### 3.13 Administration, RBAC & Audit Logs
- Role-Based Access Control: Granular role assignment for Super Admin, Management, Campus Manager, Admissions, Finance, Coordinator, Lecturer, Exam Officer, Reception, Student, and Parent.
- Notification Templates: Manage system alerts and email/SMS templates for registration confirmations, fee reminders, and schedule updates.
- Audit Logs: Immutable log capturing user identity, timestamp, IP address, and details of critical actions (grade edits, fee waivers, status changes).

## 4. Business Rules & Core Logic
1. Student ID Format: Student IDs must follow a standardized sequence (e.g., EPC-YYYY-XXXXX) generated automatically upon verified registration payment.
2. Lead Conversion Gate: An inquiry record cannot transition to an active student record until an initial registration invoice is generated and marked as verified by Finance.
3. Session Attendance Validation: Scanning a student ID code must verify that the student belongs to the batch assigned to that scheduled session and that the scan occurs within the permitted class time window.
4. Duplicate Scan Rejection: Re-scanning the same student ID during the same session must be rejected with an alert to prevent double-counting.
5. Exam Eligibility Gate: A student cannot be added to an examination candidate list if their attendance rate is below the set threshold or if fee installments are overdue, unless overridden by an authorized coordinator.
6. Currency Standard: All invoices, payments, adjustments, and financial dashboards must strictly use Sri Lankan Rupees (LKR).
7. Grade Publication Approval: Marks entered by lecturers remain in draft state until reviewed and approved by an Examination Officer or Academic Coordinator.
8. Feedback Anonymity: Student lecturer evaluation records must not retain student identification metadata in reports.
9. Timetable Conflict Rule: The system must block room or lecturer scheduling if a concurrent session already occupies that resource.
10. Audit Preservation: Any manual modification to grades, attendance records, or financial entries must write a permanent entry to the audit log.

## 5. Exceptions & Edge Cases

| Scenario | Condition | System Behavior |
| :--- | :--- | :--- |
| Invalid Scan Code | Scanned barcode/QR does not match any active student | Display invalid record alert and reject attendance logging. |
| Unscheduled Session Scan | Student scans into a class for which their batch is not scheduled | Display wrong session warning and prevent attendance entry. |
| Late Arrival | Student scans past the class grace period | Record attendance status as Late along with the exact delay duration. |
| Timetable Overlap | Administrator assigns a lecturer or room to two concurrent classes | Show scheduling conflict dialog and block timetable saving. |
| Ineligible Exam Registration | Student attempts to sit for exam with overdue fee or low attendance | Block candidate inclusion; prompt coordinator for administrative clearance. |
| Duplicate Payment Reference | Transaction reference entered matches an existing record | Prevent submission and flag potential duplicate transaction for review. |

## 6. Acceptance Criteria
1. An admissions officer can progress a lead through the CRM Kanban, convert the lead with payment verification, and generate a valid student record with a unique student ID.
2. Scanning a student ID via the attendance scanner verifies session enrollment, prevents duplicate scans within the same session, and logs the attendance timestamp.
3. Academic coordinators can create class timetables and receive immediate error alerts when lecturer or room conflicts occur.
4. Lecturers can upload learning resources, publish assignments with rubrics, administer quizzes, and submit grades for approval.
5. Examination marks submitted by lecturers require coordinator/exam officer sign-off before becoming visible on student transcripts and portals.
6. Finance officers can configure fee structures in LKR, generate installment invoices, verify bank payments, and issue digital receipts.
7. Students and parents can log into their dedicated portals to view only their authorized timetables, academic records, attendance logs, and fee balances.
8. System menus and functional access dynamically adjust based on the logged-in user role under the RBAC framework.

## 7. Out of Scope (Current Release)
- Direct integration with third-party physical biometric access turnstiles.
- Native payroll processing and staff salary disbursement.
- Physical RFID library circulation hardware integration.
- Multi-currency live currency exchange rate conversion.