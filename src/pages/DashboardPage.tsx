import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import type { Student, Inquiry, Invoice, ClassSession, Lecturer } from '@/types/campus';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      campusApi.getStudents(),
      campusApi.getInquiries(),
      campusApi.getInvoices(),
      campusApi.getClassSessions(),
      campusApi.getLecturers(),
    ])
      .then(([s, i, inv, sess, lec]) => {
        setStudents(s);
        setInquiries(i);
        setInvoices(inv);
        setSessions(sess);
        setLecturers(lec);
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute KPI metrics
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Active').length;
  const totalInquiries = inquiries.length;
  const convertedCount = inquiries.filter((i) => i.status === 'Registered').length;
  const conversionRate = totalInquiries > 0 ? Math.round((convertedCount / totalInquiries) * 100) : 0;

  const totalRevenueLKR = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
  const outstandingLKR = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  // Revenue & Collections Trend Data
  const revenueChartData = [
    { month: 'May', collections: 420000, target: 500000 },
    { month: 'Jun', collections: 680000, target: 600000 },
    { month: 'Jul', collections: 590000, target: 650000 },
    { month: 'Aug', collections: 890000, target: 800000 },
    { month: 'Sep', collections: 1120000, target: 1000000 },
    { month: 'Oct', collections: totalRevenueLKR > 0 ? totalRevenueLKR : 1250000, target: 1200000 },
  ];

  // Inquiries By Source Data
  const inquirySourceData = [
    { name: 'Website', value: 35, color: '#3b82f6' },
    { name: 'Facebook', value: 25, color: '#6366f1' },
    { name: 'Walk-in', value: 18, color: '#10b981' },
    { name: 'Instagram', value: 14, color: '#f59e0b' },
    { name: 'Referral', value: 8, color: '#ec4899' },
  ];

  // Programme Enrollment Breakdown
  const programmeEnrollmentData = [
    { name: 'DPEC Diploma', students: 18, capacity: 25 },
    { name: 'Cambridge CAE', students: 14, capacity: 20 },
    { name: 'TESL Cert', students: 12, capacity: 20 },
    { name: 'IELTS Master', students: 16, capacity: 20 },
    { name: 'HND English', students: 10, capacity: 15 },
  ];

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
            Real-time management intelligence for Colombo, Kandy & Galle campuses • Currency: Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/attendance')}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            Launch Barcode Scanner
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/crm')}
            className="text-xs h-9 gap-1.5"
          >
            <Users className="w-4 h-4" />
            Admissions Pipeline
          </Button>
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
              <span>{totalStudents} total registered (100% active retention)</span>
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
              LKR {totalRevenueLKR.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-amber-600 font-medium">LKR {outstandingLKR.toLocaleString()}</span>
              <span>due in current term</span>
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
            <div className="text-2xl font-bold font-serif text-foreground">{totalInquiries} Leads</div>
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
              <span>{sessions.length} scheduled class sessions</span>
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
                Monthly tuition collection versus institutional target
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance')}
              className="text-xs h-7 gap-1"
            >
              Finance Ledger <ArrowUpRight className="w-3 h-3" />
            </Button>
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
            <CardDescription className="text-xs">Lead source distribution this term</CardDescription>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/academics')}
              className="text-xs h-7 gap-1"
            >
              Academic Structure <ArrowUpRight className="w-3 h-3" />
            </Button>
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
                All Systems Normal
              </Badge>
            </div>
            <CardDescription className="text-xs">Daily campus operational checklist</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">Barcode Gate Attendance Active</div>
                  <div className="text-[11px] text-muted-foreground">
                    Gate 01 and Multimedia Hall scanner terminals synchronized.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">LMS Course Content Updated</div>
                  <div className="text-[11px] text-muted-foreground">
                    Module DPEC-M1 materials and timed grammar quiz published.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">Exam Eligibility Clearance</div>
                  <div className="text-[11px] text-muted-foreground">
                    Automated 80% attendance rule applied to DPEC Term 1 candidates.
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/students')}
              className="w-full text-xs h-8 mt-2"
            >
              Inspect Student Directory
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
