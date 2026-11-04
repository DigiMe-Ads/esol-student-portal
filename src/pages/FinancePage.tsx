import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Invoice, Payment, Programme } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Receipt,
  FileCheck2,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const FinancePage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Printable Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([campusApi.getInvoices(), campusApi.getPayments()])
      .then(([inv, pay]) => {
        setInvoices(inv);
        setPayments(pay);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Totals in LKR
  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.total_amount), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + Number(i.paid_amount), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balance_due), 0);

  const handleVerifyPayment = async (paymentId: string) => {
    try {
      await campusApi.verifyPayment(paymentId, 'Roshani De Silva (Finance Desk)');
      toast.success('Payment verified! Invoice balance updated in real-time.');
      loadData();
    } catch (err: any) {
      toast.error(`Verification error: ${err.message}`);
    }
  };

  const handleViewReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setReceiptModalOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
    toast.success('Printed official stamped LKR payment receipt.');
  };

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
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase">Total Invoiced (Term)</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-foreground mt-1">
            LKR {totalInvoiced.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4 shadow-sm border-border bg-emerald-500/5 border-emerald-500/20">
          <div className="text-[11px] font-mono text-emerald-700 uppercase">Verified Collections</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-emerald-600 mt-1">
            LKR {totalCollected.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4 shadow-sm border-border bg-amber-500/5 border-amber-500/20">
          <div className="text-[11px] font-mono text-amber-700 uppercase">Outstanding Receivables</div>
          <div className="text-xl md:text-2xl font-bold font-serif text-amber-600 mt-1">
            LKR {totalOutstanding.toLocaleString()}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="invoices" className="text-xs">
            Invoices & Installments ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="verification" className="text-xs">
            Payment Receipts & Verification ({payments.length})
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{inv.student?.full_name || 'Enrolled Student'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{inv.student?.student_number}</div>
                      </td>
                      <td className="py-3 px-4 text-foreground/90 font-medium">{inv.title}</td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        LKR {Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">
                        LKR {Number(inv.paid_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-semibold">
                        LKR {Number(inv.balance_due).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{inv.due_date}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === 'Paid'
                              ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
                              : 'text-amber-600 border-amber-300 bg-amber-50'
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
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{p.receipt_number}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {p.student?.full_name || 'Kavinda Perera'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        LKR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground">{p.payment_method}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.payment_reference}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.payment_date}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            p.status === 'Verified'
                              ? 'bg-emerald-600 text-white text-[9px]'
                              : 'bg-amber-600 text-white text-[9px]'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {p.verified_by || 'Pending Approval'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status !== 'Verified' && (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyPayment(p.id)}
                              className="h-7 text-xs bg-emerald-600 text-white"
                            >
                              Verify Slip
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(p)}
                            className="h-7 text-xs gap-1 border-primary/30 text-primary"
                          >
                            <Receipt className="w-3 h-3" /> View Stamped Receipt
                          </Button>
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

      {/* MODAL: OFFICIAL STAMPED PAYMENT RECEIPT */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold text-center">
              Official Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              ESOL Premier Campus Sri Lanka • Bursary & Financial Administration
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="border border-border p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-foreground space-y-3 mt-2">
              <div className="flex justify-between items-start border-b border-border pb-2.5">
                <div>
                  <div className="font-bold text-sm">ESOL PREMIER CAMPUS</div>
                  <div className="text-[10px] text-muted-foreground">Receipt #{selectedPayment.receipt_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Date: {selectedPayment.payment_date}</div>
                  <Badge className="bg-emerald-600 text-white text-[9px]">OFFICIALLY VERIFIED</Badge>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span className="font-semibold text-foreground">{selectedPayment.student?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium">{selectedPayment.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction Ref:</span>
                  <span className="font-mono">{selectedPayment.payment_reference}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border text-sm">
                  <span className="font-bold">Amount Received:</span>
                  <span className="font-bold font-serif text-emerald-600">
                    LKR {Number(selectedPayment.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Seal Stamp */}
              <div className="pt-3 border-t border-border flex justify-between items-end text-[10px] text-muted-foreground">
                <div className="border-2 border-emerald-600/40 text-emerald-600 font-bold p-1 rounded uppercase tracking-wider text-[8px]">
                  ✓ SEAL VERIFIED
                </div>
                <div className="text-right">
                  <div className="font-semibold text-foreground">{selectedPayment.verified_by || 'Bursary Officer'}</div>
                  <div>Accounts Department</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setReceiptModalOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handlePrintReceipt} className="bg-primary text-primary-foreground gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print Stamped Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
