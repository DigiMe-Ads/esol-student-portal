import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, RoleConfig } from '@/types/campus';
import { useAuth } from '@/contexts/AuthContext';

export const USER_ROLES: RoleConfig[] = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    badge: 'Executive',
    description: 'Complete institutional governance, system settings, RBAC, campuses, and audit trails',
    allowedNav: ['*'],
  },
  {
    id: 'management',
    label: 'Campus Management',
    badge: 'Executive',
    description: 'Strategic KPI analytics, financial yield, retention rates, and lecturer evaluations',
    allowedNav: ['dashboard', 'reports', 'evaluations', 'finance', 'academics', 'students', 'crm', 'lecturers', 'timetable', 'examinations', 'alumni', 'communications', 'settings'],
  },
  {
    id: 'campus_manager',
    label: 'Campus Manager',
    badge: 'Operations',
    description: 'Campus daily operations, timetables, venue booking, lecturer allocations, and attendance',
    allowedNav: ['dashboard', 'attendance', 'academics', 'lecturers', 'timetable', 'students', 'tickets', 'reports', 'campus-admin', 'communications'],
  },
  {
    id: 'admissions',
    label: 'Admissions Officer',
    badge: 'Front Office',
    description: 'CRM leads, inquiries, follow-ups, registration invoice generation, and student conversion',
    allowedNav: ['dashboard', 'crm', 'students', 'finance', 'alumni', 'communications', 'tickets'],
  },
  {
    id: 'finance',
    label: 'Finance Officer',
    badge: 'Finance',
    description: 'Fee structures, invoices, payment verification queue, cash receipts, and defaulter tracking in LKR',
    allowedNav: ['dashboard', 'finance', 'students', 'reports'],
  },
  {
    id: 'academic_coordinator',
    label: 'Academic Coordinator',
    badge: 'Academic',
    description: 'Programmes, modules, intakes, batches, conflict-free scheduling, and progression',
    allowedNav: ['dashboard', 'academics', 'timetable', 'lecturers', 'students', 'attendance', 'examinations', 'lms', 'evaluations', 'reports', 'communications'],
  },
  {
    id: 'lecturer',
    label: 'Lecturer',
    badge: 'Faculty',
    description: 'Teaching schedule, LMS course materials, assignment grading, quizzes, and class attendance',
    allowedNav: ['lecturer_portal', 'lms', 'attendance', 'timetable', 'evaluations'],
  },
  {
    id: 'exam_officer',
    label: 'Examination Officer',
    badge: 'Academic',
    description: 'Exam scheduling, attendance & fee eligibility gates, mark approval, and grade publication',
    allowedNav: ['dashboard', 'examinations', 'certificates', 'students', 'reports'],
  },
  {
    id: 'receptionist',
    label: 'Reception Officer',
    badge: 'Front Office',
    description: 'Instant barcode/QR ID scanning, attendance verification, visitor inquiries, and support desk',
    allowedNav: ['attendance', 'crm', 'students', 'tickets', 'campus-admin'],
  },
  {
    id: 'student',
    label: 'Student',
    badge: 'Student',
    description: 'Personal portal, digital barcode ID card, course materials, assignments, fees, and results',
    allowedNav: ['student_portal', 'lms'],
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    badge: 'Guardian',
    description: 'Student academic progress monitor, attendance records, fee status, and notifications',
    allowedNav: ['parent_portal'],
  },
];

interface AuthRoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  canSwitchRole: boolean;
  activeRoleConfig: RoleConfig;
  selectedCampusId: string; // campus id or 'all' (header filter)
  setSelectedCampusId: (campusId: string) => void;
  isRolePermitted: (navKey: string) => boolean;
  // Student whose portal is shown: the linked student for student/parent accounts, or the one a
  // Super Admin picked while previewing those portals.
  portalStudentId: string | null;
  setPreviewStudentId: (id: string | null) => void;
  // Lecturer whose portal is shown (linked lecturer, or the Super Admin's preview pick)
  portalLecturerId: string | null;
  setPreviewLecturerId: (id: string | null) => void;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [previewLecturerId, setPreviewLecturerId] = useState<string | null>(null);

  // The signed-in account decides the role; only a Super Admin may preview the portal as other roles.
  const canSwitchRole = user?.role === 'super_admin';
  const currentRole: UserRole = canSwitchRole ? previewRole ?? 'super_admin' : user?.role ?? 'student';

  useEffect(() => {
    setPreviewRole(null);
    setPreviewStudentId(null);
    setPreviewLecturerId(null);
  }, [user?.id]);

  const setCurrentRole = (role: UserRole) => {
    if (canSwitchRole) setPreviewRole(role);
  };

  const activeRoleConfig = USER_ROLES.find((r) => r.id === currentRole) || USER_ROLES[0];

  const isRolePermitted = (navKey: string): boolean => {
    if (activeRoleConfig.allowedNav.includes('*')) return true;
    return activeRoleConfig.allowedNav.includes(navKey);
  };

  const portalStudentId = user?.student_id ?? (canSwitchRole ? previewStudentId : null);
  const portalLecturerId = user?.lecturer_id ?? (canSwitchRole ? previewLecturerId : null);

  return (
    <AuthRoleContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        canSwitchRole,
        activeRoleConfig,
        selectedCampusId,
        setSelectedCampusId,
        isRolePermitted,
        portalStudentId,
        setPreviewStudentId,
        portalLecturerId,
        setPreviewLecturerId,
      }}
    >
      {children}
    </AuthRoleContext.Provider>
  );
};

export const useAuthRole = () => {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider');
  }
  return context;
};
