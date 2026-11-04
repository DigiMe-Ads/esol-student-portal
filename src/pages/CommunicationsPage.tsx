import React, { useEffect, useState } from 'react';
import { campusApi } from '@/services/campusApi';
import { useAuth } from '@/contexts/AuthContext';
import type { Batch, Student, SystemNotification } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES: Record<string, { title: string; message: string }> = {
  exam: { title: 'Exam hall notice', message: 'Your examination is scheduled for Saturday at 09:00 AM. Please bring your scannable Student ID card.' },
  fees: { title: 'Fee installment reminder', message: 'A fee installment is due soon. Please check the Fees tab in your portal and submit your payment slip.' },
  cancel: { title: 'Class cancellation', message: 'Today\'s class has been cancelled. A make-up session will be announced on your timetable.' },
};

export const CommunicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [log, setLog] = useState<SystemNotification[]>([]);
  const [audience, setAudience] = useState('student');
  const [batchId, setBatchId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = () =>
    Promise.all([campusApi.getBatches(), campusApi.getStudents(), campusApi.getNotificationFeed()])
      .then(([b, s, n]) => {
        setBatches(b);
        setStudents(s);
        setLog(n);
        setBatchId((p) => p || b[0]?.id || '');
        setStudentId((p) => p || s[0]?.id || '');
      })
      .catch((err) => toast.error(err.message));
  useEffect(() => {
    load();
  }, []);

  const recipients = (() => {
    if (audience === 'batch') return students.filter((s) => s.enrollments?.some((e) => e.batch_id === batchId)).length;
    if (audience === 'one') return 1;
    return students.length;
  })();

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await campusApi.createNotification({
        title,
        message: messageBody,
        sent_by: user?.display_name,
        user_role: audience === 'student' || audience === 'parent' || audience === 'All' ? audience : 'All',
        target_batch_id: audience === 'batch' ? batchId : undefined,
        student_id: audience === 'one' ? studentId : undefined,
      });
      toast.success('Notice published. Recipients see it under Notices in their portal.');
      setTitle('');
      setMessageBody('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const describe = (n: SystemNotification) =>
    n.student ? `Student: ${n.student.full_name}` : n.batch ? `Batch: ${n.batch.name}` : n.user_role === 'All' ? 'Everyone' : `All ${n.user_role}s`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Institutional Communications Hub</h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">In-app Notices</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Publish notices to students and parents. They appear under Notices in the student and parent portals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Compose Announcement</CardTitle>
            <CardDescription className="text-xs">SMS, WhatsApp and email gateways are not connected yet, so notices are delivered in-app.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSendBroadcast} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Delivery Channel</Label>
                <Select value="In-app" onValueChange={() => undefined}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="In-app">In-app portal notice</SelectItem>
                    <SelectItem value="SMS" disabled>SMS (not connected)</SelectItem>
                    <SelectItem value="WhatsApp" disabled>WhatsApp (not connected)</SelectItem>
                    <SelectItem value="Email" disabled>Email (not connected)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recipients</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="All">Everyone (students & parents)</SelectItem>
                    <SelectItem value="student">All students</SelectItem>
                    <SelectItem value="parent">All parents / guardians</SelectItem>
                    <SelectItem value="batch">One batch</SelectItem>
                    <SelectItem value="one">One student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Template</Label>
                <Select onValueChange={(k) => { setTitle(TEMPLATES[k].title); setMessageBody(TEMPLATES[k].message); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Start from a template" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="exam">Exam hall notice</SelectItem>
                    <SelectItem value="fees">Fee reminder</SelectItem>
                    <SelectItem value="cancel">Class cancellation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {audience === 'batch' && (
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                <SelectContent className="text-xs">{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}</SelectContent>
              </Select>
            )}
            {audience === 'one' && (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Student" /></SelectTrigger>
                <SelectContent className="text-xs">{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.student_number} – {s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea required rows={4} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="text-xs" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Reaches {audience === 'parent' ? 'parent logins of' : ''} {recipients} student record{recipients === 1 ? '' : 's'}.
              </span>
              <Button type="submit" disabled={sending} className="h-9 text-xs bg-primary text-primary-foreground gap-1.5">
                <Send className="w-4 h-4" /> Publish Notice
              </Button>
            </div>
          </form>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Dispatch Log</CardTitle>
            <CardDescription className="text-xs">Notices published from the portal (latest first)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
            {log.length === 0 && <div className="text-xs text-muted-foreground italic">Nothing sent yet.</div>}
            {log.map((n) => (
              <div key={n.id} className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{n.title}</span>
                  <Badge className="bg-emerald-600 text-white text-[8px] shrink-0">{n.channel}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">{describe(n)} • {n.sent_by ?? 'System'} • {new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
