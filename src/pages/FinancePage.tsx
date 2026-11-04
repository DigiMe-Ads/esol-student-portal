import React, { useState, useEffect, useRef } from 'react';
import { campusApi } from '@/services/campusApi';
import { openPortalFile } from '@/services/fileStorage';
import { usePermission } from '@/lib/permissions';
import { formatLKR, printElement, todayISO } from '@/lib/print';
import type { Invoice, Payment, Student, Programme } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Receipt, Printer, Search, Plus, Wallet, FileText, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PAY_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online', 'Cheque'];

export const FinancePage: React.FC = () => {
  const can = usePermission();
  const canManage = can('manageFinance');
  const canVerify = can('verifyPayments');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receipt
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // New invoice
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invForm, setInvForm] = useState({ student_id: '', programme_id: '', title: '', total_amount: 0, due_date: '' });

  // Record payment
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'Cash', reference: '', notes: '' });

  // Reject slip
  const [rejectPayment, setRejectPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [busy, setBusy] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([campusApi.getInvoices(), campusApi.getPayments(), campusApi.getStudents(), campusApi.getProgrammes()])
      .then(([inv, pay, st, pr]) => {
        setInvoices(inv);
        setPayments(pay);
        setStudents(st);
        setProgrammes(pr);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const q = searchQuery.toLowerCase();
  const matches = (name?: string, num?: string, doc?: string) =>
    !q || [name, num, doc].some((v) => v?.toLowerCase().includes(q));
  const shownInvoices = invoices.filter(
    (i) => matches(i.student?.full_name, i.student?.student_number, i.invoice_number) && (statusFilter === 'all' || i.status === statusFilter),
  );
  const shownPayments = payments.filter(
    (p) => matches(p.student?.full_name, p.student?.student_number, p.receipt_number) && (statusFilter === 'all' || p.status === statusFilter),
  );
  const pendingCount = payments.filter((p) => p.status === 'Pending').length;

  // Totals in LKR
  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.total_amount), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + Number(i.paid_amount), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balance_due), 0);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      loadData();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPayment = (p: Payment) =>
    run(() => campusApi.verifyPayment(p.id), `Payment ${p.receipt_number} verified; invoice balance updated.`);

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPayment) return;
    if (await run(() => campusApi.rejectPayment(rejectPayment.id, rejectReason), `Slip ${rejectPayment.receipt_number} rejected.`)) {
      setRejectPayment(null);
    }
  };

  const openNewInvoice = () => {
    setInvForm({ student_id: students[0]?.id ?? '', programme_id: '', title: '', total_amount: 0, due_date: todayISO() });
    setInvoiceOpen(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invForm.total_amount <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }
    const ok = await run(
      () => campusApi.createInvoice({ ...invForm, programme_id: invForm.programme_id || undefined, total_amount: invForm.total_amount }),
      'Invoice created.',
    );
    if (ok) setInvoiceOpen(false);
  };

  const openRecordPayment = (inv: Invoice) => {
    setPayInvoice(inv);
    setPayForm({ amount: Number(inv.balance_due), method: 'Cash', reference: '', notes: '' });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    const ok = await run(
      () => campusApi.recordPayment({ invoiceId: payInvoice.id, ...payForm }),
      `Payment of ${formatLKR(payForm.amount)} recorded against ${payInvoice.invoice_number}.`,
    );
    if (ok) setPayInvoice(null);
  };

  const handleViewReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setReceiptModalOpen(true);
  };

  const handleOpenSlip = async (p: Payment) => {
    try {
      if (p.proof_url) await openPortalFile(p.proof_url);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusBadge = (status: string) =>
    status === 'Verified' || status === 'Paid'
      ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
      : status === 'Rejected'
        ? 'text-destructive border-destructive/30 bg-destructive/10'
        : 'text-amber-600 border-amber-300 bg-amber-50';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Finance & Invoicing Management
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">
              Currency: Sri Lankan Rupees (LKR)
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Student fee invoicing, installment tracking, bank deposit slip verification queue, and automated receipts.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openNewInvoice} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        )}
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase">Total Invoiced</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-foreground mt-1">{formatLKR(totalInvoiced)}</div>
        </Card>
        <Card className="p-4 shadow-sm border-border bg-emerald-500/5 border-emerald-500/20">
          <div className="text-[11px] font-mono text-emerald-700 uppercase">Verified Collections</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-emerald-600 mt-1">{formatLKR(totalCollected)}</div>
        </Card>
        <Card className="p-4 shadow-sm border-border bg-amber-500/5 border-amber-500/20">
          <div className="text-[11px] font-mono text-amber-700 uppercase">Outstanding Receivables</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-amber-600 mt-1">{formatLKR(totalOutstanding)}</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by student, student number, invoice or receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              {['Pending', 'Partial', 'Paid', 'Overdue', 'Verified', 'Rejected'].map((st) => (
                <SelectItem key={st} value={st}>{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue={pendingCount > 0 && canVerify ? 'verification' : 'invoices'} key={pendingCount > 0 ? 'p' : 'n'} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="invoices" className="text-xs">Invoices & Installments ({shownInvoices.length})</TabsTrigger>
          <TabsTrigger value="verification" className="text-xs">
            Payment Receipts & Verification ({shownPayments.length})
            {pendingCount > 0 && <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-amber-600 text-white">{pendingCount} pending</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices */}
        <TabsContent value="invoices">
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Description / Fee Title</th>
                    <th className="py-3 px-4">Total (LKR)</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance Due</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    {canManage && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shownInvoices.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-muted-foreground italic">{loading ? 'Loading…' : 'No invoices match.'}</td></tr>
                  )}
                  {shownInvoices.map((inv) => {
                    const overdue = Number(inv.balance_due) > 0 && inv.due_date < todayISO();
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{inv.student?.full_name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{inv.student?.student_number}</div>
                        </td>
                        <td className="py-3 px-4 text-foreground/90 font-medium">{inv.title}</td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">{formatLKR(inv.total_amount)}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">{formatLKR(inv.paid_amount)}</td>
                        <td className="py-3 px-4 font-mono text-amber-600 font-semibold">{formatLKR(inv.balance_due)}</td>
                        <td className={`py-3 px-4 ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {inv.due_date}{overdue && ' (overdue)'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={statusBadge(inv.status)}>{inv.status}</Badge>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-right">
                            {Number(inv.balance_due) > 0 && (
                              <Button size="sm" onClick={() => openRecordPayment(inv)} className="h-7 text-xs gap-1 bg-emerald-600 text-white">
                                <Wallet className="w-3 h-3" /> Record Payment
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Payments & Verification Queue */}
        <TabsContent value="verification">
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Amount (LKR)</th>
                    <th className="py-3 px-4">Method & Ref</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Verified By</th>
                    <th className="py-3 px-4 text-right">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shownPayments.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground italic">{loading ? 'Loading…' : 'No payments match.'}</td></tr>
                  )}
                  {shownPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{p.receipt_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{p.student?.full_name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.invoice?.invoice_number}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">{formatLKR(p.amount)}</td>
                      <td className="py-3 px-4">
                        <div className="text-foreground">{p.payment_method}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.payment_reference}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.payment_date}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`${statusBadge(p.status)} text-[9px]`}>{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {p.status === 'Pending' ? 'Awaiting verification' : p.verified_by}
                        {p.status === 'Rejected' && p.notes && <div className="text-destructive">{p.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.proof_url && (
                            <Button variant="outline" size="sm" onClick={() => handleOpenSlip(p)} className="h-7 text-xs gap-1">
                              <FileText className="w-3 h-3" /> Slip
                            </Button>
                          )}
                          {p.status === 'Pending' && canVerify && (
                            <>
                              <Button size="sm" disabled={busy} onClick={() => handleVerifyPayment(p)} className="h-7 text-xs gap-1 bg-emerald-600 text-white">
                                <CheckCircle2 className="w-3 h-3" /> Verify
                              </Button>
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRejectPayment(p); setRejectReason(''); }} className="h-7 text-xs gap-1 text-destructive">
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </>
                          )}
                          {p.status === 'Verified' && (
                            <Button variant="outline" size="sm" onClick={() => handleViewReceipt(p)} className="h-7 text-xs gap-1 border-primary/30 text-primary">
                              <Receipt className="w-3 h-3" /> Receipt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: OFFICIAL PAYMENT RECEIPT */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold text-center">Official Payment Receipt</DialogTitle>
            <DialogDescription className="text-xs text-center">
              ESOL Premier Campus Sri Lanka • Bursary & Financial Administration
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div ref={receiptRef} className="border border-border p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-foreground space-y-3 mt-2">
              <div className="flex justify-between items-start border-b border-border pb-2.5">
                <div>
                  <div className="font-bold text-sm">ESOL PREMIER CAMPUS</div>
                  <div className="text-[10px] text-muted-foreground">Receipt #{selectedPayment.receipt_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Date: {selectedPayment.payment_date}</div>
                  <Badge className="bg-emerald-600 text-white text-[9px]">VERIFIED</Badge>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Student Name:</span><span className="font-semibold">{selectedPayment.student?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Student Number:</span><span className="font-mono">{selectedPayment.student?.student_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice:</span><span className="font-mono">{selectedPayment.invoice?.invoice_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Method:</span><span className="font-medium">{selectedPayment.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transaction Ref:</span><span className="font-mono">{selectedPayment.payment_reference || '—'}</span></div>
                <div className="flex justify-between pt-2 border-t border-border text-sm">
                  <span className="font-bold">Amount Received:</span>
                  <span className="font-bold font-serif text-emerald-600">{formatLKR(selectedPayment.amount)}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-end text-[10px] text-muted-foreground">
                <div className="border-2 border-emerald-600/40 text-emerald-600 font-bold p-1 rounded uppercase tracking-wider text-[8px]">✓ Verified</div>
                <div className="text-right">
                  <div className="font-semibold text-foreground">{selectedPayment.verified_by}</div>
                  <div>{selectedPayment.verified_at && new Date(selectedPayment.verified_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setReceiptModalOpen(false)}>Close</Button>
            <Button size="sm" onClick={() => printElement(receiptRef.current)} className="bg-primary text-primary-foreground gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE INVOICE */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Create Invoice</DialogTitle>
            <DialogDescription className="text-xs">Bill a student for tuition, an installment, exam fees or other charges.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Student</Label>
              <Select value={invForm.student_id} onValueChange={(v) => setInvForm({ ...invForm, student_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent className="text-xs">
                  {students.map((st) => <SelectItem key={st.id} value={st.id}>{st.student_number} – {st.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Programme (optional)</Label>
              <Select value={invForm.programme_id || 'none'} onValueChange={(v) => setInvForm({ ...invForm, programme_id: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="none">None</SelectItem>
                  {programmes.map((pr) => <SelectItem key={pr.id} value={pr.id}>{pr.code} – {pr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input required value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} placeholder="e.g. Term 2 Tuition Installment" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount (LKR)</Label>
                <Input type="number" min={1} required value={invForm.total_amount || ''} onChange={(e) => setInvForm({ ...invForm, total_amount: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due date</Label>
                <Input type="date" required value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy || !invForm.student_id}>Create Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECORD PAYMENT */}
      <Dialog open={payInvoice !== null} onOpenChange={(o) => !o && setPayInvoice(null)}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Record Payment</DialogTitle>
            <DialogDescription className="text-xs">
              {payInvoice?.invoice_number} • {payInvoice?.student?.full_name} • balance {formatLKR(payInvoice?.balance_due)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount (LKR)</Label>
                <Input type="number" min={1} max={Number(payInvoice?.balance_due ?? 0)} required value={payForm.amount || ''} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference</Label>
              <Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Bank / card / cheque reference" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="h-8 text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setPayInvoice(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy} className="bg-emerald-600 text-white">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: REJECT SLIP */}
      <Dialog open={rejectPayment !== null} onOpenChange={(o) => !o && setRejectPayment(null)}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Reject Payment Slip</DialogTitle>
            <DialogDescription className="text-xs">
              {rejectPayment?.receipt_number} • {formatLKR(rejectPayment?.amount)} from {rejectPayment?.student?.full_name}. The student is notified with your reason.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-3">
            <Input required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason, e.g. amount not received in bank account" className="h-8 text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectPayment(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy} variant="destructive">Reject Slip</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
