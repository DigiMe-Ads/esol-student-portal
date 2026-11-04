import React, { useEffect, useState } from 'react';
import { Loader2, Lock, Star } from 'lucide-react';
import { toast } from 'sonner';
import { campusApi } from '@/services/campusApi';
import { uploadPortalFile, MAX_UPLOAD_BYTES } from '@/services/fileStorage';
import { formatLKR } from '@/lib/print';
import type { Invoice, Lecturer, Module, Student } from '@/types/campus';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Base {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

// ---------------------------------------------------------------- support ticket
export const TicketDialog: React.FC<Base & { student: Student | null; reporterName?: string }> = ({ open, onOpenChange, onDone, student, reporterName }) => {
  const [form, setForm] = useState({ category: 'Academic', priority: 'Medium', subject: '', description: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ category: 'Academic', priority: 'Medium', subject: '', description: '' });
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    try {
      const t = await campusApi.createSupportTicket({
        ...form,
        priority: form.priority as any,
        student_id: student.id,
        student_name: reporterName ? `${student.full_name} (reported by ${reporterName})` : student.full_name,
        status: 'Open',
      });
      toast.success(`Ticket ${t.ticket_number} sent to the campus helpdesk.`);
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold">Submit a Support Ticket</DialogTitle>
          <DialogDescription className="text-xs">The helpdesk replies on the ticket; you'll see the status here.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  {['Academic', 'Finance', 'Technical', 'Attendance', 'Examinations', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  {['Low', 'Medium', 'High', 'Urgent'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Details</Label>
            <Textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !student}>Submit Ticket</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------- payment slip
export const PaymentSlipDialog: React.FC<Base & { invoice: Invoice | null }> = ({ open, onOpenChange, onDone, invoice }) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setAmount(Number(invoice.balance_due));
      setMethod('Bank Transfer');
      setReference('');
      setFile(null);
    }
  }, [open, invoice]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (amount <= 0 || amount > Number(invoice.balance_due)) {
      toast.error(`Amount must be between 1 and ${formatLKR(invoice.balance_due)}.`);
      return;
    }
    setSaving(true);
    try {
      const proof = file ? await uploadPortalFile(file, `payments/${invoice.student_id}`) : undefined;
      await campusApi.submitPaymentSlip({ invoiceId: invoice.id, studentId: invoice.student_id, amount, method, reference, proofUrl: proof });
      toast.success('Payment slip submitted. Finance will verify it and update your balance.');
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold">Submit Payment Slip</DialogTitle>
          <DialogDescription className="text-xs">
            {invoice?.invoice_number} • {invoice?.title} • balance {formatLKR(invoice?.balance_due)}. Pay at the bank or online, then upload the slip here.
            There is no card gateway; finance confirms each slip.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount paid (LKR)</Label>
              <Input type="number" min={1} required value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  {['Bank Transfer', 'Bank Deposit', 'Online', 'Cheque'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bank / transaction reference</Label>
            <Input required value={reference} onChange={(e) => setReference(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slip (photo or PDF, optional)</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_UPLOAD_BYTES) {
                  toast.error('File is larger than 50 MB.');
                  return;
                }
                setFile(f);
              }}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit Slip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------- anonymous lecturer evaluation
export interface EvaluationTarget {
  lecturer: Lecturer;
  module: Module;
}

export const EvaluationDialog: React.FC<Base & { targets: EvaluationTarget[] }> = ({ open, onOpenChange, onDone, targets }) => {
  const [key, setKey] = useState('');
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(targets[0] ? `${targets[0].lecturer.id}|${targets[0].module.id}` : '');
      setRating(5);
      setComments('');
    }
  }, [open, targets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [lecturerId, moduleId] = key.split('|');
    setSaving(true);
    try {
      await campusApi.submitEvaluation(lecturerId, moduleId, rating, comments);
      toast.success('Thank you. Your evaluation was submitted anonymously.');
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" /> Anonymous Teaching Evaluation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Your name is not stored with the response. You can evaluate each lecturer once per module.
          </DialogDescription>
        </DialogHeader>
        {targets.length === 0 ? (
          <div className="py-4 text-muted-foreground">You have evaluated every lecturer on your timetable. Thank you!</div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs">Lecturer & module</Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  {targets.map((t) => (
                    <SelectItem key={`${t.lecturer.id}|${t.module.id}`} value={`${t.lecturer.id}|${t.module.id}`}>
                      {t.lecturer.full_name} – {t.module.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Overall rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button key={star} type="button" variant="ghost" size="sm" onClick={() => setRating(star)} className="h-8 w-8 p-0" aria-label={`${star} stars`}>
                    <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comments (optional)</Label>
              <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !key}>Submit Evaluation</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
