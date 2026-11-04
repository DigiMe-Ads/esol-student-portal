import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Examination, ExamRegistration, Module } from '@/types/campus';
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
  FileSpreadsheet,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  ShieldCheck,
  Edit,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const gradeFor = (val: number) =>
  val >= 85 ? 'A (Distinction)' : val >= 75 ? 'B+ (Merit)' : val >= 65 ? 'B (Credit)' : val >= 50 ? 'C (Pass)' : 'F (Resit Required)';

export const ExaminationsPage: React.FC = () => {
  const { user } = useAuth();
  const can = usePermission();
  const canManage = can('manageExams');
  const [modules, setModules] = useState<Module[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [examForm, setExamForm] = useState({ title: '', exam_code: '', module_id: '', exam_date: '', start_time: '09:00', end_time: '12:00', venue: '', fee_lkr: 0, min_attendance_pct: 80 });
  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [registrations, setRegistrations] = useState<ExamRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit marks modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeReg, setActiveReg] = useState<ExamRegistration | null>(null);
  const [markInput, setMarkInput] = useState(85);
  const [gradeInput, setGradeInput] = useState('A (Distinction)');

  const loadData = () => {
    setLoading(true);
    if (canManage) campusApi.getModules().then(setModules).catch(() => setModules([]));
    campusApi
      .getExaminations()
      .then(async (eList) => {
        setExams(eList);
        if (eList.length > 0) {
          const targetId = selectedExamId || eList[0].id;
          setSelectedExamId(targetId);
          const rList = await campusApi.getExamRegistrations(targetId);
          setRegistrations(rList);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    const rList = await campusApi.getExamRegistrations(examId);
    setRegistrations(rList);
  };

  const handleOpenEditMarks = (reg: ExamRegistration) => {
    setActiveReg(reg);
    setMarkInput(reg.marks ?? 0);
    setGradeInput(reg.grade || gradeFor(reg.marks ?? 0));
    setEditModalOpen(true);
  };

  const handleCalculateGrade = (val: number) => {
    setMarkInput(val);
    setGradeInput(gradeFor(val));
  };

  const handleSaveMarks = async (status: 'Draft' | 'Approved' | 'Published') => {
    if (!activeReg) return;
    if (markInput < 0 || markInput > 100) {
      toast.error('Marks must be between 0 and 100.');
      return;
    }
    try {
      await campusApi.updateExamResult(activeReg.id, markInput, gradeInput, status, user?.display_name ?? 'Examination Office');
      if (status === 'Published') {
        await campusApi.createNotification({
          student_id: activeReg.student_id,
          title: 'Exam result published',
          message: `Your result for ${activeExam?.title ?? 'an exam'} is now available: ${markInput}% (${gradeInput}).`,
          sent_by: user?.display_name,
        }).catch(() => undefined);
      }
      toast.success(`Marks saved (${markInput}%, ${gradeInput}) as ${status}${status === 'Published' ? '; the student can now see it' : ''}.`);
      setEditModalOpen(false);
      setRegistrations(await campusApi.getExamRegistrations(selectedExamId));
    } catch (err: any) {
      toast.error(`Error saving marks: ${err.message}`);
    }
  };

  const handleRegisterCandidates = async () => {
    if (!activeExam) return;
    setBusy(true);
    try {
      const r = await campusApi.registerExamCandidates(activeExam.id);
      toast.success(`Eligibility checked for ${r.checked} candidate(s); ${r.registered} registered in total.`);
      setRegistrations(await campusApi.getExamRegistrations(activeExam.id));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examForm.end_time <= examForm.start_time) {
      toast.error('End time must be after the start time.');
      return;
    }
    setBusy(true);
    try {
      const ex = await campusApi.createExamination(examForm);
      toast.success(`${ex.title} scheduled for ${ex.exam_date}.`);
      setScheduleOpen(false);
      setSelectedExamId(ex.id);
      setExams(await campusApi.getExaminations());
      setRegistrations([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Examination Governance & Results Approval
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Institutional Assessment Board
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Exam schedules, eligibility rules enforcement (attendance threshold + fee clearance), mark entry, two-tier approval, and grade publishing.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => {
            setExamForm({ title: '', exam_code: '', module_id: modules[0]?.id ?? '', exam_date: '', start_time: '09:00', end_time: '12:00', venue: '', fee_lkr: 0, min_attendance_pct: 80 });
            setScheduleOpen(true);
          }} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Schedule Exam
          </Button>
        )}
      </div>

      {/* Main Grid: Exam Selector (1 col) & Candidates/Marks (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Exams List */}
        <div className="space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground px-1">
            Scheduled Examinations
          </div>
          {exams.map((ex) => (
            <Card
              key={ex.id}
              onClick={() => handleSelectExam(ex.id)}
              className={`p-3.5 cursor-pointer transition-all border ${
                selectedExamId === ex.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary mb-1">
                {ex.exam_code}
              </Badge>
              <div className="font-bold text-xs text-foreground leading-snug">{ex.title}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>{ex.exam_date}</span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{ex.start_time} - {ex.end_time}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Selected Exam Candidates & Marks Table */}
        <div className="lg:col-span-3 space-y-4">
          {activeExam && (
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-foreground">
                        {activeExam.title}
                      </CardTitle>
                      <Badge className="bg-primary/10 text-primary font-mono text-[10px]">
                        {activeExam.exam_code}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Venue: {activeExam.venue} • Required Attendance Threshold: {activeExam.min_attendance_pct}%
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      Exam Fee: LKR {Number(activeExam.fee_lkr).toLocaleString()}
                    </Badge>
                    {canManage && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={handleRegisterCandidates} className="h-7 text-[11px] gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Register / Recheck Candidates
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Eligibility Gate Notice */}
                <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Eligibility Gate:</strong> "Register / Recheck Candidates" enrols every active student of {activeExam.module?.code}'s programme and marks them ineligible if attendance is under {activeExam.min_attendance_pct}% or any fees are outstanding. Ineligible candidates cannot be marked.
                  </div>
                </div>

                {/* Candidates List Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3">Student Number</th>
                        <th className="py-2.5 px-3">Candidate Name</th>
                        <th className="py-2.5 px-3">Eligibility Status</th>
                        <th className="py-2.5 px-3">Marks</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {registrations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground italic">
                            No candidates registered for this exam cycle yet.
                          </td>
                        </tr>
                      ) : (
                        registrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {reg.student?.student_number}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {reg.student?.full_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  reg.eligibility_status === 'Eligible'
                                    ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
                                    : 'text-amber-600 border-amber-300'
                                }
                              >
                                {reg.eligibility_status}
                              </Badge>
                              {reg.eligibility_reason && <div className="text-[10px] text-muted-foreground mt-0.5">{reg.eligibility_reason}</div>}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {reg.marks !== null && reg.marks !== undefined ? `${reg.marks}%` : 'Pending'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-primary">
                              {reg.grade || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                className={
                                  reg.result_status === 'Published'
                                    ? 'bg-emerald-600 text-white text-[9px]'
                                    : 'bg-slate-700 text-white text-[9px]'
                                }
                              >
                                {reg.result_status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {canManage && reg.eligibility_status !== 'Ineligible' && <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditMarks(reg)}
                                className="h-6 text-[10px] px-2 gap-1 border-primary/30 text-primary"
                              >
                                <Edit className="w-3 h-3" />
                                {reg.marks != null ? 'Edit Mark' : 'Enter Mark'}
                              </Button>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* EDIT MARKS MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">
              Mark Entry & Grade Determination
            </DialogTitle>
            <DialogDescription className="text-xs">
              Candidate: <span className="font-semibold text-foreground">{activeReg?.student?.full_name}</span> ({activeReg?.student?.student_number})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Examination Score (0 - 100) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={markInput}
                onChange={(e) => handleCalculateGrade(Number(e.target.value))}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Calculated Letter Grade</Label>
              <Input
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                className="h-8 text-xs font-semibold text-primary"
              />
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg border border-border text-[11px] text-muted-foreground">
              Grade Scale: 85%+ = Distinction • 75%-84% = Merit • 65%-74% = Credit • 50%-64% = Pass.
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveMarks('Draft')}
              className="text-xs"
            >
              Save Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveMarks('Approved')}
              className="text-xs"
            >
              Approve
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveMarks('Published')}
              className="bg-primary text-primary-foreground text-xs"
            >
              Publish to Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE EXAM */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Schedule Examination</DialogTitle>
            <DialogDescription className="text-xs">Then use "Register / Recheck Candidates" to enrol eligible students.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleExam} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input required value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="Exam title" className="h-8 text-xs col-span-2" />
              <Input required value={examForm.exam_code} onChange={(e) => setExamForm({ ...examForm, exam_code: e.target.value.toUpperCase() })} placeholder="Exam code (unique)" className="h-8 text-xs" />
              <Select value={examForm.module_id} onValueChange={(v) => setExamForm({ ...examForm, module_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent className="text-xs">{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} – {m.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="space-y-1"><Label className="text-[10px]">Date</Label><Input type="date" required value={examForm.exam_date} onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Venue</Label><Input required value={examForm.venue} onChange={(e) => setExamForm({ ...examForm, venue: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Start</Label><Input type="time" required value={examForm.start_time} onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">End</Label><Input type="time" required value={examForm.end_time} onChange={(e) => setExamForm({ ...examForm, end_time: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Exam fee (LKR)</Label><Input type="number" min={0} value={examForm.fee_lkr} onChange={(e) => setExamForm({ ...examForm, fee_lkr: Number(e.target.value) })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Minimum attendance %</Label><Input type="number" min={0} max={100} value={examForm.min_attendance_pct} onChange={(e) => setExamForm({ ...examForm, min_attendance_pct: Number(e.target.value) })} className="h-8 text-xs" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy || !examForm.module_id}>Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
