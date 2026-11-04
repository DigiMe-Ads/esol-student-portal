import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Student, ClassSession, LMSCourse, Invoice, ExamRegistration } from '@/types/campus';
import { StudentIDCard } from '@/components/id-card/StudentIDCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Award,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Shield,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';

export const StudentPortalPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getStudents(),
      campusApi.getClassSessions(),
      campusApi.getLMSCourses(),
      campusApi.getInvoices(),
    ])
      .then(([sList, sess, cList, invList]) => {
        if (sList.length > 0) {
          setStudent(sList[0]);
        }
        setSessions(sess);
        setCourses(cList);
        setInvoices(invList);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Student Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={
              student?.photo_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
            }
            alt=""
            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">
                Welcome back, {student?.full_name || 'Kavinda Perera'}
              </h1>
              <Badge className="bg-emerald-600 text-white text-[10px]">Active Student</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanent Student ID: <span className="font-mono text-primary font-bold">{student?.student_number}</span> • Diploma in Professional English & Communication
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => toast.success('Ticket submitted to Academic Helpdesk')}
            className="text-xs h-9 gap-1.5"
            variant="outline"
          >
            Need Help? Submit Ticket
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Attendance Rate</div>
            <div className="text-xl font-bold font-serif text-foreground">94.2% Verified</div>
            <div className="text-[10px] text-emerald-600">Eligible for Final Examinations</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Current Cumulative GPA</div>
            <div className="text-xl font-bold font-serif text-foreground">3.85 / 4.00</div>
            <div className="text-[10px] text-blue-600">Distinction Standing</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Fee Clearance</div>
            <div className="text-xl font-bold font-serif text-foreground">LKR 75,000 Paid</div>
            <div className="text-[10px] text-muted-foreground">Next installment due in 14 days</div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="timetable" className="text-xs">
            My Timetable ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="lms" className="text-xs">
            My Enrolled Modules ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="idcard" className="text-xs">
            Digital ID Card
          </TabsTrigger>
          <TabsTrigger value="fees" className="text-xs">
            Tuition Ledger (LKR)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Timetable */}
        <TabsContent value="timetable" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <Card key={sess.id} className="p-4 border-border shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    {sess.module?.code}
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">
                    {sess.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-xs text-foreground">{sess.module?.name}</h4>
                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date: {sess.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Time: {sess.start_time} - {sess.end_time}
                  </div>
                  <div>📍 Classroom: {sess.room_number}</div>
                  <div>👨‍🏫 Lecturer: {sess.lecturer?.full_name}</div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Enrolled Modules */}
        <TabsContent value="lms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <Card key={c.id} className="p-4 border-border shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {c.module?.code}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{c.module?.credits} Credits</span>
                </div>
                <h4 className="font-bold text-xs text-foreground">{c.title}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.materials?.length || 0} Materials Available</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info(`Accessing virtual classroom for ${c.title}`)}
                    className="h-7 text-xs"
                  >
                    Enter Classroom →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Digital ID Card */}
        <TabsContent value="idcard" className="flex justify-center py-4">
          {student && <StudentIDCard student={student} />}
        </TabsContent>

        {/* Tab 4: Tuition Invoices */}
        <TabsContent value="fees" className="space-y-3">
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Amount (LKR)</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono font-medium">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3">{inv.title}</td>
                      <td className="py-2.5 px-3 font-bold font-mono">LKR {Number(inv.total_amount).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">LKR {Number(inv.paid_amount).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-amber-600 font-semibold">LKR {Number(inv.balance_due).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          className={
                            inv.status === 'Paid'
                              ? 'bg-emerald-600 text-white text-[9px]'
                              : 'bg-amber-600 text-white text-[9px]'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
