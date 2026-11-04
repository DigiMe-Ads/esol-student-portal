import React, { type ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
  element: ReactNode;
  visible?: boolean;

}

const withLayout = (component: ReactNode) => <AppLayout>{component}</AppLayout>;

export const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/',
    element: withLayout(<DashboardPage />),
  },
  {
    name: 'CRM & Admissions',
    path: '/crm',
    element: withLayout(<CRMPage />),
  },
  {
    name: 'Students (SIS)',
    path: '/students',
    element: withLayout(<StudentsPage />),
  },
  {
    name: 'Attendance Scanner',
    path: '/attendance',
    element: withLayout(<AttendancePage />),
  },
  {
    name: 'Academic Programmes',
    path: '/academics',
    element: withLayout(<AcademicsPage />),
  },
  {
    name: 'Timetable Scheduler',
    path: '/timetable',
    element: withLayout(<TimetablePage />),
  },
  {
    name: 'Lecturers & Faculty',
    path: '/lecturers',
    element: withLayout(<LecturersPage />),
  },
  {
    name: 'Learning Management System',
    path: '/lms',
    element: withLayout(<LMSPage />),
  },
  {
    name: 'Examinations',
    path: '/examinations',
    element: withLayout(<ExaminationsPage />),
  },
  {
    name: 'Finance & Invoicing (LKR)',
    path: '/finance',
    element: withLayout(<FinancePage />),
  },
  {
    name: 'Student Portal',
    path: '/portal/student',
    element: withLayout(<StudentPortalPage />),
  },
  {
    name: 'Parent Portal',
    path: '/portal/parent',
    element: withLayout(<ParentPortalPage />),
  },
  {
    name: 'Lecturer Portal',
    path: '/portal/lecturer',
    element: withLayout(<LecturerPortalPage />),
  },
  {
    name: 'Evaluations',
    path: '/evaluations',
    element: withLayout(<EvaluationsPage />),
  },
  {
    name: 'Certificates & Documents',
    path: '/certificates',
    element: withLayout(<CertificatesPage />),
  },
  {
    name: 'Communications',
    path: '/communications',
    element: withLayout(<CommunicationsPage />),
  },
  {
    name: 'Reports & Analytics',
    path: '/reports',
    element: withLayout(<ReportsPage />),
  },
  {
    name: 'Alumni Directory',
    path: '/alumni',
    element: withLayout(<AlumniPage />),
  },
  {
    name: 'Support Tickets',
    path: '/tickets',
    element: withLayout(<TicketsPage />),
  },
  {
    name: 'Campus Facilities',
    path: '/campus-admin',
    element: withLayout(<CampusAdminPage />),
  },
  {
    name: 'Settings & RBAC',
    path: '/settings',
    element: withLayout(<SettingsPage />),
  },
];
