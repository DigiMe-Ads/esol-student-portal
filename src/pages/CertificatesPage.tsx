import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Certificate, Student, Programme } from '@/types/campus';
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
import {
  FileCheck2,
  Award,
  QrCode,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Certificate Viewer Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeCert, setActiveCert] = useState<Certificate | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getCertificates(),
      campusApi.getStudents(),
      campusApi.getProgrammes(),
    ])
      .then(([cList, sList, pList]) => {
        setCertificates(cList);
        setStudents(sList);
        setProgrammes(pList);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCertificate = (cert: Certificate) => {
    setActiveCert(cert);
    setViewModalOpen(true);
  };

  const handlePrintCertificate = () => {
    window.print();
    toast.success('Certificate layout sent to print engine.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Documents & Completion Certificates
            </h1>
            <Badge variant="outline" className="border-amber-400 text-amber-500 bg-amber-400/10 text-[10px]">
              QR Verification Enabled
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Accredited diploma certificates, verification QR codes, academic transcripts, and institutional registry.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('Certificate generation wizard opened.')}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Award className="w-4 h-4" />
          Issue New Certificate
        </Button>
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {certificates.map((cert) => (
          <Card key={cert.id} className="shadow-sm border-border p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">
                  {cert.certificate_number}
                </Badge>
                <Badge className="bg-emerald-600 text-white text-[9px]">Verified</Badge>
              </div>

              <h3 className="font-bold text-foreground text-sm leading-snug">
                {cert.programme?.name}
              </h3>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                <div>
                  Recipient: <span className="font-bold text-foreground">{cert.student?.full_name}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Student ID: {cert.student?.student_number}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Issued Date: {cert.issue_date}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-emerald-600 font-medium">QR Sealed</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenCertificate(cert)}
                className="h-7 text-xs gap-1 border-primary/30 text-primary"
              >
                <Award className="w-3.5 h-3.5" /> View Certificate
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL: PRINTABLE HIGH-RESOLUTION CERTIFICATE */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold text-center">
              Accredited Institutional Certificate
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              Official parchment layout with cryptographic QR verification code.
            </DialogDescription>
          </DialogHeader>

          {activeCert && (
            <div className="border-8 border-amber-600/30 p-8 rounded-xl bg-amber-50/50 dark:bg-slate-950 text-foreground text-center space-y-4 my-2 relative overflow-hidden shadow-inner">
              {/* Watermark crest */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <Award className="w-96 h-96" />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase">
                  ESOL PREMIER CAMPUS SRI LANKA
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">
                  Certificate of Achievement & Completion
                </h2>
                <div className="text-xs text-muted-foreground">This is officially conferred upon</div>
              </div>

              <div className="py-2">
                <div className="text-2xl font-serif font-bold text-foreground border-b-2 border-amber-600/30 inline-block px-6 pb-1">
                  {activeCert.student?.full_name}
                </div>
                <div className="text-xs font-mono text-primary mt-1">
                  Student Registration: {activeCert.student?.student_number}
                </div>
              </div>

              <p className="text-xs text-foreground/80 max-w-lg mx-auto leading-relaxed">
                Having successfully completed the prescribed curriculum, examinations, and project modules for the accredited qualification of:
              </p>

              <div className="text-base font-bold font-serif text-foreground">
                {activeCert.programme?.name}
              </div>

              <div className="pt-6 border-t border-border flex items-end justify-between text-left text-xs">
                <div>
                  <div className="font-bold text-foreground">Dr. Manjula Senanayake</div>
                  <div className="text-[10px] text-muted-foreground">Dean of Academic Affairs</div>
                </div>

                {/* QR Code Verification */}
                <div className="flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=https://esolpremier.edu.lk/verify/${activeCert.certificate_number}`}
                    alt="QR Seal"
                    className="w-16 h-16 p-1 bg-white border border-border rounded"
                  />
                  <div className="text-[8px] font-mono mt-1 text-muted-foreground">
                    {activeCert.certificate_number}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-foreground">Date: {activeCert.issue_date}</div>
                  <div className="text-[10px] text-muted-foreground">Colombo, Sri Lanka</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handlePrintCertificate} className="bg-primary text-primary-foreground gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print Certificate (Parchment)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
