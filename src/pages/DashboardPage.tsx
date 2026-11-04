import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import type { Student, Inquiry, Invoice, ClassSession, Lecturer, Payment, Programme, Batch, SupportTicket, Examination } from '@/types/campus';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
import { todayISO } from '@/lib/print';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  Wallet,
  QrCode,
  ArrowUpRight,
  UserCheck,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [exams, setExams] = useState<Examination[]>([]);
  const [scansToday, setScansToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const { selectedCampusId, isRolePermitted } = useAuthRole();
  const can = usePermission();
  const seesFinance = can('readFinance');
  const seesCRM = can('readCRM');

  useEffect(() => {
    const none = <T,>() => Promise.resolve([] as T[]);
    Promise.all([
      campusApi.getStudents(),
      seesCRM ? campusApi.getInquiries() : none<Inquiry>(),
      seesFinance ? campusApi.getInvoices() : none<Invoice>(),
      campusApi.getClassSessions(),
      campusApi.getLecturers(),
      seesFinance ? campusApi.getPayments() : none<Payment>(),
      campusApi.getProgrammes(),
      campusApi.getBatches(),
      campusApi.getSupportTickets(),
      campusApi.getExaminations(),
      campusApi.getAttendanceRecords(),
    ])
      .then(([s, i, inv, sess, lec, pay, prog, bat, tick, ex, att]) => {
        setStudents(s);
        setInquiries(i);
        setInvoices(inv);
        setSessions(sess);
        setLecturers(lec);
        setPayments(pay);
        setProgrammes(prog);
        setBatches(bat);
        setTickets(tick);
        setExams(ex);
        setScansToday(att.filter((a) => a.scan_time.slice(0, 10) === todayISO()).length);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [seesFinance, seesCRM]);

  // Compute KPI metrics (students & sessions follow the header campus filter)
  const campusStudents = students.filter((s) => selectedCampusId === 'all' || s.campus_id === selectedCampusId);
  const campusSessions = sessions.filter((s) => selectedCampusId === 'all' || s.campus_id === selectedCampusId);
  const totalStudents = campusStudents.length;
  const activeStudents = campusStudents.filter((s) => s.status === 'Active').length;
  const today = todayISO();
  const sessionsToday = campusSessions.filter((s) => s.date === today && s.status !== 'Cancelled');
  const upcomingSessions = campusSessions.filter((s) => s.date >= today && s.status !== 'Cancelled');
  const pendingSlips = payments.filter((p) => p.status === 'Pending').length;
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
  const nextExam = exams.filter((e) => e.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  const totalInquiries = inquiries.length;
  const convertedCount = inquiries.filter((i) => i.status === 'Registered').length;
  const conversionRate = totalInquiries > 0 ? Math.round((convertedCount / totalInquiries) * 100) : 0;

  const totalRevenueLKR = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
  const outstandingLKR = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  // Verified collections per month, last 6 months
  const revenueChartData = Array.from({ length: 6 }, (_, k) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - k));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: d.toLocaleString('en', { month: 'short' }),
      collections: payments.filter((p) => p.status === 'Verified' && p.payment_date?.slice(0, 7) === key).reduce((a, p) => a + Number(p.amount), 0),
    };
  });

  // Inquiries by source
  const palette = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
  const inquirySourceData = Object.entries(
    inquiries.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.source]: (acc[i.source] ?? 0) + 1 }), {}),
  ).map(([name, value], idx) => ({ name, value, color: palette[idx % palette.length] }));

  // Enrolment vs batch capacity per programme
  const programmeEnrollmentData = programmes.map((p) => ({
    name: p.code,
    students: campusStudents.filter((st) => st.status === 'Active' && st.enrollments?.some((e) => e.programme_id === p.id)).length,
    capacity: batches.filter((b) => b.intake?.programme_id === p.id).reduce((a, b) => a + Number(b.capacity), 0),
  }));

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              ESOL Premier Campus — Executive Dashboard
            </h1>
            <Badge variant="outline" className="border-amber-400 text-amber-500 bg-amber-400/10 text-[10px]">
              Institutional Suite
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Live figures from the student portal database • Currency: Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRolePermitted('attendance') && (<Button
            size="sm"
            onClick={() => navigate('/attendance')}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            Launch Barcode Scanner
          </Button>)}
          {isRolePermitted('crm') && (<Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/crm')}
            className="text-xs h-9 gap-1.5"
          >
            <Users className="w-4 h-4" />
            Admissions Pipeline
          </Button>)}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Students */}
        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Enrolled Students
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">{activeStudents}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{totalStudents} total registered ({totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0}% active)</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Revenue Collected (LKR) */}
        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Fee Collections (LKR)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {seesFinance ? `LKR ${totalRevenueLKR.toLocaleString()}` : "—"}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-amber-600 font-medium">{seesFinance ? `LKR ${outstandingLKR.toLocaleString()}` : "Finance data not available to this role"}</span>
              {seesFinance && <span>outstanding</span>}
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: CRM Admissions Conversion */}
        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Admissions Pipeline
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">{seesCRM ? `${totalInquiries} Leads` : "—"}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{conversionRate}% lead-to-student conversion</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Faculty & Sessions Today */}
        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Academic Faculty
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">{lecturers.length} Lecturers</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{upcomingSessions.length} upcoming class sessions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Collections Chart (2 cols) */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Revenue & Fee Collection Performance (LKR)
              </CardTitle>
              <CardDescription className="text-xs">
                Verified payments received per month (last 6 months)
              </CardDescription>
            </div>
            {isRolePermitted('finance') && (<Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance')}
              className="text-xs h-7 gap-1"
            >
              Finance Ledger <ArrowUpRight className="w-3 h-3" />
            </Button>)}
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="collectionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1C82F5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1C82F5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [`LKR ${val.toLocaleString()}`, 'Amount']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collections"
                    stroke="#1C82F5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#collectionsGrad)"
                    name="Actual Collections"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Inquiries Source Pie Chart */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-foreground">Inquiry Acquisition Channels</CardTitle>
            <CardDescription className="text-xs">Lead source distribution ({inquiries.length} inquiries)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[230px] w-full min-w-0 overflow-hidden flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inquirySourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {inquirySourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programme Enrollment & Operational Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programme Enrollment vs Capacity Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Programme Capacity Utilization
              </CardTitle>
              <CardDescription className="text-xs">
                Current enrolled students vs maximum batch capacity
              </CardDescription>
            </div>
            {isRolePermitted('academics') && (<Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/academics')}
              className="text-xs h-7 gap-1"
            >
              Academic Structure <ArrowUpRight className="w-3 h-3" />
            </Button>)}
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programmeEnrollmentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="students" name="Enrolled Students" fill="#1C82F5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" name="Total Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live Academic & Attendance Alerts */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">Operational Status</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-300">
                {loading ? 'Loading' : 'Live'}
              </Badge>
            </div>
            <CardDescription className="text-xs">Daily campus operational checklist</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5 text-xs">
              {[
                { ok: sessionsToday.length > 0, title: `${sessionsToday.length} class session(s) today`, detail: `${scansToday} attendance check-in(s) recorded today • ${upcomingSessions.length} upcoming in total` },
                ...(seesFinance ? [{ ok: pendingSlips === 0, title: pendingSlips ? `${pendingSlips} payment slip(s) awaiting verification` : 'No payment slips waiting', detail: 'Finance → Payment Receipts & Verification' }] : []),
                { ok: openTickets === 0, title: openTickets ? `${openTickets} open support ticket(s)` : 'Support queue is clear', detail: 'Support Tickets' },
                { ok: true, title: nextExam ? `Next exam: ${nextExam.title}` : 'No upcoming exams scheduled', detail: nextExam ? `${nextExam.exam_date} • ${nextExam.venue} • min attendance ${nextExam.min_attendance_pct}%` : 'Examinations' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                  {item.ok ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {isRolePermitted('students') && (<Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/students')}
              className="w-full text-xs h-8 mt-2"
            >
              Inspect Student Directory
            </Button>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
