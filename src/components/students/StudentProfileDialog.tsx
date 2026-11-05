import React, { useEffect, useState } from 'react';
import { Edit3, KeyRound, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { campusApi } from '@/services/campusApi';
import { usePermission } from '@/lib/permissions';
import { formatLKR } from '@/lib/print';
import type { AttendanceRecord, ExamRegistration, Invoice, Payment, Student } from '@/types/campus';
import { StudentIDCard } from '@/components/id-card/StudentIDCard';
import { StudentAvatar, PhotoButton } from '@/components/students/StudentAvatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const STUDENT_STATUSES = ['Registered', 'Active', 'On Hold', 'Deferred', 'Withdrawn', 'Completed', 'Graduated', 'Alumni'];

interface Props {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onDelete?: (student: Student) => void; // shown only when the caller may delete
}

const statusTone = (s: string) =>
  s === 'Active' ? 'bg-emerald-600' : s === 'Graduated' || s === 'Alumni' || s === 'Completed' ? 'bg-blue-600' : s === 'Withdrawn' ? 'bg-destructive' : 'bg-amber-600';

export const StudentProfileDialog: React.FC<Props> = ({ student, open, onOpenChange, onChanged, onDelete }) => {
  const can = usePermission();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ExamRegistration[]>([]);
  const [logins, setLogins] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);
  const [newLogin, setNewLogin] = useState({ role: 'student', username: '', password: '' });
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  const canEdit = can('manageStudents');
  const canFinance = can('readFinance');
  const canLogins = can('createStudentLogins');

  const load = async (s: Student) => {
    const [inv, pay, att, res, lg] = await Promise.all([
      canFinance ? campusApi.getInvoices() : Promise.resolve([]),
      canFinance ? campusApi.getPayments() : Promise.resolve([]),
      campusApi.getAttendanceRecords(),
      campusApi.getStudentResults(s.id),
      canLogins ? campusApi.getStudentLogins(s.id) : Promise.resolve([]),
    ]);
    setInvoices(inv.filter((i) => i.student_id === s.id));
    setPayments(pay.filter((p) => p.student_id === s.id));
    setAttendance(att.filter((a) => a.student_id === s.id));
    setResults(res);
    setLogins(lg);
  };

  useEffect(() => {
    if (open && student) {
      setEditing(false);
      setForm(student);
      setPhotoUrl(student.photo_url);
      setNewLogin({ role: 'student', username: student.student_number.toLowerCase(), password: '' });
      load(student).catch((err) => toast.error(err.message));
    }
  }, [open, student?.id]);

  if (!student) return null;

  const totalPaid = invoices.reduce((a, i) => a + Number(i.paid_amount), 0);
  const totalDue = invoices.reduce((a, i) => a + Number(i.balance_due), 0);
  const attended = attendance.filter((a) => a.status !== 'Absent').length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { full_name, email, phone, whatsapp, dob, gender, address, emergency_contact, parent_name, parent_phone, parent_email } = form;
      await campusApi.updateStudent(student.id, {
        full_name, email, phone, whatsapp, dob: dob || undefined, gender, address, emergency_contact, parent_name, parent_phone, parent_email,
      });
      toast.success('Student details saved.');
      setEditing(false);
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: string) => {
    try {
      await campusApi.updateStudentStatus(student.id, status);
      toast.success(`Status changed to ${status}.`);
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await campusApi.createPortalUser({
        username: newLogin.username,
        displayName: newLogin.role === 'parent' ? student.parent_name || `Parent of ${student.full_name}` : student.full_name,
        role: newLogin.role,
        password: newLogin.password,
        studentId: student.id,
      });
      toast.success(`${newLogin.role === 'parent' ? 'Parent' : 'Student'} login "${newLogin.username}" created.`);
      setNewLogin({ ...newLogin, username: '', password: '' });
      setLogins(await campusApi.getStudentLogins(student.id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const input = (label: string, k: keyof Student, type = 'text') => (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input type={type} value={(form[k] as string) ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-8 text-xs" />
    </div>
  );
  const show = (label: string, value?: string | null) => (
    <div>
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="font-semibold text-foreground">{value || '—'}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-base font-serif font-bold text-foreground">Student 360° Profile Record</DialogTitle>
              <DialogDescription className="text-xs">Institutional Master Record • EPC Identifier: {student.student_number}</DialogDescription>
            </div>
            {canEdit ? (
              <Select value={student.status} onValueChange={handleStatus}>
                <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  {STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`${statusTone(student.status)} text-white text-[10px]`}>{student.status}</Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="personal" className="pt-2">
          <TabsList className="h-9 mb-4 flex-wrap h-auto">
            <TabsTrigger value="personal" className="text-xs">Personal & Guardian</TabsTrigger>
            <TabsTrigger value="academic" className="text-xs">Academic Record</TabsTrigger>
            {canFinance && <TabsTrigger value="financial" className="text-xs">Financial Ledger (LKR)</TabsTrigger>}
            {canLogins && <TabsTrigger value="logins" className="text-xs">Portal Logins ({logins.length})</TabsTrigger>}
            <TabsTrigger value="idcard" className="text-xs">Digital ID</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {input('Full name', 'full_name')}
                  {input('Phone', 'phone')}
                  {input('WhatsApp', 'whatsapp')}
                  {input('Email', 'email', 'email')}
                  {input('Date of birth', 'dob', 'date')}
                  {input('Gender', 'gender')}
                  {input('Address', 'address')}
                  {input('Emergency contact', 'emergency_contact')}
                  {input('Guardian name', 'parent_name')}
                  {input('Guardian phone', 'parent_phone')}
                  {input('Guardian email', 'parent_email', 'email')}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setForm(student); setEditing(false); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4 items-start p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <StudentAvatar student={{ ...student, photo_url: photoUrl }} className="w-20 h-24 rounded-lg text-xl" />
                    {canEdit && (
                      <PhotoButton
                        kind="student"
                        record={{ id: student.id, photo_url: photoUrl }}
                        onChanged={(url) => { setPhotoUrl(url); onChanged(); }}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{student.full_name}</h3>
                        <div className="text-xs font-mono text-primary font-semibold">{student.student_number}</div>
                      </div>
                      <div className="flex gap-1.5">
                        {canEdit && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditing(true)}>
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={() => onDelete(student)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div>📞 Phone: <span className="text-foreground">{student.phone}</span></div>
                      <div>💬 WhatsApp: <span className="text-foreground">{student.whatsapp || student.phone}</span></div>
                      <div>✉️ Email: <span className="text-foreground">{student.email || '—'}</span></div>
                      <div>🎂 DOB: <span className="text-foreground">{student.dob || '—'}</span></div>
                      <div>🚻 Gender: <span className="text-foreground">{student.gender || '—'}</span></div>
                      <div>📍 Campus: <span className="text-foreground">{student.campus?.name || '—'}</span></div>
                      <div className="sm:col-span-2">🏠 Address: <span className="text-foreground">{student.address || '—'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Parent / Guardian & Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    {show('Guardian Name', student.parent_name)}
                    {show('Guardian Phone', student.parent_phone)}
                    {show('Guardian Email', student.parent_email)}
                    {show('Emergency Contact', student.emergency_contact)}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="academic" className="space-y-3">
            {(student.enrollments ?? []).length === 0 && <div className="text-muted-foreground italic">No programme enrolments.</div>}
            {(student.enrollments ?? []).map((en) => (
              <div key={en.id} className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-foreground text-sm">{en.programme?.name}</div>
                  <Badge variant="outline" className="text-emerald-600">{en.status}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {show('Batch', en.batch ? `${en.batch.name} (${en.batch.code})` : 'Not assigned')}
                  {show('Enrolled', en.enrolled_date)}
                  {show('Attendance', attendance.length ? `${attended} of ${attendance.length} scans present/late` : 'No scans yet')}
                </div>
              </div>
            ))}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/60 font-semibold">Examination results</div>
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-[10px] uppercase font-mono text-muted-foreground">
                  <tr><th className="py-2 px-3">Exam</th><th className="py-2 px-3">Eligibility</th><th className="py-2 px-3">Marks</th><th className="py-2 px-3">Grade</th><th className="py-2 px-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.length === 0 && <tr><td colSpan={5} className="py-3 px-3 text-muted-foreground italic">Not registered for any exams.</td></tr>}
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3">{r.exam?.title}</td>
                      <td className="py-2 px-3">{r.eligibility_status}</td>
                      <td className="py-2 px-3 font-mono">{r.marks ?? '—'}</td>
                      <td className="py-2 px-3">{r.grade ?? '—'}</td>
                      <td className="py-2 px-3">{r.result_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {canFinance && (
            <TabsContent value="financial" className="space-y-3">
              <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-mono">Total paid</div>
                  <div className="text-xl font-bold font-serif text-emerald-600">{formatLKR(totalPaid)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase font-mono">Outstanding balance</div>
                  <div className={`text-xl font-bold font-serif ${totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatLKR(totalDue)}</div>
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                    <tr><th className="py-2.5 px-3">Invoice #</th><th className="py-2.5 px-3">Description</th><th className="py-2.5 px-3">Total</th><th className="py-2.5 px-3">Paid</th><th className="py-2.5 px-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.length === 0 && <tr><td colSpan={5} className="py-3 px-3 text-muted-foreground italic">No invoices.</td></tr>}
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 px-3 font-mono font-medium">{i.invoice_number}</td>
                        <td className="py-2.5 px-3">{i.title}</td>
                        <td className="py-2.5 px-3 font-medium">{formatLKR(i.total_amount)}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">{formatLKR(i.paid_amount)}</td>
                        <td className="py-2.5 px-3"><Badge variant="outline" className="text-[9px]">{i.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {payments.length} payment record(s): {payments.filter((p) => p.status === 'Pending').length} awaiting verification.
              </div>
            </TabsContent>
          )}

          {canLogins && (
            <TabsContent value="logins" className="space-y-3">
              <div className="border border-border rounded-lg divide-y divide-border">
                {logins.length === 0 && <div className="p-3 text-muted-foreground italic">No portal logins yet.</div>}
                {logins.map((l) => (
                  <div key={l.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-semibold">{l.username}</div>
                      <div className="text-[11px] text-muted-foreground">{l.display_name}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{l.role}</Badge>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCreateLogin} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-[10px]">Login for</Label>
                  <Select value={newLogin.role} onValueChange={(v) => setNewLogin({ ...newLogin, role: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent / guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input required value={newLogin.username} onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value.toLowerCase() })} placeholder="Username" className="h-8 text-xs" />
                <Input required type="password" minLength={8} autoComplete="new-password" value={newLogin.password} onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })} placeholder="Password (min 8)" className="h-8 text-xs" />
                <Button type="submit" size="sm" className="gap-1"><KeyRound className="w-3.5 h-3.5" /> Create Login</Button>
              </form>
            </TabsContent>
          )}

          <TabsContent value="idcard" className="flex justify-center py-3">
            <StudentIDCard student={{ ...student, photo_url: photoUrl }} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
