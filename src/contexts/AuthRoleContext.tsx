import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, RoleConfig, Student, Lecturer } from '@/types/campus';
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
    allowedNav: ['dashboard', 'reports', 'evaluations', 'finance', 'academics', 'students', 'crm'],
  },
  {
    id: 'campus_manager',
    label: 'Campus Manager',
    badge: 'Operations',
    description: 'Campus daily operations, timetables, venue booking, lecturer allocations, and attendance',
    allowedNav: ['dashboard', 'attendance', 'academics', 'lecturers', 'timetable', 'tickets', 'reports'],
  },
  {
    id: 'admissions',
    label: 'Admissions Officer',
    badge: 'Front Office',
    description: 'CRM leads, inquiries, follow-ups, registration invoice generation, and student conversion',
    allowedNav: ['dashboard', 'crm', 'admissions', 'students', 'finance'],
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
    allowedNav: ['dashboard', 'academics', 'batches', 'timetable', 'examinations', 'lms', 'reports'],
  },
  {
    id: 'lecturer',
    label: 'Lecturer',
    badge: 'Faculty',
    description: 'Teaching schedule, LMS course materials, assignment grading, quizzes, and class attendance',
    allowedNav: ['lecturer_portal', 'lms', 'attendance', 'evaluations'],
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
    allowedNav: ['attendance', 'crm', 'students', 'tickets'],
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
  currentStudent: Student | null;
  setCurrentStudent: (student: Student | null) => void;
  currentLecturer: Lecturer | null;
  setCurrentLecturer: (lecturer: Lecturer | null) => void;
  selectedCampusId: string;
  setSelectedCampusId: (campusId: string) => void;
  isRolePermitted: (navKey: string) => boolean;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentRole, setRoleState] = useState<UserRole>(user?.role ?? 'super_admin');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentLecturer, setCurrentLecturer] = useState<Lecturer | null>(null);

  // The signed-in account decides the role; only a Super Admin may preview the portal as other roles.
  const canSwitchRole = user?.role === 'super_admin';

  useEffect(() => {
    if (user) setRoleState(user.role);
  }, [user]);

  const setCurrentRole = (role: UserRole) => {
    if (canSwitchRole) setRoleState(role);
  };

  const activeRoleConfig = USER_ROLES.find((r) => r.id === currentRole) || USER_ROLES[0];

  const isRolePermitted = (navKey: string): boolean => {
    if (currentRole === 'super_admin') return true;
    if (activeRoleConfig.allowedNav.includes('*')) return true;
    return activeRoleConfig.allowedNav.includes(navKey);
  };

  return (
    <AuthRoleContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        canSwitchRole,
        activeRoleConfig,
        currentStudent,
        setCurrentStudent,
        currentLecturer,
        setCurrentLecturer,
        selectedCampusId,
        setSelectedCampusId,
        isRolePermitted,
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
