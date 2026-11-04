import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = (reportName: string, format: string) => {
    toast.success(`Exporting ${reportName} in ${format} format...`);
  };

  const reports = [
    {
      title: 'Admissions Funnel & Source Conversion Report',
      category: 'Admissions & CRM',
      description: 'Comprehensive lead conversion breakdown by marketing source, counselor performance, and intake.',
      formats: ['PDF', 'CSV', 'Excel'],
    },
    {
      title: 'Tuition Fee Collection & Outstanding Receivables Ledger',
      category: 'Finance (LKR)',
      description: 'Detailed student fee aging report, verified payments, and overdue installment schedules.',
      formats: ['PDF', 'Excel'],
    },
    {
      title: 'Biometric & Barcode Attendance Compliance Audit',
      category: 'Attendance',
      description: 'Session-wise attendance percentages, chronic absentee tracking, and exam eligibility gate validation.',
      formats: ['PDF', 'CSV'],
    },
    {
      title: 'Faculty Teaching Workload & Evaluation Summary',
      category: 'Academic Administration',
      description: 'Allocated teaching hours, room occupancy rates, and student satisfaction metrics per lecturer.',
      formats: ['PDF', 'Excel'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Reports & Institutional Intelligence
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Audit Ready
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Generate and export verified compliance reports, financial ledgers, and academic audit records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep, idx) => (
          <Card key={idx} className="shadow-sm border-border p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <Badge variant="secondary" className="text-[10px] font-mono">
                {rep.category}
              </Badge>
              <h3 className="font-bold text-foreground text-sm leading-snug">{rep.title}</h3>
              <p className="text-xs text-muted-foreground">{rep.description}</p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Available Formats</span>
              <div className="flex gap-1.5">
                {rep.formats.map((fmt) => (
                  <Button
                    key={fmt}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(rep.title, fmt)}
                    className="h-7 text-[10px] px-2 gap-1 border-primary/30 hover:bg-primary/5 text-primary"
                  >
                    <Download className="w-3 h-3" />
                    {fmt}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
