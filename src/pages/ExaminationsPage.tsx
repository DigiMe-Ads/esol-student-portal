import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Examination, ExamRegistration, Student } from '@/types/campus';
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
} from 'lucide-react';
import { toast } from 'sonner';

export const ExaminationsPage: React.FC = () => {
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
    setMarkInput(reg.marks || 80);
    setGradeInput(reg.grade || 'A (Distinction)');
    setEditModalOpen(true);
  };

  const handleCalculateGrade = (val: number) => {
    setMarkInput(val);
    if (val >= 85) setGradeInput('A (Distinction)');
    else if (val >= 75) setGradeInput('B+ (Merit)');
    else if (val >= 65) setGradeInput('B (Credit)');
    else if (val >= 50) setGradeInput('C (Pass)');
    else setGradeInput('F (Resit Required)');
  };

  const handleSaveMarks = async (publish: boolean) => {
    if (!activeReg) return;
    try {
      await campusApi.updateExamResult(
        activeReg.id,
        markInput,
        gradeInput,
        publish ? 'Published' : 'Approved',
        'Academic Dean Office'
      );
      toast.success(
        `Marks updated (${markInput}%, ${gradeInput}) and status set to: ${
          publish ? 'Published' : 'Approved'
        }!`
      );
      setEditModalOpen(false);
      const rList = await campusApi.getExamRegistrations(selectedExamId);
      setRegistrations(rList);
    } catch (err: any) {
      toast.error(`Error saving marks: ${err.message}`);
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
            Exam schedules, eligibility rules enforcement (≥80% attendance + fee clearance), mark entry, two-tier approval, and grade publishing.
          </p>
        </div>
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
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                    Exam Fee: LKR {activeExam.fee_lkr.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Eligibility Gate Notice */}
                <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Eligibility Gate Active:</strong> Students with attendance under {activeExam.min_attendance_pct}% or overdue fee installments require Academic Dean authorization.
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditMarks(reg)}
                                className="h-6 text-[10px] px-2 gap-1 border-primary/30 text-primary"
                              >
                                <Edit className="w-3 h-3" />
                                Enter Mark
                              </Button>
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
              onClick={() => handleSaveMarks(false)}
              className="text-xs"
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveMarks(true)}
              className="bg-primary text-primary-foreground text-xs"
            >
              Approve & Publish to Student Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
