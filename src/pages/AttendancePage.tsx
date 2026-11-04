import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { ClassSession, AttendanceRecord, Student } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QrCode,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Camera,
  Search,
  RefreshCw,
  Calendar,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/lib/permissions';
import { todayISO } from '@/lib/print';

export const AttendancePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const can = usePermission();
  const canRecord = can('recordAttendance');
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanner Input State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMethod, setScanMethod] = useState<'Barcode' | 'QR' | 'Manual'>('Barcode');
  const [scanningActive, setScanningActive] = useState(true);
  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    record: AttendanceRecord;
    session: ClassSession;
  } | null>(null);

  // Load Sessions & Attendance
  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getClassSessions().then((all) => all.filter((x) => x.date === todayISO() || x.id === searchParams.get('session'))),
      campusApi.getAttendanceRecords(),
      campusApi.getStudents(),
    ])
      .then(([sess, records, sList]) => {
        setSessions(sess);
        setAttendanceRecords(records);
        setStudents(sList);
        if (!selectedSessionId) {
          const wanted = searchParams.get('session');
          const todays = sess.filter((x) => x.date === todayISO() && x.status !== 'Cancelled');
          setSelectedSessionId(sess.find((x) => x.id === wanted)?.id ?? todays[0]?.id ?? '');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);
  const shownRecords = activeSession ? attendanceRecords.filter((r) => r.class_session_id === activeSession.id) : attendanceRecords;

  // Handle Barcode Scanner Submission (Enter key trigger from USB hardware scanner or manual input)
  const handleProcessScan = async (codeToScan?: string) => {
    const targetCode = (codeToScan || barcodeInput).trim();
    if (!targetCode) {
      toast.error('Please enter or scan a Student ID / Barcode number.');
      return;
    }

    try {
      const res = await campusApi.recordAttendanceScan({
        studentNumberOrCode: targetCode,
        sessionId: selectedSessionId || undefined,
        scanMethod: codeToScan ? 'Manual' : scanMethod,
        recordedBy: user?.display_name,
      });

      setLastScannedResult(res);
      setBarcodeInput('');
      toast.success(
        `Verified: ${res.student.full_name} (${res.student.student_number}) marked ${res.record.status}!`,
        { icon: '✅' }
      );
      loadData();
    } catch (err: any) {
      setBarcodeInput(''); // ready for the next scan
      toast.error(err.message || 'Scan verification failed.', { icon: '⚠️' });
    }
  };

  // Quick 1-click test simulation with sample students
  const handleSimulateScan = (studentNumber: string) => {
    setBarcodeInput(studentNumber);
    handleProcessScan(studentNumber);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Barcode & QR Attendance System
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]">
              Gate Scanner Active
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Real-time optical check-in terminal: verifies student enrollment, scheduled session window, enforces late arrival rules, and prevents duplicate logging.
          </p>
        </div>

        {/* Active Session Picker */}
        <div className="flex items-center gap-2 shrink-0">
          <Label className="text-xs text-muted-foreground hidden sm:inline">Active Class Session:</Label>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="h-9 w-64 text-xs font-medium">
              <SelectValue placeholder="Select class session" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.batch?.name} • {s.module?.code} ({s.room_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="text-xs p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">No classes are timetabled for today. Schedule one in Batches & Timetables to take attendance.</div>
      )}
      {!canRecord && <div className="text-xs p-3 rounded-lg border border-border bg-muted/40">Your role can view attendance but not record check-ins.</div>}
      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Barcode Terminal (2 Cols) */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Scanner Terminal & Verification Engine
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScanMethod(scanMethod === 'Barcode' ? 'QR' : 'Barcode')}
                  className="text-xs h-7 gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Mode: {scanMethod}
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Connect any physical USB barcode scanner, or type student ID code (e.g. EPC-2026-00001) and hit Enter.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Active Session Details Card */}
            {activeSession && (
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono">Target Batch:</span>
                  <div className="font-semibold text-foreground">{activeSession.batch?.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{activeSession.batch?.code}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono">Module & Venue:</span>
                  <div className="font-semibold text-foreground">{activeSession.module?.name}</div>
                  <div className="text-[10px] text-primary font-medium">📍 {activeSession.room_number}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono">Time Window:</span>
                  <div className="font-semibold text-foreground">
                    {activeSession.start_time} - {activeSession.end_time}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Instructor: {activeSession.lecturer?.full_name}</div>
                </div>
              </div>
            )}

            {/* Simulated Live Scanner Optical Box */}
            <div className="relative rounded-xl border-2 border-dashed border-primary/40 bg-slate-950 p-6 flex flex-col items-center justify-center text-white text-center overflow-hidden min-h-[170px]">
              {/* Laser scanning beam animation */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse shadow-[0_0_10px_#ef4444]" />

              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-2.5">
                {scanMethod === 'QR' ? <QrCode className="w-6 h-6 text-amber-400" /> : <Barcode className="w-6 h-6 text-primary" />}
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Ready to Scan: Hold Barcode / QR ID in front of terminal
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Hardware listener active • Accepts Code 128 / QR codes
              </div>
            </div>

            {/* Barcode Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessScan();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Scan or enter Student ID (e.g., EPC-2026-00001)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="pl-9 h-10 text-xs font-mono"
                />
              </div>
              <Button type="submit" disabled={!canRecord || !activeSession} className="h-10 text-xs px-4 bg-primary text-primary-foreground gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                Verify Check-In
              </Button>
            </form>

            {/* Quick Simulation Badges for Testing */}
            <div className="pt-1">
              <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">
                Manual check-in (students of this session's batch):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {students.filter((s) => s.enrollments?.some((e) => e.batch_id === activeSession?.batch_id)).map((s) => (
                  <Button
                    key={s.id}
                    variant="outline"
                    size="sm"
                    disabled={!canRecord}
                    onClick={() => handleSimulateScan(s.student_number)}
                    className="h-6 text-[10px] px-2 font-mono gap-1 hover:border-primary hover:text-primary"
                  >
                    <Barcode className="w-3 h-3" />
                    {s.student_number} ({s.full_name.split(' ')[0]})
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Last Scanned Student Result */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              Last Verified Check-In
            </CardTitle>
            <CardDescription className="text-xs">
              Immediate gate verification confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {lastScannedResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-foreground text-sm">
                      {lastScannedResult.student.full_name}
                    </div>
                    <div className="font-mono text-xs text-primary font-semibold">
                      {lastScannedResult.student.student_number}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Attendance Status:</span>
                    <Badge
                      className={
                        lastScannedResult.record.status === 'Present'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                      }
                    >
                      {lastScannedResult.record.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Scan Timestamp:</span>
                    <span className="font-mono text-foreground">
                      {new Date(lastScannedResult.record.scan_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="text-foreground">{lastScannedResult.record.scan_method}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-muted-foreground">Remarks:</span>
                    <div className="text-foreground font-medium mt-0.5">
                      {lastScannedResult.record.remarks}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-muted-foreground text-xs italic">
                <UserCheck className="w-8 h-8 text-muted-foreground/50 mb-2" />
                Awaiting first scanner read for this session...
              </div>
            )}

            {/* Attendance Rules Box */}
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Institutional Attendance Rules
              </div>
              <p>• Grace Period: 15 minutes past scheduled start time.</p>
              <p>• Scans exceeding +15 mins are automatically flagged as <strong>Late</strong>.</p>
              <p>• Duplicate scans for the same class session are blocked.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Class Attendance Register & Scan Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time synchronized student check-ins
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {shownRecords.length} Records Logged
            </Badge>
          </div>
        </CardHeader>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class Session / Module</th>
                <th className="py-3 px-4">Scan Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Scan Method</th>
                <th className="py-3 px-4">Audit Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shownRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                    No check-ins logged for this session yet.
                  </td>
                </tr>
              ) : (
                shownRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {rec.student?.student_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {rec.student?.full_name || 'Student'}
                    </td>
                    <td className="py-3 px-4 text-foreground/90">
                      {rec.class_session?.module?.name || 'Academic Class'}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {new Date(rec.scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          rec.status === 'Present'
                            ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                            : 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {rec.scan_method}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {rec.remarks || 'Standard verified scan'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
