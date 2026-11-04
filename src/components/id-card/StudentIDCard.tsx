import React, { useState, useEffect, useRef } from 'react';
import { printElement } from '@/lib/print';
import QRCode from 'qrcode';
import { BarcodeRenderer } from './BarcodeRenderer';
import type { Student } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, RefreshCw, ShieldCheck, Award } from 'lucide-react';

interface StudentIDCardProps {
  student: Student;
  onPrint?: () => void;
}

export const StudentIDCard: React.FC<StudentIDCardProps> = ({ student, onPrint }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [printing, setPrinting] = useState(false); // renders both sides for printing
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printing) return;
    printElement(cardRef.current);
    setPrinting(false);
  }, [printing]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (student.student_number) {
      QRCode.toDataURL(student.student_number, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [student.student_number]);

  const activeEnrollment = student.enrollments?.[0];
  const programmeName = activeEnrollment?.programme?.name || 'Not enrolled';
  const campusName = student.campus?.name || '—';

  const handlePrint = () => {
    if (onPrint) onPrint();
    else setPrinting(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFlipped(!isFlipped)}
          className="text-xs h-8 gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Flip to {isFlipped ? 'Front Side' : 'Reverse Side'}
        </Button>
        <Button size="sm" onClick={handlePrint} className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground" title="Prints both sides; choose “Save as PDF” in the print dialog to download">
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </Button>
      </div>

      {/* ID Card Outer Container */}
      <div ref={cardRef} className="perspective-1000 w-[380px] max-w-full space-y-3">
        {(printing || !isFlipped) && (
          /* FRONT SIDE */
          <div className="relative w-full aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl shadow-2xl p-4 overflow-hidden border border-slate-700 select-none">
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b border-white/15 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md">
                  <Award className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                    ESOL PREMIER CAMPUS
                  </div>
                  <div className="text-[9px] text-slate-300 tracking-tight">
                    SRI LANKA • INSTITUTION OF HIGHER LEARNING
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-300 bg-amber-400/10 px-1.5 py-0">
                STUDENT
              </Badge>
            </div>

            {/* Main Body */}
            <div className="flex gap-3.5 items-center">
              {/* Photo */}
              <div className="relative shrink-0">
                <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-amber-400/80 shadow-md bg-slate-800">
                  <img
                    src={student.photo_url || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 100'><rect width='80' height='100' fill='#1e293b'/><text x='40' y='60' font-family='sans-serif' font-size='30' font-weight='700' fill='#fbbf24' text-anchor='middle'>${student.full_name.split(/s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</text></svg>`)}`}
                    alt={student.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-slate-900" title="Active Credential" />
              </div>

              {/* Student Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-sm font-bold text-white truncate leading-snug">
                  {student.full_name}
                </div>
                <div className="text-xs font-mono font-bold text-amber-300 tracking-wider mt-0.5">
                  {student.student_number}
                </div>
                <div className="text-[10px] text-slate-300 truncate mt-1">
                  {programmeName}
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">
                  Campus: <span className="text-slate-200">{campusName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400">
                  <span>Issued: {student.enrollment_date || '2026-02-01'}</span>
                  <span>Expires: 2028-02-28</span>
                </div>
              </div>
            </div>

            {/* Bottom Barcode Strip */}
            <div className="mt-2.5 pt-1.5 bg-white/95 rounded-md px-2 py-1 flex items-center justify-center">
              <BarcodeRenderer value={student.student_number} height={28} width={1.4} />
            </div>
          </div>
        )}
        {(printing || isFlipped) && (
          /* REVERSE SIDE */
          <div className="relative w-full aspect-[1.586/1] bg-slate-100 text-slate-900 rounded-xl shadow-2xl p-4 overflow-hidden border border-slate-300 select-none flex flex-col justify-between">
            {/* Top Security Line */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>OFFICIAL VERIFIED IDENTIFICATION CARD</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">ID: {student.id.slice(0, 8)}</span>
            </div>

            {/* Middle Terms & Emergency Info */}
            <div className="flex gap-3 items-center my-auto">
              <div className="flex-1 text-[8.5px] leading-relaxed text-slate-600 space-y-1">
                <p>
                  1. This card is property of <strong>ESOL Premier Campus, Sri Lanka</strong>. If found, please return to any campus administrative desk.
                </p>
                <p>
                  2. Mandatory for campus entry, library borrowing, barcode class attendance, and examination hall admission.
                </p>
                <div className="pt-1 border-t border-slate-200 text-slate-800">
                  <div className="font-semibold text-[9px]">Emergency Contact:</div>
                  <div>{student.emergency_contact || student.parent_phone || '+94 11 257 8900'}</div>
                </div>
              </div>

              {/* QR Code */}
              <div className="shrink-0 flex flex-col items-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-18 h-18 rounded border border-slate-300" />
                ) : (
                  <div className="w-18 h-18 bg-slate-200 animate-pulse rounded" />
                )}
                <span className="text-[7.5px] text-slate-500 font-mono mt-0.5">SCAN TO VERIFY</span>
              </div>
            </div>

            {/* Bottom Signatures */}
            <div className="flex justify-between items-end pt-1 border-t border-slate-200 text-[8px] text-slate-500">
              <div>Colombo • Kandy • Galle</div>
              <div className="text-right">
                <div className="font-serif italic font-semibold text-slate-800 text-[9px]">Dr. J. M. Wickramasinghe</div>
                <div>Director of Academic Affairs</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
