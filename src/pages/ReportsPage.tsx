import React, { useRef, useState } from 'react';
import { campusApi } from '@/services/campusApi';
import { usePermission, type Permission } from '@/lib/permissions';
import { downloadCsv, printElement, todayISO } from '@/lib/print';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Row = Record<string, string | number | null>;

interface ReportDef {
  key: string;
  title: string;
  category: string;
  description: string;
  needs?: Permission;
  build: () => Promise<Row[]>;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

const REPORTS: ReportDef[] = [
  {
    key: 'admissions',
    title: 'Admissions Funnel & Source Conversion',
    category: 'Admissions & CRM',
    description: 'Every inquiry with its source, stage, programme and campus.',
    needs: 'readCRM',
    build: async () =>
      (await campusApi.getInquiries()).map((i) => ({
        Reference: i.ref_number, Name: i.student_name, Phone: i.contact_number, Source: i.source, Stage: i.status,
        Programme: i.programme?.name ?? '', Campus: i.campus?.name ?? '', 'Next follow-up': i.follow_up_date ?? '',
        Created: i.created_at.slice(0, 10),
      })),
  },
  {
    key: 'fees',
    title: 'Fee Collection & Outstanding Receivables',
    category: 'Finance (LKR)',
    description: 'All invoices with paid and outstanding amounts and days overdue.',
    needs: 'readFinance',
    build: async () => {
      const today = todayISO();
      return (await campusApi.getInvoices()).map((i) => ({
        Invoice: i.invoice_number, 'Student number': i.student?.student_number ?? '', Student: i.student?.full_name ?? '',
        Description: i.title, 'Total (LKR)': Number(i.total_amount), 'Paid (LKR)': Number(i.paid_amount),
        'Balance (LKR)': Number(i.balance_due), 'Due date': i.due_date, Status: i.status,
        'Days overdue': Number(i.balance_due) > 0 && i.due_date < today
          ? Math.floor((Date.parse(today) - Date.parse(i.due_date)) / 86400000) : 0,
      }));
    },
  },
  {
    key: 'attendance',
    title: 'Attendance Compliance',
    category: 'Attendance',
    description: 'Per student and module: classes held so far, attended, and attendance %.',
    build: async () => {
      const [students, sessions, records] = await Promise.all([campusApi.getStudents(), campusApi.getClassSessions(), campusApi.getAttendanceRecords()]);
      const today = todayISO();
      const rows: Row[] = [];
      for (const st of students) {
        const batches = new Set((st.enrollments ?? []).map((e) => e.batch_id));
        const held = sessions.filter((s) => batches.has(s.batch_id) && s.date <= today && s.status !== 'Cancelled');
        const byModule = new Map<string, typeof held>();
        held.forEach((s) => byModule.set(s.module_id, [...(byModule.get(s.module_id) ?? []), s]));
        for (const [, list] of byModule) {
          const ids = new Set(list.map((s) => s.id));
          const attended = records.filter((r) => r.student_id === st.id && ids.has(r.class_session_id) && r.status !== 'Absent').length;
          rows.push({
            'Student number': st.student_number, Student: st.full_name, Module: list[0].module?.code ?? '',
            'Classes held': list.length, Attended: attended, 'Attendance %': pct(attended, list.length),
          });
        }
      }
      return rows;
    },
  },
  {
    key: 'faculty',
    title: 'Faculty Workload & Evaluation Summary',
    category: 'Academic Administration',
    description: 'Scheduled sessions, teaching hours and average student rating per lecturer.',
    build: async () => {
      const [lecturers, sessions, evals] = await Promise.all([campusApi.getLecturers(), campusApi.getClassSessions(), campusApi.getEvaluationResponses()]);
      const hours = (a: string, b: string) => (Date.parse(`1970-01-01T${b}`) - Date.parse(`1970-01-01T${a}`)) / 3600000;
      return lecturers.map((l) => {
        const mine = sessions.filter((s) => s.lecturer_id === l.id && s.status !== 'Cancelled');
        const ev = evals.filter((e) => e.lecturer_id === l.id);
        return {
          'Staff ID': l.lecturer_id, Lecturer: l.full_name, Employment: l.employment_type, Sessions: mine.length,
          'Teaching hours': Math.round(mine.reduce((a, s) => a + hours(s.start_time, s.end_time), 0) * 10) / 10,
          'Evaluation responses': ev.length,
          'Average rating (/5)': ev.length ? Math.round((ev.reduce((a, e) => a + Number(e.ratings?.overall ?? 0), 0) / ev.length) * 10) / 10 : null,
        };
      });
    },
  },
  {
    key: 'students',
    title: 'Student Register',
    category: 'Student Information',
    description: 'All students with programme, batch, campus, status and contacts.',
    build: async () =>
      (await campusApi.getStudents()).map((s) => ({
        'Student number': s.student_number, Name: s.full_name, Status: s.status, Programme: s.enrollments?.[0]?.programme?.name ?? '',
        Batch: s.enrollments?.[0]?.batch?.name ?? '', Campus: s.campus?.name ?? '', Phone: s.phone, Email: s.email ?? '',
        Guardian: s.parent_name ?? '', 'Guardian phone': s.parent_phone ?? '', Enrolled: s.enrollment_date,
      })),
  },
  {
    key: 'results',
    title: 'Examination Results',
    category: 'Examinations',
    description: 'Every exam registration with eligibility, marks, grade and publication status.',
    build: async () =>
      (await campusApi.getExamRegistrations()).map((r) => ({
        Exam: r.exam?.title ?? '', 'Exam code': r.exam?.exam_code ?? '', Date: r.exam?.exam_date ?? '',
        'Student number': r.student?.student_number ?? '', Student: r.student?.full_name ?? '',
        Eligibility: r.eligibility_status, Reason: r.eligibility_reason ?? '', Marks: r.marks ?? null, Grade: r.grade ?? '',
        Status: r.result_status,
      })),
  },
];

export const ReportsPage: React.FC = () => {
  const can = usePermission();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; rows: Row[] } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const available = REPORTS.filter((r) => !r.needs || can(r.needs));

