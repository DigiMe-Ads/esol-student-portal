import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import { useAuth } from '@/contexts/AuthContext';
import type { Student, SupportTicket } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES: SupportTicket['status'][] = ['Open', 'In Progress', 'Resolved', 'Closed'];
const CATEGORIES = ['Academic', 'Finance', 'Technical', 'Attendance', 'Examinations', 'Student Affairs', 'Other'];

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({ student_id: 'none', subject: '', category: 'Academic', priority: 'Medium', description: '' });

  const [active, setActive] = useState<SupportTicket | null>(null);
  const [edit, setEdit] = useState({ status: 'Open', assigned_to: '', resolution_notes: '' });

  const loadData = () => {
    setLoading(true);
    Promise.all([campusApi.getSupportTickets(), campusApi.getStudents()])
      .then(([t, s]) => {
        setTickets(t);
        setStudents(s);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const shown = tickets.filter((t) =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? t.status === 'Open' || t.status === 'In Progress' : t.status === statusFilter,
  );
  const count = (st: string) => tickets.filter((t) => t.status === st).length;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((x) => x.id === newForm.student_id);
    setBusy(true);
    try {
      const created = await campusApi.createSupportTicket({
        subject: newForm.subject,
        category: newForm.category,
        priority: newForm.priority as SupportTicket['priority'],
        description: newForm.description,
        student_id: st?.id,
        student_name: st?.full_name ?? `Walk-in (logged by ${user?.display_name})`,
        status: 'Open',
      });
      toast.success(`Ticket ${created.ticket_number} logged.`);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openTicket = (t: SupportTicket) => {
    setActive(t);
    setEdit({ status: t.status, assigned_to: t.assigned_to ?? '', resolution_notes: t.resolution_notes ?? '' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if ((edit.status === 'Resolved' || edit.status === 'Closed') && !edit.resolution_notes.trim()) {
      toast.error('Add a resolution note before resolving or closing the ticket.');
      return;
    }
    setBusy(true);
    try {
      await campusApi.updateTicketStatus(active.id, edit.status, edit.resolution_notes || undefined);
      if (edit.assigned_to !== (active.assigned_to ?? '')) {
        await campusApi.updateTicketAssignee(active.id, edit.assigned_to);
      }
      if (active.student_id && edit.status !== active.status) {
        await campusApi.createNotification({
          student_id: active.student_id,
          title: `Ticket ${active.ticket_number}: ${edit.status}`,
          message: edit.resolution_notes ? `${active.subject} — ${edit.resolution_notes}` : `${active.subject} is now ${edit.status.toLowerCase()}.`,
          sent_by: user?.display_name,
        }).catch(() => undefined);
      }
      toast.success(`Ticket ${active.ticket_number} updated.`);
      setActive(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const priorityTone = (p: string) => (p === 'Urgent' || p === 'High' ? 'text-destructive border-destructive/30' : 'text-muted-foreground');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Student Support Desk & Help Tickets</h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Helpdesk Queue</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Tickets raised by students and parents from their portals, plus walk-in requests logged at the desk.
          </p>
        </div>
        <Button size="sm" onClick={() => { setNewForm({ student_id: 'none', subject: '', category: 'Academic', priority: 'Medium', description: '' }); setModalOpen(true); }} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" /> Log Ticket
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { st: 'Open', icon: AlertCircle, cls: 'text-amber-600' },
          { st: 'In Progress', icon: Clock, cls: 'text-blue-600' },
          { st: 'Resolved', icon: CheckCircle2, cls: 'text-emerald-600' },
          { st: 'Closed', icon: MessageSquare, cls: 'text-muted-foreground' },
        ].map(({ st, icon: Icon, cls }) => (
          <Card key={st} className="p-4 shadow-sm border-border cursor-pointer hover:bg-muted/30" onClick={() => setStatusFilter(st)}>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-muted-foreground"><Icon className={`w-4 h-4 ${cls}`} /> {st}</div>
            <div className="text-2xl font-bold font-serif mt-1">{count(st)}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Label className="text-xs text-muted-foreground">Show:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="active">Open & In Progress</SelectItem>
            <SelectItem value="all">All tickets</SelectItem>
            {STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
              <tr>
                <th className="py-3 px-4">Ticket #</th><th className="py-3 px-4">Raised by</th><th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Opened</th><th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground italic">{loading ? 'Loading…' : 'No tickets.'}</td></tr>}
              {shown.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono font-bold">{t.ticket_number}</td>
                  <td className="py-3 px-4 font-semibold">{t.student_name || '—'}</td>
                  <td className="py-3 px-4">{t.subject}</td>
                  <td className="py-3 px-4 text-muted-foreground">{t.category}</td>
                  <td className="py-3 px-4"><Badge variant="outline" className={priorityTone(t.priority)}>{t.priority}</Badge></td>
                  <td className="py-3 px-4"><Badge variant="outline">{t.status}</Badge></td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => openTicket(t)} className="h-7 text-xs">Open & Respond</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New ticket */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Log Support Ticket</DialogTitle>
            <DialogDescription className="text-xs">For walk-in or phone requests. Students can also raise tickets from their portal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Student</Label>
              <Select value={newForm.student_id} onValueChange={(v) => setNewForm({ ...newForm, student_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="none">Not a registered student</SelectItem>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.student_number} – {s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={newForm.category} onValueChange={(v) => setNewForm({ ...newForm, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newForm.priority} onValueChange={(v) => setNewForm({ ...newForm, priority: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">{['Low', 'Medium', 'High', 'Urgent'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input required value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Subject" className="h-8 text-xs" />
            <Textarea required rows={3} value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Details" className="text-xs" />
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>Log Ticket</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail */}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">{active?.ticket_number}: {active?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              {active?.student_name} • {active?.category} • {active?.priority} priority • opened {active && new Date(active.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-muted/40 border border-border whitespace-pre-wrap">{active?.description}</div>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">{STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assigned to</Label>
                <Input value={edit.assigned_to} onChange={(e) => setEdit({ ...edit, assigned_to: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Response / resolution (visible to the student)</Label>
              <Textarea rows={3} value={edit.resolution_notes} onChange={(e) => setEdit({ ...edit, resolution_notes: e.target.value })} className="text-xs" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setActive(null)}>Close</Button>
              <Button type="submit" size="sm" disabled={busy}>Save Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
