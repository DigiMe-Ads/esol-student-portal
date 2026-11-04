import React from 'react';
import { useAuthRole, USER_ROLES } from '@/contexts/AuthRoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sliders,
  Shield,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLogCard, ChangePasswordCard, PortalAccountsCard } from '@/components/settings/AccountPanels';
import { usePermission } from '@/lib/permissions';

export const SettingsPage: React.FC = () => {
  const { currentRole, setCurrentRole } = useAuthRole();
  const { user } = useAuth();
  const can = usePermission();

  const permissionsMatrix = [
    { module: 'CRM & Lead Admissions', superAdmin: true, admissions: true, finance: false, lecturer: false, student: false },
    { module: 'Inquiry-to-Student Conversion', superAdmin: true, admissions: true, finance: false, lecturer: false, student: false },
    { module: 'Student Information System (SIS)', superAdmin: true, admissions: true, finance: true, lecturer: true, student: false },
    { module: 'Barcode/QR Gate Attendance Scanner', superAdmin: true, admissions: false, finance: false, lecturer: true, student: false },
    { module: 'LMS Coursework & Online Quizzes', superAdmin: true, admissions: false, finance: false, lecturer: true, student: true },
    { module: 'Examinations & Grade Publishing', superAdmin: true, admissions: false, finance: false, lecturer: false, student: false },
    { module: 'Finance & LKR Payment Verification', superAdmin: true, admissions: false, finance: true, lecturer: false, student: false },
    { module: 'Degree Certificate Generation', superAdmin: true, admissions: false, finance: false, lecturer: false, student: false },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Settings & Role-Based Access Control (RBAC)
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Institutional Governance
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Configured with 11 distinct operational roles, granular permission gates, and immutable audit logs.
          </p>
        </div>
      </div>

      {/* RBAC Matrix Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Role Permission Matrix</CardTitle>
          <CardDescription className="text-xs">
            Dynamic access control applied across campus workflows
          </CardDescription>
        </CardHeader>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Functional Module</th>
                <th className="py-3 px-4 text-center">Super Admin</th>
                <th className="py-3 px-4 text-center">Admissions</th>
                <th className="py-3 px-4 text-center">Finance</th>
                <th className="py-3 px-4 text-center">Lecturer</th>
                <th className="py-3 px-4 text-center">Student</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-semibold text-foreground">{row.module}</td>
                  <td className="py-3 px-4 text-center">
                    {row.superAdmin ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-muted-foreground inline" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.admissions ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-muted-foreground inline" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.finance ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-muted-foreground inline" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.lecturer ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-muted-foreground inline" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.student ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-muted-foreground inline" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {user?.role === 'super_admin' && <PortalAccountsCard />}
      {can('readAudit') && <AuditLogCard />}
      <ChangePasswordCard />
    </div>
  );
};
