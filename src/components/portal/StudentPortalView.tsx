import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Bell, Calendar, CheckCircle2, Clock, FileCheck2, LifeBuoy, Phone, Star, Upload, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { campusApi } from '@/services/campusApi';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { formatLKR, todayISO } from '@/lib/print';
import type {
  AttendanceRecord, Certificate, ClassSession, ExamRegistration, Invoice, LMSCourse, Lecturer, Payment,
  Student, SupportTicket, SystemNotification,
} from '@/types/campus';
import { StudentIDCard } from '@/components/id-card/StudentIDCard';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { EvaluationDialog, PaymentSlipDialog, TicketDialog, type EvaluationTarget } from '@/components/portal/PortalDialogs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Mode = 'student' | 'parent';

interface PortalData {
  student: Student;
  sessions: ClassSession[];
  courses: LMSCourse[];
  invoices: Invoice[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  results: ExamRegistration[];
  certificates: Certificate[];
  tickets: SupportTicket[];
  notifications: SystemNotification[];
  lecturers: Lecturer[];
  evaluated: { lecturer_id: string; module_id: string }[];
}

const tone = (ok: boolean) => (ok ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white');

// Students and parents only ever receive their own rows (database RLS), so the client-side
// filters below matter only when a Super Admin previews a student's portal.
async function loadPortal(studentId: string, mode: Mode, preview: boolean): Promise<PortalData | null> {
  const student = await campusApi.getStudentById(studentId);
  if (!student) return null;
  const batchIds = new Set((student.enrollments ?? []).map((e) => e.batch_id).filter(Boolean));
  const programmeIds = new Set((student.enrollments ?? []).map((e) => e.programme_id));
  const [sessions, courses, invoices, payments, attendance, results, certificates, tickets, notifications, lecturers, evaluated] =
    await Promise.all([
      campusApi.getClassSessions(),
      campusApi.getLMSCourses(),
      campusApi.getInvoices(),
      campusApi.getPayments(),
      campusApi.getAttendanceRecords(),
      campusApi.getStudentResults(studentId),
      campusApi.getCertificates(),
      campusApi.getSupportTickets(),
      campusApi.getNotificationFeed(),
      campusApi.getLecturers(),
      mode === 'student' && !preview ? campusApi.getMyEvaluations() : Promise.resolve([]),
    ]);
  const mine = <T extends { student_id?: string | null }>(rows: T[]) => rows.filter((r) => r.student_id === studentId);
  return {
    student,
    sessions: sessions.filter((s) => batchIds.has(s.batch_id)),
    courses: courses.filter((c) => !c.module?.programme_id || programmeIds.has(c.module.programme_id)),
    invoices: mine(invoices),
    payments: mine(payments),
    attendance: mine(attendance),
    results: results.filter((r) => r.result_status === 'Published' || r.marks == null),
    certificates: mine(certificates),
    tickets: mine(tickets),
    notifications: notifications.filter(
      (n) => n.student_id === studentId || (n.target_batch_id && batchIds.has(n.target_batch_id))
        || (!n.student_id && !n.target_batch_id && (n.user_role === 'All' || n.user_role === mode)),
    ),
    lecturers,
    evaluated,
  };
}

export const StudentPortalView: React.FC<{ mode: Mode }> = ({ mode }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portalStudentId, canSwitchRole, setPreviewStudentId } = useAuthRole();
  const preview = canSwitchRole && !user?.student_id;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [slipInvoice, setSlipInvoice] = useState<Invoice | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);

  useEffect(() => {
    if (preview) campusApi.getStudents().then(setAllStudents).catch(() => setAllStudents([]));
  }, [preview]);

  const reload = () => {
    if (!portalStudentId) return;
    setLoading(true);
    loadPortal(portalStudentId, mode, preview)
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [portalStudentId, mode]);

  const today = todayISO();
  const stats = useMemo(() => {
    if (!data) return null;
    const held = data.sessions.filter((s) => s.date <= today && s.status !== 'Cancelled');
    const heldIds = new Set(held.map((s) => s.id));
    const present = data.attendance.filter((a) => heldIds.has(a.class_session_id) && a.status !== 'Absent').length;
    const pct = held.length ? Math.round((present / held.length) * 1000) / 10 : null;
    const published = data.results.filter((r) => r.result_status === 'Published' && r.marks != null);
    const avg = published.length ? Math.round(published.reduce((a, r) => a + Number(r.marks), 0) / published.length) : null;
    const paid = data.invoices.reduce((a, i) => a + Number(i.paid_amount), 0);
    const due = data.invoices.reduce((a, i) => a + Number(i.balance_due), 0);
    const next = data.invoices.filter((i) => Number(i.balance_due) > 0).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
    return { held: held.length, present, pct, avg, published: published.length, paid, due, next };
  }, [data, today]);

