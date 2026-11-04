import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { campusApi } from '@/services/campusApi';
import { Card } from '@/components/ui/card';

// Public page behind the certificate QR code: confirms a certificate is genuine without signing in.
export const VerifyCertificatePage: React.FC = () => {
  const { code = '' } = useParams();
  const [state, setState] = useState<'loading' | 'found' | 'missing'>('loading');
  const [cert, setCert] = useState<any>(null);

  useEffect(() => {
    campusApi
      .verifyCertificate(code)
      .then((c) => {
        setCert(c);
        setState(c ? 'found' : 'missing');
      })
      .catch(() => setState('missing'));
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4 text-sm">
        <div className="text-center">
          <div className="font-serif font-bold text-lg">ESOL PREMIER CAMPUS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Certificate verification</div>
        </div>
        {state === 'loading' && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {state === 'missing' && (
          <div className="text-center space-y-2 py-4">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <div className="font-bold">No certificate found</div>
            <div className="text-xs text-muted-foreground">The code "{code}" does not match any certificate issued by ESOL Premier Campus.</div>
          </div>
        )}
        {state === 'found' && cert && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              {cert.status === 'Issued' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-destructive" />}
              <span className={`font-bold ${cert.status === 'Issued' ? 'text-emerald-600' : 'text-destructive'}`}>
                {cert.status === 'Issued' ? 'Genuine certificate' : `Certificate ${String(cert.status).toLowerCase()}`}
              </span>
            </div>
            <dl className="text-xs grid grid-cols-3 gap-y-2">
              <dt className="text-muted-foreground">Awarded to</dt><dd className="col-span-2 font-semibold">{cert.student_name} ({cert.student_number})</dd>
              <dt className="text-muted-foreground">Programme</dt><dd className="col-span-2">{cert.programme}</dd>
              <dt className="text-muted-foreground">Qualification</dt><dd className="col-span-2">{cert.qualification}</dd>
              <dt className="text-muted-foreground">Issued</dt><dd className="col-span-2">{cert.issue_date}</dd>
              <dt className="text-muted-foreground">Certificate #</dt><dd className="col-span-2 font-mono">{cert.certificate_number}</dd>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
};
