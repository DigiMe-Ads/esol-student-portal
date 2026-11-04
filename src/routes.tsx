import React, { type ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireNav } from '@/components/common/RequireNav';
import { DashboardPage } from '@/pages/DashboardPage';
import { CRMPage } from '@/pages/CRMPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { AcademicsPage } from '@/pages/AcademicsPage';
import { TimetablePage } from '@/pages/TimetablePage';
import { LecturersPage } from '@/pages/LecturersPage';
import { LMSPage } from '@/pages/LMSPage';
import { ExaminationsPage } from '@/pages/ExaminationsPage';
import { FinancePage } from '@/pages/FinancePage';
import { StudentPortalPage } from '@/pages/StudentPortalPage';
import { ParentPortalPage } from '@/pages/ParentPortalPage';
import { LecturerPortalPage } from '@/pages/LecturerPortalPage';
import { EvaluationsPage } from '@/pages/EvaluationsPage';
import { CertificatesPage } from '@/pages/CertificatesPage';
import { CommunicationsPage } from '@/pages/CommunicationsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AlumniPage } from '@/pages/AlumniPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { CampusAdminPage } from '@/pages/CampusAdminPage';
import { SettingsPage } from '@/pages/SettingsPage';

export interface RouteConfig {
  name: string;
  path: string;
  navKey: string; // must be in the role's allowedNav (AuthRoleContext) to open the page
  element: ReactNode;
}

const page = (navKey: string, component: ReactNode) => (
  <AppLayout>
    <RequireNav navKey={navKey}>{component}</RequireNav>
  </AppLayout>
);

const defs: (Omit<RouteConfig, 'element'> & { component: ReactNode })[] = [
  { name: 'Dashboard', path: '/', navKey: 'dashboard', component: <DashboardPage /> },
  { name: 'CRM & Admissions', path: '/crm', navKey: 'crm', component: <CRMPage /> },
  { name: 'Students (SIS)', path: '/students', navKey: 'students', component: <StudentsPage /> },
  { name: 'Attendance Scanner', path: '/attendance', navKey: 'attendance', component: <AttendancePage /> },
  { name: 'Academic Programmes', path: '/academics', navKey: 'academics', component: <AcademicsPage /> },
  { name: 'Timetable Scheduler', path: '/timetable', navKey: 'timetable', component: <TimetablePage /> },
  { name: 'Lecturers & Faculty', path: '/lecturers', navKey: 'lecturers', component: <LecturersPage /> },
  { name: 'Learning Management System', path: '/lms', navKey: 'lms', component: <LMSPage /> },
  { name: 'Examinations', path: '/examinations', navKey: 'examinations', component: <ExaminationsPage /> },
  { name: 'Finance & Invoicing (LKR)', path: '/finance', navKey: 'finance', component: <FinancePage /> },
  { name: 'Student Portal', path: '/portal/student', navKey: 'student_portal', component: <StudentPortalPage /> },
  { name: 'Parent Portal', path: '/portal/parent', navKey: 'parent_portal', component: <ParentPortalPage /> },
  { name: 'Lecturer Portal', path: '/portal/lecturer', navKey: 'lecturer_portal', component: <LecturerPortalPage /> },
  { name: 'Evaluations', path: '/evaluations', navKey: 'evaluations', component: <EvaluationsPage /> },
  { name: 'Certificates & Documents', path: '/certificates', navKey: 'certificates', component: <CertificatesPage /> },
  { name: 'Communications', path: '/communications', navKey: 'communications', component: <CommunicationsPage /> },
  { name: 'Reports & Analytics', path: '/reports', navKey: 'reports', component: <ReportsPage /> },
  { name: 'Alumni Directory', path: '/alumni', navKey: 'alumni', component: <AlumniPage /> },
  { name: 'Support Tickets', path: '/tickets', navKey: 'tickets', component: <TicketsPage /> },
  { name: 'Campus Facilities', path: '/campus-admin', navKey: 'campus-admin', component: <CampusAdminPage /> },
  { name: 'Settings & RBAC', path: '/settings', navKey: 'settings', component: <SettingsPage /> },
];

export const routes: RouteConfig[] = defs.map(({ component, ...r }) => ({ ...r, element: page(r.navKey, component) }));

// First page a role may open; used after sign-in and when a page is off-limits.
export function homePathFor(isPermitted: (navKey: string) => boolean): string {
  // a role with its own portal starts there; everyone else on their first permitted page
  const portal = ['student_portal', 'parent_portal', 'lecturer_portal'].find((k) => isPermitted(k) && !isPermitted('dashboard'));
  if (portal) return routes.find((r) => r.navKey === portal)!.path;
  return routes.find((r) => isPermitted(r.navKey))?.path ?? '/';
}
