import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { campusApi } from '@/services/campusApi';
import { usePermission } from '@/lib/permissions';
import type { Batch, Campus, Inquiry, Programme, Student } from '@/types/campus';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnrollStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: Campus[];
  programmes: Programme[];
  batches: Batch[];
  inquiry?: Inquiry | null; // CRM conversion: prefills and marks the inquiry Registered
  onEnrolled: (student: Student) => void;
}

const blank = {
  full_name: '', phone: '', whatsapp: '', email: '', dob: '', gender: '', address: '', emergency_contact: '',
  parent_name: '', parent_phone: '', parent_email: '', campus_id: '', programme_id: '', batch_id: '',
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 24);

export const EnrollStudentDialog: React.FC<EnrollStudentDialogProps> = ({
  open, onOpenChange, campuses, programmes, batches, inquiry, onEnrolled,
}) => {
  const can = usePermission();
  const [f, setF] = useState({ ...blank });
  const [fee, setFee] = useState(0);
  const [paid, setPaid] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [studentLogin, setStudentLogin] = useState(true);
  const [studentUser, setStudentUser] = useState('');
  const [studentPw, setStudentPw] = useState('');
  const [parentLogin, setParentLogin] = useState(false);
  const [parentUser, setParentUser] = useState('');
  const [parentPw, setParentPw] = useState('');
  const [saving, setSaving] = useState(false);
  const canLogins = can('createStudentLogins');

  useEffect(() => {
    if (!open) return;
    const prog = programmes.find((p) => p.id === inquiry?.interested_programme_id) ?? programmes[0];
    setF({
      ...blank,
      full_name: inquiry?.student_name ?? '',
      phone: inquiry?.contact_number ?? '',
      whatsapp: inquiry?.whatsapp_number ?? '',
      email: inquiry?.email ?? '',
      dob: inquiry?.dob ?? '',
      parent_name: inquiry?.parent_name ?? '',
      parent_phone: inquiry?.parent_contact ?? '',
      campus_id: inquiry?.preferred_campus_id ?? campuses[0]?.id ?? '',
      programme_id: prog?.id ?? '',
    });
    setFee(Number(prog?.registration_fee ?? 0));
    setPaid(0);
    setPayMethod('Cash');
    setPayRef('');
    setStudentLogin(canLogins);
    setStudentUser(inquiry ? slug(inquiry.student_name) : '');
    setStudentPw('');
    setParentLogin(false);
    setParentUser('');
    setParentPw('');
  }, [open, inquiry, programmes, campuses, canLogins]);

  // only batches of the chosen programme (batch -> intake -> programme)
  const programmeBatches = useMemo(
    () => batches.filter((b) => b.intake?.programme_id === f.programme_id || b.intake?.programme?.id === f.programme_id),
    [batches, f.programme_id],
  );

  useEffect(() => {
    if (!programmeBatches.some((b) => b.id === f.batch_id)) {
      setF((prev) => ({ ...prev, batch_id: programmeBatches[0]?.id ?? '' }));
    }
  }, [programmeBatches, f.batch_id]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const handleProgramme = (id: string) => {
    setF({ ...f, programme_id: id });
    setFee(Number(programmes.find((p) => p.id === id)?.registration_fee ?? 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentLogin && (studentUser.length < 3 || studentPw.length < 8)) {
      toast.error('Student login needs a username (3+ characters) and a password of at least 8 characters.');
      return;
    }
    if (parentLogin && (parentUser.length < 3 || parentPw.length < 8)) {
      toast.error('Parent login needs a username (3+ characters) and a password of at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const { student } = await campusApi.enrollStudent({
        ...f,
        batch_id: f.batch_id || null,
        registration_fee: fee,
        amount_paid: paid,
        payment_method: payMethod,
        payment_reference: payRef,
        inquiry_id: inquiry?.id ?? null,
      });
      const loginErrors: string[] = [];
      if (studentLogin) {
        await campusApi
          .createPortalUser({ username: studentUser, displayName: student.full_name, role: 'student', password: studentPw, studentId: student.id })
          .catch((err) => loginErrors.push(`student login: ${err.message}`));
      }
      if (parentLogin) {
        await campusApi
          .createPortalUser({
            username: parentUser, displayName: f.parent_name || `Parent of ${student.full_name}`, role: 'parent', password: parentPw, studentId: student.id,
          })
          .catch((err) => loginErrors.push(`parent login: ${err.message}`));
      }
      toast.success(`${student.full_name} registered as ${student.student_number}.`);
      if (loginErrors.length) toast.error(`Student saved, but ${loginErrors.join('; ')}. Add it from the student's 360° view.`);
      onEnrolled(student);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not register the student.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, k: keyof typeof blank, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={f[k]} onChange={set(k)} className="h-8 text-xs" {...props} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            {inquiry ? `Convert ${inquiry.ref_number} to Student` : 'Register New Student'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creates the student record, programme enrolment, registration invoice and (optionally) portal logins. A student number is assigned automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Personal details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {field('Full name *', 'full_name', { required: true })}
              {field('Phone *', 'phone', { required: true })}
              {field('WhatsApp', 'whatsapp')}
              {field('Email', 'email', { type: 'email' })}
              {field('Date of birth', 'dob', { type: 'date' })}
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Not specified" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">{field('Address', 'address')}</div>
              {field('Emergency contact', 'emergency_contact')}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Parent / guardian</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {field('Name', 'parent_name')}
              {field('Phone', 'parent_phone')}
              {field('Email', 'parent_email', { type: 'email' })}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Enrolment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Campus</Label>
                <Select value={f.campus_id} onValueChange={(v) => setF({ ...f, campus_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {campuses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Programme *</Label>
                <Select value={f.programme_id} onValueChange={handleProgramme}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select programme" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {programmes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Batch</Label>
                <Select value={f.batch_id} onValueChange={(v) => setF({ ...f, batch_id: v })} disabled={programmeBatches.length === 0}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={programmeBatches.length ? 'Select batch' : 'No batches for this programme'} />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {programmeBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Registration fee (LKR)</Label>
                <Input type="number" min={0} value={fee} onChange={(e) => setFee(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paid now (LKR)</Label>
                <Input type="number" min={0} max={fee} value={paid} onChange={(e) => setPaid(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              {paid > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Method / reference</Label>
                  <div className="flex gap-1.5">
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent className="text-xs">
                        {['Cash', 'Card', 'Bank Transfer', 'Online'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Ref" className="h-8 text-xs" />
                  </div>
                </div>
              )}
            </div>
          </section>

          {canLogins && (
            <section className="space-y-2">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Portal logins</h4>
              <label className="flex items-center gap-2">
                <Checkbox checked={studentLogin} onCheckedChange={(v) => setStudentLogin(v === true)} />
                <span>Create a student login (student portal & LMS)</span>
              </label>
              {studentLogin && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <Input value={studentUser} onChange={(e) => setStudentUser(e.target.value.toLowerCase())} placeholder="Username" className="h-8 text-xs" />
                  <Input type="password" autoComplete="new-password" value={studentPw} onChange={(e) => setStudentPw(e.target.value)} placeholder="Password (min 8)" className="h-8 text-xs" />
                </div>
              )}
              <label className="flex items-center gap-2">
                <Checkbox checked={parentLogin} onCheckedChange={(v) => setParentLogin(v === true)} />
                <span>Create a parent / guardian login (parent portal)</span>
              </label>
              {parentLogin && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <Input value={parentUser} onChange={(e) => setParentUser(e.target.value.toLowerCase())} placeholder="Username" className="h-8 text-xs" />
                  <Input type="password" autoComplete="new-password" value={parentPw} onChange={(e) => setParentPw(e.target.value)} placeholder="Password (min 8)" className="h-8 text-xs" />
                </div>
              )}
            </section>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !f.programme_id} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {inquiry ? 'Convert & Register' : 'Register Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
