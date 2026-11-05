import { useAuthRole } from '@/contexts/AuthRoleContext';
import type { UserRole } from '@/types/campus';

// Mirrors the write policies in supabase/00005_roles_and_access.sql, so the UI only offers actions
// the database will accept. (The database is the real gate; this just hides dead buttons.)
const RULES = {
  manageCRM: ['admissions', 'receptionist'],
  readCRM: ['management', 'admissions', 'receptionist'],
  manageStudents: ['admissions', 'academic_coordinator', 'campus_manager'],
  createStudentLogins: ['admissions'],
  readFinance: ['management', 'finance', 'admissions', 'exam_officer'],
  manageFinance: ['finance', 'admissions'],
  verifyPayments: ['finance'],
  manageAcademics: ['academic_coordinator', 'campus_manager'],
  manageTimetable: ['academic_coordinator', 'campus_manager'],
  bookRooms: ['academic_coordinator', 'campus_manager', 'receptionist', 'lecturer'],
  recordAttendance: ['campus_manager', 'receptionist', 'lecturer', 'academic_coordinator'],
  manageLMS: ['academic_coordinator', 'lecturer'],
  manageExams: ['exam_officer', 'academic_coordinator'],
  issueCertificates: ['exam_officer'],
  manageAlumni: ['admissions', 'management'],
  readAudit: ['management'],
  deleteRecords: [], // permanent student/lecturer deletion: Super Admin only
} satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof RULES;

export function roleCan(role: UserRole, perm: Permission): boolean {
  return role === 'super_admin' || (RULES[perm] as UserRole[]).includes(role);
}

export function usePermission() {
  const { currentRole } = useAuthRole();
  return (perm: Permission) => roleCan(currentRole, perm);
}

export const isStaffRole = (role: UserRole) => role !== 'student' && role !== 'parent';