  const evalTargets: EvaluationTarget[] = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const out: EvaluationTarget[] = [];
    for (const s of data.sessions) {
      if (!s.lecturer || !s.module) continue;
      const k = `${s.lecturer.id}|${s.module.id}`;
      if (seen.has(k) || data.evaluated.some((e) => `${e.lecturer_id}|${e.module_id}` === k)) continue;
      seen.add(k);
      out.push({ lecturer: s.lecturer, module: s.module });
    }
    return out;
  }, [data]);

  // ---- no student to show
  if (!portalStudentId) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-serif font-bold">{mode === 'parent' ? 'Parent Portal' : 'Student Portal'}</h1>
          {preview ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Super Admin preview: choose a student to see their portal exactly as they do.</span>
              <Select onValueChange={setPreviewStudentId}>
                <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent className="text-xs">
                  {allStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.student_number} – {s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">This login is not linked to a student record. Ask the admissions office to link it.</p>
          )}
        </div>
      </div>
    );
  }

  if (!data || !stats) {
    return <div className="py-24 text-center text-xs text-muted-foreground">{loading ? 'Loading portal…' : 'Student record not found.'}</div>;
  }

  const { student } = data;
  const enrollment = student.enrollments?.[0];
  const upcoming = data.sessions.filter((s) => s.date >= today && s.status !== 'Cancelled');
  const past = data.sessions.filter((s) => s.date < today || s.status === 'Cancelled').reverse();
  const isParent = mode === 'parent';
  const canAct = !preview; // a previewing admin sees the portal read-only

  return (
    <div className="space-y-6">
      {preview && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <span className="font-semibold text-amber-700">Preview mode (read-only):</span>
          <Select value={portalStudentId} onValueChange={setPreviewStudentId}>
            <SelectTrigger className="h-7 w-72 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="text-xs">
              {allStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.student_number} – {s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <StudentAvatar student={student} className="w-14 h-14 rounded-full text-lg border-2 border-primary/30" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">
                {isParent ? `Guardian view: ${student.full_name}` : `Welcome back, ${student.full_name}`}
              </h1>
              <Badge className={`${tone(student.status === 'Active')} text-[10px]`}>{student.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Student ID: <span className="font-mono text-primary font-bold">{student.student_number}</span>
              {enrollment?.programme && <> • {enrollment.programme.name}</>}
              {enrollment?.batch && <> • {enrollment.batch.name}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isParent && student.campus?.contact_phone && (
            <Button asChild size="sm" variant="outline" className="text-xs h-9 gap-1.5">
              <a href={`tel:${student.campus.contact_phone.replace(/\s+/g, '')}`}><Phone className="w-4 h-4" /> Call {student.campus.name.split(' ')[0]} Campus</a>
            </Button>
          )}
          {canAct && (
            <Button size="sm" onClick={() => setTicketOpen(true)} variant="outline" className="text-xs h-9 gap-1.5">
              <LifeBuoy className="w-4 h-4" /> Need Help? Submit Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Attendance Rate</div>
            <div className="text-xl font-bold font-serif text-foreground">{stats.pct === null ? 'No classes yet' : `${stats.pct}%`}</div>
            <div className="text-[10px] text-muted-foreground">{stats.present} of {stats.held} classes held so far</div>
          </div>
        </Card>
        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><Award className="w-5 h-5" /></div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Average Exam Mark</div>
            <div className="text-xl font-bold font-serif text-foreground">{stats.avg === null ? 'No results yet' : `${stats.avg}%`}</div>
            <div className="text-[10px] text-blue-600">{stats.published} published result(s)</div>
          </div>
        </Card>
        <Card className="p-4 shadow-sm border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-mono">Fees</div>
            <div className="text-xl font-bold font-serif text-foreground">{formatLKR(stats.paid)} paid</div>
            <div className={`text-[10px] ${stats.due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {stats.due > 0 ? `${formatLKR(stats.due)} outstanding${stats.next ? ` • next due ${stats.next.due_date}` : ''}` : 'All fees cleared'}
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="timetable" className="text-xs">Timetable ({upcoming.length})</TabsTrigger>
          {!isParent && <TabsTrigger value="lms" className="text-xs">My Modules ({data.courses.length})</TabsTrigger>}
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="results" className="text-xs">Results ({data.results.length})</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs">Fees (LKR)</TabsTrigger>
          {!isParent && <TabsTrigger value="idcard" className="text-xs">Digital ID Card</TabsTrigger>}
          <TabsTrigger value="certs" className="text-xs">Certificates ({data.certificates.length})</TabsTrigger>
          <TabsTrigger value="support" className="text-xs">Support ({data.tickets.length})</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs">Notices ({data.notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable" className="space-y-3">
          {upcoming.length === 0 && <div className="text-xs text-muted-foreground italic">No upcoming classes scheduled for this batch.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((sess) => (
              <Card key={sess.id} className="p-4 border-border shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{sess.module?.code}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">{sess.status}</Badge>
                </div>
                <h4 className="font-bold text-xs text-foreground">{sess.module?.name}</h4>
                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date: {sess.date}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time: {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}</div>
                  <div>📍 Classroom: {sess.room_number}</div>
                  <div>👨‍🏫 Lecturer: {sess.lecturer?.full_name ?? 'TBA'}</div>
                </div>
              </Card>
            ))}
          </div>
          {!isParent && canAct && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 text-xs">
              <span>Evaluate your lecturers anonymously ({evalTargets.length} remaining).</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEvalOpen(true)}>
                <Star className="w-3.5 h-3.5 text-amber-500" /> Evaluate a Lecturer
              </Button>
            </div>
          )}
        </TabsContent>

        {!isParent && (
          <TabsContent value="lms" className="space-y-4">
            {data.courses.length === 0 && <div className="text-xs text-muted-foreground italic">No LMS courses for your programme yet.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.courses.map((c) => (
                <Card key={c.id} className="p-4 border-border shadow-sm space-y-2.5">
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="text-[10px] font-mono">{c.module?.code}</Badge>
                    <span className="text-[10px] text-muted-foreground">{c.module?.credits} Credits</span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground">{c.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{c.materials?.length || 0} materials • {c.assignments?.length || 0} assignments</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/lms?course=${c.id}`)} className="h-7 text-xs">Enter Classroom →</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="attendance">
          <Card className="shadow-sm border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                <tr><th className="py-2.5 px-3">Date</th><th className="py-2.5 px-3">Module</th><th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3">Remarks</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {past.length === 0 && <tr><td colSpan={4} className="py-4 px-3 text-muted-foreground italic">No classes held yet.</td></tr>}
                {past.map((s) => {
                  const rec = data.attendance.find((a) => a.class_session_id === s.id);
                  const status = s.status === 'Cancelled' ? 'Cancelled' : rec?.status ?? 'Absent';
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono">{s.date} {s.start_time.slice(0, 5)}</td>
                      <td className="py-2.5 px-3">{s.module?.code} – {s.module?.name}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className={status === 'Present' ? 'text-emerald-600' : status === 'Late' ? 'text-amber-600' : status === 'Cancelled' ? '' : 'text-destructive'}>{status}</Badge></td>
                      <td className="py-2.5 px-3 text-muted-foreground">{rec?.remarks ?? (status === 'Absent' ? 'No check-in recorded' : '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="shadow-sm border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                <tr><th className="py-2.5 px-3">Exam</th><th className="py-2.5 px-3">Date</th><th className="py-2.5 px-3">Eligibility</th><th className="py-2.5 px-3">Marks</th><th className="py-2.5 px-3">Grade</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.results.length === 0 && <tr><td colSpan={5} className="py-4 px-3 text-muted-foreground italic">No exam registrations or published results yet.</td></tr>}
                {data.results.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3">{r.exam?.title}<div className="text-[10px] text-muted-foreground">{r.exam?.module?.code}</div></td>
                    <td className="py-2.5 px-3 font-mono">{r.exam?.exam_date} • {r.exam?.venue}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={r.eligibility_status === 'Ineligible' ? 'text-destructive' : 'text-emerald-600'}>{r.eligibility_status}</Badge>
                      {r.eligibility_status === 'Ineligible' && <div className="text-[10px] text-destructive">{r.eligibility_reason}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">{r.result_status === 'Published' ? `${r.marks}%` : 'Not published'}</td>
                    <td className="py-2.5 px-3">{r.result_status === 'Published' ? r.grade : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-3">
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th><th className="py-2.5 px-3">Item</th><th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Paid</th><th className="py-2.5 px-3">Balance</th><th className="py-2.5 px-3">Due</th>
                    <th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3 text-right">Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.invoices.length === 0 && <tr><td colSpan={8} className="py-4 px-3 text-muted-foreground italic">No invoices.</td></tr>}
                  {data.invoices.map((inv) => {
                    const pending = data.payments.some((p) => p.invoice_id === inv.id && p.status === 'Pending');
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium">{inv.invoice_number}</td>
                        <td className="py-2.5 px-3">{inv.title}</td>
                        <td className="py-2.5 px-3 font-bold font-mono">{formatLKR(inv.total_amount)}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">{formatLKR(inv.paid_amount)}</td>
                        <td className="py-2.5 px-3 text-amber-600 font-semibold">{formatLKR(inv.balance_due)}</td>
                        <td className="py-2.5 px-3 font-mono">{inv.due_date}</td>
                        <td className="py-2.5 px-3"><Badge className={`${tone(inv.status === 'Paid')} text-[9px]`}>{inv.status}</Badge></td>
                        <td className="py-2.5 px-3 text-right">
                          {pending ? (
                            <span className="text-[10px] text-amber-600">Slip awaiting verification</span>
                          ) : (
                            Number(inv.balance_due) > 0 && canAct && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSlipInvoice(inv)}>
                                <Upload className="w-3 h-3" /> Submit Slip
                              </Button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {data.payments.length > 0 && (
            <Card className="shadow-sm border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/60 font-semibold text-xs">Payment history</div>
              <table className="w-full text-xs text-left">
                <tbody className="divide-y divide-border">
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono">{p.receipt_number}</td>
                      <td className="py-2 px-3">{p.payment_date}</td>
                      <td className="py-2 px-3 font-mono">{formatLKR(p.amount)}</td>
                      <td className="py-2 px-3">{p.payment_method}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={p.status === 'Verified' ? 'text-emerald-600' : p.status === 'Rejected' ? 'text-destructive' : 'text-amber-600'}>{p.status}</Badge>
                        {p.status === 'Rejected' && <span className="text-[10px] text-destructive ml-1">{p.notes}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {!isParent && (
          <TabsContent value="idcard" className="flex justify-center py-4">
            <StudentIDCard student={student} />
          </TabsContent>
        )}

        <TabsContent value="certs" className="space-y-3">
          {data.certificates.length === 0 && <div className="text-xs text-muted-foreground italic">No certificates issued yet.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.certificates.map((c) => (
              <Card key={c.id} className="p-4 border-border shadow-sm space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-bold"><FileCheck2 className="w-4 h-4 text-amber-500" /> {c.qualification}</div>
                <div className="text-muted-foreground">{c.programme?.name}</div>
                <div className="font-mono text-[10px]">{c.certificate_number} • issued {c.issue_date}</div>
                <a className="text-primary text-[11px] underline" href={`/verify/${c.verification_code}`} target="_blank" rel="noreferrer">Public verification link</a>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-3">
          {data.tickets.length === 0 && <div className="text-xs text-muted-foreground italic">No tickets yet.</div>}
          {data.tickets.map((t) => (
            <Card key={t.id} className="p-3 border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">{t.subject}</span>
                <Badge variant="outline">{t.status}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">{t.ticket_number} • {t.category} • {new Date(t.created_at).toLocaleDateString()}</div>
              <div className="text-muted-foreground">{t.description}</div>
              {t.resolution_notes && <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">Helpdesk: {t.resolution_notes}</div>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notices" className="space-y-2">
          {data.notifications.length === 0 && <div className="text-xs text-muted-foreground italic">No notices.</div>}
          {data.notifications.map((n) => (
            <Card key={n.id} className="p-3 border-border text-xs flex gap-2.5">
              <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-muted-foreground">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}{n.sent_by ? ` • ${n.sent_by}` : ''}</div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <TicketDialog open={ticketOpen} onOpenChange={setTicketOpen} onDone={reload} student={student} reporterName={isParent ? user?.display_name : undefined} />
      <PaymentSlipDialog open={slipInvoice !== null} onOpenChange={(o) => !o && setSlipInvoice(null)} onDone={reload} invoice={slipInvoice} />
      <EvaluationDialog open={evalOpen} onOpenChange={setEvalOpen} onDone={reload} targets={evalTargets} />
    </div>
  );
};