  const generate = async (rep: ReportDef, format: 'csv' | 'print') => {
    setBusyKey(`${rep.key}-${format}`);
    try {
      const rows = await rep.build();
      if (rows.length === 0) {
        toast.info(`${rep.title}: no data to export yet.`);
        return;
      }
      if (format === 'csv') {
        downloadCsv(`${rep.key}-report-${todayISO()}.csv`, rows);
        toast.success(`${rep.title}: ${rows.length} rows downloaded.`);
      } else {
        setPreview({ title: rep.title, rows });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const headers = preview ? Object.keys(preview.rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Reports & Institutional Intelligence</h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Live Data</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Built from the live records at the moment you export. CSV opens in Excel; Print lets you save a PDF.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {available.map((rep) => (
          <Card key={rep.key} className="shadow-sm border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">{rep.category}</Badge>
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">{rep.title}</CardTitle>
              <CardDescription className="text-xs">{rep.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex gap-2">
              <Button size="sm" variant="outline" disabled={busyKey !== null} onClick={() => generate(rep, 'csv')} className="h-8 text-xs gap-1.5">
                {busyKey === `${rep.key}-csv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} CSV / Excel
              </Button>
              <Button size="sm" variant="outline" disabled={busyKey !== null} onClick={() => generate(rep, 'print')} className="h-8 text-xs gap-1.5">
                {busyKey === `${rep.key}-print` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Print / PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">{preview?.title}</DialogTitle>
            <DialogDescription className="text-xs">{preview?.rows.length} rows • generated {new Date().toLocaleString()}</DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="bg-background p-2">
            <div className="font-serif font-bold text-sm mb-1">ESOL Premier Campus — {preview?.title}</div>
            <div className="text-[10px] text-muted-foreground mb-2">Generated {new Date().toLocaleString()}</div>
            <table className="w-full text-[10px] border border-border">
              <thead className="bg-muted"><tr>{headers.map((h) => <th key={h} className="p-1.5 text-left border-b border-border">{h}</th>)}</tr></thead>
              <tbody>
                {preview?.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border">{headers.map((h) => <td key={h} className="p-1.5">{r[h] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Close</Button>
            <Button size="sm" onClick={() => printElement(printRef.current)} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Print / Save PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
