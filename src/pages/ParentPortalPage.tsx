import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Student, AttendanceRecord, Invoice, ExamRegistration } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users2,
  CheckCircle2,
  Calendar,
  Wallet,
  PhoneCall,
  Clock,
  ShieldCheck,
  AlertCircle,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export const ParentPortalPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getStudents(),
      campusApi.getAttendanceRecords(),
      campusApi.getInvoices(),
    ])
      .then(([sList, aList, invList]) => {
        if (sList.length > 0) {
          setStudent(sList[0]);
        }
        setAttendance(aList);
        setInvoices(invList);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Parent Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Parent & Guardian Academic Oversight Portal
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Guardian Portal
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Monitoring student: <strong className="text-foreground">{student?.full_name}</strong> (ID: {student?.student_number}) • Guardian: Sunil Perera
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('Connecting to Campus Student Counselor: +94 11 273 1122')}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <PhoneCall className="w-4 h-4" />
          Call Academic Counselor
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Class Attendance Record</div>
            <div className="text-xl font-bold font-serif text-emerald-600">94.2% Attendance</div>
            <div className="text-[10px] text-muted-foreground">0 Unexcused Absences</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Academic Evaluation</div>
            <div className="text-xl font-bold font-serif text-foreground">Distinction (3.85 GPA)</div>
            <div className="text-[10px] text-blue-600">Top 5% of Weekend Batch A</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Tuition Installments</div>
            <div className="text-xl font-bold font-serif text-foreground">LKR 75,000 Settled</div>
            <div className="text-[10px] text-amber-600">LKR 35,000 Next Due Date: Nov 15</div>
          </div>
        </Card>
      </div>

      {/* Attendance & Grades Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Attendance Feed */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              Recent Class Check-In Timestamps
            </CardTitle>
            <CardDescription className="text-xs">
              Live barcode/QR scanner gate events logged at campus
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Advanced Business Writing & Reporting</div>
                    <div className="text-[10px] text-muted-foreground">Saturday Session • Hall 302</div>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[9px]">Present (09:02 AM)</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Public Speaking & Oral Rhetoric</div>
                    <div className="text-[10px] text-muted-foreground">Sunday Session • Hall 204</div>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[9px]">Present (08:58 AM)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tuition Fee Breakdown */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              Tuition Fee Statement (LKR)
            </CardTitle>
            <CardDescription className="text-xs">
              Direct institutional installment records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-muted/30 rounded-lg border border-border flex justify-between items-center">
                <div>
                  <div className="font-semibold text-foreground">Installment 01 (Registration & Term 1)</div>
                  <div className="text-[10px] text-muted-foreground">Receipt #REC-2026-0001 • Verified</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 font-mono">LKR 75,000</div>
                  <Badge className="bg-emerald-600 text-white text-[8px]">Paid</Badge>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border flex justify-between items-center">
                <div>
                  <div className="font-semibold text-foreground">Installment 02 (Term 2 Tuition)</div>
                  <div className="text-[10px] text-muted-foreground">Due Date: 2026-11-15</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-600 font-mono">LKR 35,000</div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[8px]">Pending</Badge>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => toast.success('Online payment gateway simulation opened.')}
              className="w-full text-xs h-8 bg-primary text-primary-foreground mt-2"
            >
              Pay Online via Banking Portal (LKR)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
