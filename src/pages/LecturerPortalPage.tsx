import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { todayISO } from '@/lib/print';
import type { AttendanceRecord, ClassSession, EvaluationResponse, LMSCourse, Lecturer, Student } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Upload, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { UploadMaterialDialog } from '@/components/lms/UploadMaterialDialog';
import { StudentAvatar } from '@/components/students/StudentAvatar';

export const LecturerPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portalLecturerId, canSwitchRole, setPreviewLecturerId } = useAuthRole();
  const preview = canSwitchRole && !user?.lecturer_id;

  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evals, setEvals] = useState<EvaluationResponse[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadForSession, setUploadForSession] = useState<ClassSession | null>(null);
  const [registerFor, setRegisterFor] = useState<ClassSession | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([campusApi.getLecturers(), campusApi.getClassSessions(), campusApi.getLMSCourses(), campusApi.getStudents(), campusApi.getEvaluationResponses(), campusApi.getAttendanceRecords()])
      .then(([l, s, c, st, ev, ar]) => {
        setLecturers(l);
        setSessions(s);
        setCourses(c);
        setStudents(st);
        setEvals(ev);
        setRecords(ar);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const me = lecturers.find((l) => l.id === portalLecturerId) ?? null;
  const today = todayISO();
  const mine = sessions.filter((s) => s.lecturer_id === portalLecturerId);
  const upcoming = mine.filter((s) => s.date >= today && s.status !== 'Cancelled');
  const recent = mine.filter((s) => s.date < today).slice(-6).reverse();

  const stats = useMemo(() => {
    const moduleCodes = Array.from(new Set(mine.map((s) => s.module?.code).filter(Boolean)));
    const batchIds = new Set(mine.map((s) => s.batch_id));
    const studentCount = students.filter((st) => st.enrollments?.some((e) => batchIds.has(e.batch_id ?? ""))).length;
    const myEvals = evals.filter((e) => e.lecturer_id === portalLecturerId);
    const avg = myEvals.length ? (myEvals.reduce((a, e) => a + Number(e.ratings?.overall ?? 0), 0) / myEvals.length).toFixed(1) : null;
    return { moduleCodes, batches: batchIds.size, studentCount, evalCount: myEvals.length, avg };
  }, [mine, students, evals, portalLecturerId]);

  const roster = registerFor ? students.filter((st) => st.enrollments?.some((e) => e.batch_id === registerFor.batch_id)) : [];

  const markPresent = async (st: Student) => {
    if (!registerFor) return;
    try {
      await campusApi.recordAttendanceScan({ studentNumberOrCode: st.student_number, sessionId: registerFor.id, scanMethod: 'Manual' });
      toast.success(`${st.full_name} checked in.`);
      setRecords(await campusApi.getAttendanceRecords());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!portalLecturerId) {
    return (
      <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-3">
        <h1 className="text-xl font-serif font-bold">Lecturer Portal</h1>
        {preview ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Super Admin preview: choose a lecturer.</span>
            <Select onValueChange={setPreviewLecturerId}>
              <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Select a lecturer" /></SelectTrigger>
              <SelectContent className="text-xs">{lecturers.map((l) => <SelectItem key={l.id} value={l.id}>{l.lecturer_id} – {l.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">This login is not linked to a lecturer record. Ask a Super Admin to link it.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {preview && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <span className="font-semibold text-amber-700">Preview mode:</span>
          <Select value={portalLecturerId} onValueChange={setPreviewLecturerId}>
            <SelectTrigger className="h-7 w-72 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="text-xs">{lecturers.map((l) => <SelectItem key={l.id} value={l.id}>{l.lecturer_id} – {l.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          {me && <StudentAvatar student={me} className="w-14 h-14 rounded-full text-lg border-2 border-primary/20" />}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">{me?.full_name ?? 'Lecturer'}'s Workstation</h1>
              <Badge className="bg-primary/10 text-primary text-[10px]">{me?.employment_type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lecturer ID: <span className="font-mono text-primary font-bold">{me?.lecturer_id}</span> • {me?.campus?.name ?? ''} • {me?.specializations}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            disabled={upcoming.length === 0}
            onClick={() => navigate(`/attendance?session=${upcoming[0].id}`)}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
          >
            <QrCode className="w-4 h-4" /> Open Class Scanner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Modules Taught</div>
          <div className="text-xl font-bold font-serif text-foreground mt-1">{stats.moduleCodes.length} module{stats.moduleCodes.length === 1 ? '' : 's'}</div>
          <div className="text-[10px] text-emerald-600">{stats.moduleCodes.join(', ') || '—'}</div>
        </Card>
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Students Taught</div>
          <div className="text-xl font-bold font-serif text-foreground mt-1">{stats.studentCount} students</div>
          <div className="text-[10px] text-blue-600">Across {stats.batches} batch{stats.batches === 1 ? '' : 'es'}</div>
        </Card>
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Evaluation Rating</div>
          <div className="text-xl font-bold font-serif text-emerald-600 mt-1">{stats.avg ? `${stats.avg} / 5.0 ⭐` : 'No ratings yet'}</div>
          <div className="text-[10px] text-muted-foreground">From {stats.evalCount} anonymous student survey(s)</div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">My Upcoming Teaching Schedule</h3>
          <Badge variant="outline" className="text-xs">{upcoming.length} Scheduled Sessions</Badge>
        </div>
        {upcoming.length === 0 && <div className="text-xs text-muted-foreground italic">{loading ? 'Loading…' : 'No upcoming sessions.'}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...upcoming, ...recent].map((sess) => {
            const count = records.filter((r) => r.class_session_id === sess.id).length;
            return (
              <Card key={sess.id} className={`p-4 border-border shadow-sm space-y-2.5 ${sess.date < today ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{sess.batch?.code}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">{sess.date < today ? 'Held' : sess.status}</Badge>
                </div>
                <h4 className="font-bold text-xs text-foreground">{sess.module?.name}</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>📅 Date: {sess.date}</div>
                  <div>⏱ Time: {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}</div>
                  <div>📍 Venue: {sess.room_number} • {count} checked in</div>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setRegisterFor(sess)} className="h-7 text-xs gap-1">
                    <UserCheck className="w-3 h-3" /> Attendance Register
                  </Button>
                  <Button size="sm" onClick={() => setUploadForSession(sess)} className="h-7 text-xs bg-primary text-primary-foreground gap-1">
                    <Upload className="w-3 h-3" /> Upload Slides
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={registerFor !== null} onOpenChange={(o) => !o && setRegisterFor(null)}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Register: {registerFor?.module?.code} • {registerFor?.batch?.name}</DialogTitle>
            <DialogDescription className="text-xs">{registerFor?.date} {registerFor?.start_time.slice(0, 5)} • {registerFor?.room_number}</DialogDescription>
          </DialogHeader>
          <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
            {roster.length === 0 && <div className="p-3 text-muted-foreground italic">No students enrolled in this batch.</div>}
            {roster.map((st) => {
              const rec = records.find((r) => r.class_session_id === registerFor?.id && r.student_id === st.id);
              return (
                <div key={st.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{st.full_name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{st.student_number}</div>
                  </div>
                  {rec ? (
                    <Badge variant="outline" className={rec.status === 'Present' ? 'text-emerald-600' : 'text-amber-600'}>
                      {rec.status} {new Date(rec.scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  ) : registerFor && registerFor.date === today ? (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markPresent(st)}>Mark present</Button>
                  ) : (
                    <Badge variant="outline" className="text-destructive">{registerFor && registerFor.date < today ? 'Absent' : 'Not yet'}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <UploadMaterialDialog
        open={uploadForSession !== null}
        onOpenChange={(o) => !o && setUploadForSession(null)}
        courses={courses}
        defaultCourseId={courses.find((c) => c.module_id === uploadForSession?.module_id)?.id}
        heading={uploadForSession ? `Upload Slides – ${uploadForSession.module?.name ?? 'Class'}` : 'Upload Slides'}
      />
    </div>
  );
};
