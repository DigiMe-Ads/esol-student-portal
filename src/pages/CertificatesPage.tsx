import React, { useState, useEffect, useRef } from 'react';
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
import QRCode from 'qrcode';
import { printElement } from '@/lib/print';
import { usePermission } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Certificate Viewer Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeCert, setActiveCert] = useState<Certificate | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const certRef = useRef<HTMLDivElement>(null);
  const can = usePermission();
  const canIssue = can('issueCertificates');
  const [issueOpen, setIssueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issueForm, setIssueForm] = useState({ student_id: '', programme_id: '', qualification: '' });
  const verifyUrl = (c: Certificate) => `${window.location.origin}/verify/${c.verification_code}`;

  useEffect(() => {
    if (!activeCert) return;
    QRCode.toDataURL(verifyUrl(activeCert), { width: 140, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(''));
  }, [activeCert]);

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

  const handlePrintCertificate = () => printElement(certRef.current);

  const openIssue = () => {
    const st = students[0];
    setIssueForm({
      student_id: st?.id ?? '',
      programme_id: st?.enrollments?.[0]?.programme_id ?? programmes[0]?.id ?? '',
      qualification: '',
    });
    setIssueOpen(true);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (certificates.some((c) => c.student_id === issueForm.student_id && c.programme_id === issueForm.programme_id && c.status !== 'Revoked')) {
      toast.error('This student already holds a certificate for that programme.');
      return;
    }
    setBusy(true);
    try {
      const cert = await campusApi.generateCertificate(issueForm.student_id, issueForm.programme_id, issueForm.qualification);
      toast.success(`Certificate ${cert.certificate_number} issued.`);
      setIssueOpen(false);
      loadData();
      handleOpenCertificate(cert);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
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

        {canIssue && <Button
          size="sm"
          onClick={openIssue}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Award className="w-4 h-4" />
          Issue New Certificate
        </Button>}
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
            <div ref={certRef} className="border-8 border-amber-600/30 p-8 rounded-xl bg-amber-50/50 dark:bg-slate-950 text-foreground text-center space-y-4 my-2 relative overflow-hidden shadow-inner">
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
                {activeCert.qualification && activeCert.qualification !== activeCert.programme?.name && <div className="text-xs font-normal text-muted-foreground mt-1">{activeCert.qualification}</div>}
              </div>

              <div className="pt-6 border-t border-border flex items-end justify-between text-left text-xs">
                <div>
                  <div className="font-bold text-foreground border-t border-foreground/40 pt-1 min-w-[140px]">Authorised Signatory</div>
                  <div className="text-[10px] text-muted-foreground">Dean of Academic Affairs</div>
                </div>

                {/* QR Code Verification */}
                <div className="flex flex-col items-center">
                  <img
                    src={qrUrl}
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

      {/* ISSUE CERTIFICATE */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Issue Certificate</DialogTitle>
            <DialogDescription className="text-xs">Creates the certificate number and a public verification code (the QR on the parchment).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssue} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Student</Label>
              <Select value={issueForm.student_id} onValueChange={(v) => {
                const st = students.find((x) => x.id === v);
                setIssueForm({ ...issueForm, student_id: v, programme_id: st?.enrollments?.[0]?.programme_id ?? issueForm.programme_id });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent className="text-xs">{students.map((st) => <SelectItem key={st.id} value={st.id}>{st.student_number} – {st.full_name} ({st.status})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Programme</Label>
              <Select value={issueForm.programme_id} onValueChange={(v) => setIssueForm({ ...issueForm, programme_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select programme" /></SelectTrigger>
                <SelectContent className="text-xs">{programmes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qualification / award title</Label>
              <Input required value={issueForm.qualification} onChange={(e) => setIssueForm({ ...issueForm, qualification: e.target.value })} placeholder="e.g. Diploma in Professional English – Merit" className="h-8 text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy || !issueForm.student_id || !issueForm.programme_id}>Issue Certificate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
