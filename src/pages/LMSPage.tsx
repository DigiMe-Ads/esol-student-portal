import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import { openPortalFile, uploadPortalFile, MAX_UPLOAD_BYTES } from '@/services/fileStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
import type { LMSCourse, LMSMaterial, LMSSubmission, LMSQuiz, Module, QuizAttempt, QuizQuestion } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Upload, PlayCircle, HelpCircle, Download, Plus, FileText, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { UploadMaterialDialog } from '@/components/lms/UploadMaterialDialog';

type NewQuestion = QuizQuestion & { correctAnswer: number };
const blankQuestion = (id: number): NewQuestion => ({ id, question: '', options: ['', '', '', ''], correctAnswer: 0 });

export const LMSPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentRole, portalStudentId } = useAuthRole();
  const can = usePermission();
  const canManage = can('manageLMS');
  const isStudent = currentRole === 'student';
  const actingStudent = isStudent && user?.role === 'student'; // a real student (not an admin preview)

  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [submissions, setSubmissions] = useState<Record<string, LMSSubmission[]>>({});
  const [mySubmissions, setMySubmissions] = useState<LMSSubmission[]>([]);
  const [quizzes, setQuizzes] = useState<LMSQuiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ module_id: '', title: '', description: '' });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ title: '', description: '', due_date: '', max_score: 100, rubric: '' });
  const [quizBuilderOpen, setQuizBuilderOpen] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: '', time_limit_mins: 20, passing_score: 60 });
  const [quizQuestions, setQuizQuestions] = useState<NewQuestion[]>([blankQuestion(1)]);

  const [gradingSub, setGradingSub] = useState<LMSSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');

  const [submitFor, setSubmitFor] = useState<string | null>(null); // assignment id
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<LMSQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; total: number; passed: boolean; recorded: boolean } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  const loadCourses = async () => {
    const [cList, mList] = await Promise.all([campusApi.getLMSCourses(), canManage ? campusApi.getModules() : Promise.resolve([])]);
    setCourses(cList);
    setModules(mList);
    setSelectedCourseId((prev) => (cList.some((c) => c.id === prev) ? prev : searchParams.get('course') ?? cList[0]?.id ?? ''));
    if (portalStudentId && isStudent) setMySubmissions(await campusApi.getStudentSubmissions(portalStudentId));
    return cList;
  };

  const loadCourseDetail = async (course: LMSCourse | null) => {
    if (!course) return;
    const [qList, att] = await Promise.all([
      campusApi.getLMSQuizzes(course.id),
      campusApi.getQuizAttempts(undefined, isStudent ? portalStudentId ?? undefined : undefined),
    ]);
    setQuizzes(qList);
    setAttempts(att);
    if (!isStudent) {
      const entries = await Promise.all(
        (course.assignments ?? []).map(async (a) => [a.id, await campusApi.getAssignmentSubmissions(a.id)] as const),
      );
      setSubmissions(Object.fromEntries(entries));
    }
  };

  useEffect(() => {
    setLoading(true);
    loadCourses()
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [currentRole, portalStudentId]);

  useEffect(() => {
    loadCourseDetail(selectedCourse).catch((err) => toast.error(err.message));
  }, [selectedCourseId, courses]);

  // quiz countdown: auto-submits when time runs out
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    if (secondsLeft <= 0) {
      handleSubmitQuiz();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [activeQuiz, secondsLeft, quizResult]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleMaterialUploaded = (material: LMSMaterial) => {
    setCourses((prev) => prev.map((c) => (c.id === material.course_id ? { ...c, materials: [...(c.materials || []), material] } : c)));
  };

  const handleOpenFile = async (url: string, label: string) => {
    try {
      await openPortalFile(url);
    } catch (err: any) {
      toast.error(`Could not open ${label}: ${err.message}`);
    }
  };

  // ---- staff: authoring
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run(async () => {
      const c = await campusApi.createLMSCourse(courseForm);
      await loadCourses();
      setSelectedCourseId(c.id);
    }, 'Course created.')) setCourseOpen(false);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (await run(async () => {
      await campusApi.createAssignment({ ...assignForm, course_id: selectedCourse.id, due_date: new Date(assignForm.due_date).toISOString() });
      await loadCourses();
    }, 'Assignment published to the course.')) setAssignOpen(false);
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (quizQuestions.some((q) => !q.question.trim() || q.options.some((o) => !o.trim()))) {
      toast.error('Every question needs text and four options.');
      return;
    }
    if (await run(async () => {
      await campusApi.createQuiz({ ...quizForm, course_id: selectedCourse.id, questions: quizQuestions });
      await loadCourseDetail(selectedCourse);
    }, 'Quiz published. Answers are stored separately and never sent to students.')) setQuizBuilderOpen(false);
  };

  const handleSaveGrade = async () => {
    if (!gradingSub) return;
    if (await run(async () => {
      await campusApi.gradeSubmission(gradingSub.id, gradeScore, gradeFeedback, user?.display_name ?? 'Lecturer');
      await loadCourseDetail(selectedCourse);
    }, `Score ${gradeScore} saved; the student can see it now.`)) setGradingSub(null);
  };

  // ---- student: coursework
  const openSubmit = (assignmentId: string) => {
    const existing = mySubmissions.find((s) => s.assignment_id === assignmentId);
    setSubmitFor(assignmentId);
    setSubmitText(existing?.submission_text ?? '');
    setSubmitFile(null);
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitFor || !portalStudentId) return;
    if (!submitText.trim() && !submitFile) {
      toast.error('Add some text or attach a file.');
      return;
    }
    const existing = mySubmissions.find((s) => s.assignment_id === submitFor);
    if (await run(async () => {
      const fileUrl = submitFile ? await uploadPortalFile(submitFile, `submissions/${portalStudentId}`) : existing?.file_url;
      await campusApi.submitAssignment({
        ...(existing ? { id: existing.id } : {}),
        assignment_id: submitFor,
        student_id: portalStudentId,
        submission_text: submitText.trim() || undefined,
        file_url: fileUrl,
        submitted_at: new Date().toISOString(),
      });
      setMySubmissions(await campusApi.getStudentSubmissions(portalStudentId));
    }, 'Coursework submitted.')) setSubmitFor(null);
  };

  // ---- quizzes
  const handleStartQuiz = (quiz: LMSQuiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setQuizResult(null);
    setSecondsLeft(quiz.time_limit_mins * 60);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || quizResult || busy) return;
    setBusy(true);
    try {
      const res = await campusApi.submitQuiz(activeQuiz.id, userAnswers);
      setQuizResult(res);
      if (res.passed) toast.success(`Passed with ${res.score}% (${res.correct}/${res.total}).`);
      else toast.error(`Score ${res.score}%: below the pass mark of ${activeQuiz.passing_score}%.`);
      if (res.recorded) setAttempts(await campusApi.getQuizAttempts(undefined, portalStudentId ?? undefined));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const courseQuizAttempts = useMemo(() => {
    const ids = new Set(quizzes.map((q) => q.id));
    return attempts.filter((a) => ids.has(a.quiz_id));
  }, [attempts, quizzes]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Learning Management System (LMS)</h1>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-600 bg-indigo-500/10 text-[10px]">Virtual Learning Environment</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {isStudent
              ? 'Your course materials, coursework submissions, grades and online quizzes.'
              : 'Curriculum content delivery, downloadable handouts, coursework assessments, rubric grading, and timed quizzes.'}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setCourseForm({ module_id: modules[0]?.id ?? '', title: '', description: '' }); setCourseOpen(true); }} className="text-xs h-9 gap-1.5">
              <Plus className="w-4 h-4" /> New Course
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} disabled={courses.length === 0} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
              <Upload className="w-4 h-4" /> Upload Lesson Material
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course list */}
        <div className="space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground px-1">{isStudent ? 'My Modules' : 'LMS Modules'}</div>
          {!loading && courses.length === 0 && <div className="text-xs text-muted-foreground italic px-1">No courses available.</div>}
          {courses.map((c) => (
            <Card
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              className={`p-3.5 cursor-pointer transition-all border ${selectedCourseId === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/40'}`}
            >
              <div className="font-bold text-xs text-foreground line-clamp-1">{c.title}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.module?.code} • {c.module?.credits} Credits</div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                <span>📚 {c.materials?.length || 0} Materials</span>
                <span>📝 {c.assignments?.length || 0} Tasks</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Selected course */}
        <div className="lg:col-span-3 space-y-5">
          {selectedCourse && (
            <>
              <div className="relative rounded-xl overflow-hidden border border-border bg-slate-900 text-white p-6 shadow-sm">
                <div className="relative z-10 space-y-1.5">
                  <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">{selectedCourse.module?.code}</Badge>
                  <h2 className="text-lg md:text-xl font-serif font-bold text-white">{selectedCourse.title}</h2>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{selectedCourse.description}</p>
                </div>
              </div>

              <Tabs defaultValue="materials" className="space-y-4">
                <TabsList className="h-9">
                  <TabsTrigger value="materials" className="text-xs">Lecture Materials ({selectedCourse.materials?.length || 0})</TabsTrigger>
                  <TabsTrigger value="assignments" className="text-xs">Coursework ({selectedCourse.assignments?.length || 0})</TabsTrigger>
                  <TabsTrigger value="quizzes" className="text-xs">Quizzes ({quizzes.length})</TabsTrigger>
                </TabsList>

                {/* Materials */}
                <TabsContent value="materials" className="space-y-3">
                  {(selectedCourse.materials ?? []).length === 0 && <div className="text-xs text-muted-foreground italic">No materials uploaded yet.</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {selectedCourse.materials?.map((mat) => (
                      <Card key={mat.id} className="p-4 border-border shadow-sm flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[9px] uppercase font-mono">{mat.type}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(mat.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-xs text-foreground line-clamp-1">{mat.title}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{mat.description}</p>
                        </div>
                        <div className="pt-3 border-t border-border flex items-center justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleOpenFile(mat.url, mat.title)} className="h-7 text-xs gap-1">
                            {mat.type === 'video' ? <PlayCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            {mat.type === 'video' ? 'Watch' : 'Open / Download'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Assignments */}
                <TabsContent value="assignments" className="space-y-4">
                  {canManage && (
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { setAssignForm({ title: '', description: '', due_date: '', max_score: 100, rubric: '' }); setAssignOpen(true); }}>
                      <Plus className="w-3.5 h-3.5" /> New Assignment
                    </Button>
                  )}
                  {(selectedCourse.assignments ?? []).length === 0 && <div className="text-xs text-muted-foreground italic">No assignments set.</div>}
                  {selectedCourse.assignments?.map((assign) => {
                    const mine = mySubmissions.find((s) => s.assignment_id === assign.id);
                    const subs = submissions[assign.id] ?? [];
                    const late = new Date(assign.due_date) < new Date();
                    return (
                      <Card key={assign.id} className="border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-bold text-foreground">{assign.title}</CardTitle>
                            <Badge variant="outline" className={late ? 'text-destructive border-destructive/30' : 'text-amber-600 border-amber-300'}>
                              Due: {new Date(assign.due_date).toLocaleString()}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-1">{assign.description}</CardDescription>
                          {assign.rubric && (
                            <div className="mt-2 p-2 bg-muted/40 rounded text-[11px] text-muted-foreground"><strong>Grading Rubric:</strong> {assign.rubric}</div>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          {isStudent ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                {mine ? (
                                  <>
                                    <div className="font-semibold">Submitted {new Date(mine.submitted_at).toLocaleString()}</div>
                                    {mine.score != null ? (
                                      <div className="text-emerald-600 font-bold">Grade: {mine.score}/{assign.max_score} {mine.feedback && <span className="font-normal text-muted-foreground">— {mine.feedback}</span>}</div>
                                    ) : (
                                      <div className="text-muted-foreground">Awaiting grading</div>
                                    )}
                                    {mine.file_url && <button className="text-primary underline text-[11px]" onClick={() => handleOpenFile(mine.file_url!, 'your file')}>View attached file</button>}
                                  </>
                                ) : (
                                  <div className="text-muted-foreground">Not submitted yet{late && ' (past due date)'}</div>
                                )}
                              </div>
                              {actingStudent && mine?.score == null && (
                                <Button size="sm" onClick={() => openSubmit(assign.id)} className="h-7 text-xs gap-1">
                                  <Send className="w-3.5 h-3.5" /> {mine ? 'Resubmit' : 'Submit Work'}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold text-xs text-foreground">Student Submissions ({subs.length})</div>
                              <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                                    <tr><th className="py-2.5 px-3">Student</th><th className="py-2.5 px-3">Submission</th><th className="py-2.5 px-3">Score</th><th className="py-2.5 px-3">Feedback</th><th className="py-2.5 px-3 text-right">Action</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {subs.length === 0 && <tr><td colSpan={5} className="py-3 px-3 text-muted-foreground italic">No submissions yet.</td></tr>}
                                    {subs.map((sub) => (
                                      <tr key={sub.id} className="hover:bg-muted/30">
                                        <td className="py-2.5 px-3 font-semibold text-foreground">{sub.student?.full_name}<div className="text-[10px] text-muted-foreground font-mono">{new Date(sub.submitted_at).toLocaleString()}</div></td>
                                        <td className="py-2.5 px-3 text-muted-foreground text-[11px] max-w-xs">
                                          <div className="truncate">{sub.submission_text}</div>
                                          {sub.file_url && <button className="text-primary underline inline-flex items-center gap-1" onClick={() => handleOpenFile(sub.file_url!, 'submission')}><FileText className="w-3 h-3" /> file</button>}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-primary">{sub.score != null ? `${sub.score}/${assign.max_score}` : 'Pending'}</td>
                                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-xs truncate">{sub.feedback || 'Awaiting grading'}</td>
                                        <td className="py-2.5 px-3 text-right">
                                          {canManage && (
                                            <Button size="sm" onClick={() => { setGradingSub(sub); setGradeScore(sub.score ?? 0); setGradeFeedback(sub.feedback ?? ''); }} className="h-6 text-[10px] px-2 bg-primary text-primary-foreground">
                                              {sub.score != null ? 'Regrade' : 'Grade Work'}
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* Quizzes */}
                <TabsContent value="quizzes" className="space-y-4">
                  {canManage && (
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { setQuizForm({ title: '', time_limit_mins: 20, passing_score: 60 }); setQuizQuestions([blankQuestion(1)]); setQuizBuilderOpen(true); }}>
                      <Plus className="w-3.5 h-3.5" /> New Quiz
                    </Button>
                  )}
                  {quizzes.length === 0 && <div className="text-xs text-muted-foreground italic">No quizzes for this course.</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => {
                      const qa = courseQuizAttempts.filter((a) => a.quiz_id === quiz.id);
                      const best = qa.length ? Math.max(...qa.map((a) => a.score)) : null;
                      return (
                        <Card key={quiz.id} className="p-4 border-border shadow-sm flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-purple-500/15 text-purple-600 text-[9px]">Online Assessment</Badge>
                              <span className="text-[10px] text-muted-foreground">{quiz.questions?.length || 0} Questions</span>
                            </div>
                            <h4 className="font-bold text-xs text-foreground">{quiz.title}</h4>
                            <div className="text-[11px] text-muted-foreground">⏱ Time limit: {quiz.time_limit_mins} mins • Passing mark: {quiz.passing_score}%</div>
                            <div className="text-[11px]">
                              {isStudent
                                ? best === null ? 'Not attempted yet' : `Best score: ${best}% (${qa.length} attempt${qa.length === 1 ? '' : 's'})`
                                : `${qa.length} attempt(s) recorded${qa.length ? ` • average ${Math.round(qa.reduce((a, b) => a + b.score, 0) / qa.length)}%` : ''}`}
                            </div>
                          </div>
                          {currentRole !== 'parent' && (
                            <Button size="sm" onClick={() => handleStartQuiz(quiz)} className="mt-3 text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
                              <PlayCircle className="w-4 h-4" /> {actingStudent ? 'Start Quiz' : 'Preview Quiz (not recorded)'}
                            </Button>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Grade submission */}
      <Dialog open={gradingSub !== null} onOpenChange={(o) => !o && setGradingSub(null)}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Grade Student Submission</DialogTitle>
            <DialogDescription className="text-xs">{gradingSub?.student?.full_name}: the score and feedback appear in the student's LMS straight away.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Mark</Label>
              <Input type="number" min={0} max={100} value={gradeScore} onChange={(e) => setGradeScore(Number(e.target.value))} className="h-8 text-xs font-mono font-bold" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Feedback</Label>
              <Textarea rows={3} value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} placeholder="Constructive feedback..." className="text-xs" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setGradingSub(null)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={handleSaveGrade} className="bg-primary text-primary-foreground">Save Mark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Take quiz */}
      <Dialog open={activeQuiz !== null} onOpenChange={(o) => !o && setActiveQuiz(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" /> {activeQuiz?.title}
            </DialogTitle>
            <DialogDescription className="text-xs flex justify-between">
              <span>Select one answer per question. {!actingStudent && 'Preview only: this attempt is not recorded.'}</span>
              {!quizResult && <span className="font-mono font-bold text-purple-600">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} left</span>}
            </DialogDescription>
          </DialogHeader>
          {activeQuiz && (
            <div className="space-y-5 pt-2">
              {activeQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2.5">
                  <div className="font-bold text-foreground text-xs">Question {idx + 1}: {q.question}</div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${userAnswers[q.id] === oIdx ? 'bg-purple-500/10 border-purple-500 font-semibold' : 'border-border/80 hover:bg-muted text-foreground'}`}>
                        <input type="radio" name={`q-${q.id}`} disabled={!!quizResult} checked={userAnswers[q.id] === oIdx} onChange={() => setUserAnswers((p) => ({ ...p, [q.id]: oIdx }))} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {quizResult && (
                <div className="p-4 bg-muted/80 rounded-xl border border-border text-center space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-mono font-semibold">Assessment Result</div>
                  <div className={`text-2xl font-bold font-serif ${quizResult.passed ? 'text-emerald-600' : 'text-destructive'}`}>{quizResult.score}%</div>
                  <div className="text-xs text-muted-foreground">{quizResult.correct} of {quizResult.total} correct • pass mark {activeQuiz.passing_score}% {quizResult.recorded ? '• saved to your record' : ''}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>Close</Button>
            {!quizResult && (
              <Button size="sm" disabled={busy} onClick={handleSubmitQuiz} className="bg-purple-600 hover:bg-purple-700 text-white">Submit Answers</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student submits coursework */}
      <Dialog open={submitFor !== null} onOpenChange={(o) => !o && !busy && setSubmitFor(null)}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Submit Coursework</DialogTitle>
            <DialogDescription className="text-xs">You can resubmit until it is graded.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitWork} className="space-y-3">
            <Textarea rows={5} value={submitText} onChange={(e) => setSubmitText(e.target.value)} placeholder="Answer text or notes for your lecturer" className="text-xs" />
            <Input type="file" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > MAX_UPLOAD_BYTES) { toast.error('File is larger than 50 MB.'); return; }
              setSubmitFile(f);
            }} className="text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setSubmitFor(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New course */}
      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">New LMS Course</DialogTitle>
            <DialogDescription className="text-xs">Students enrolled in the module's programme see it in their LMS.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Module</Label>
              <Select value={courseForm.module_id} onValueChange={(v) => setCourseForm({ ...courseForm, module_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent className="text-xs">{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} – {m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Course title" className="h-8 text-xs" />
            <Textarea rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Description" className="text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCourseOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy || !courseForm.module_id}>Create Course</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New assignment */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">New Assignment</DialogTitle>
            <DialogDescription className="text-xs">{selectedCourse?.title}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-3">
            <Input required value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} placeholder="Title" className="h-8 text-xs" />
            <Textarea rows={3} value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} placeholder="Instructions" className="text-xs" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Due</Label>
                <Input type="datetime-local" required value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max score</Label>
                <Input type="number" min={1} value={assignForm.max_score} onChange={(e) => setAssignForm({ ...assignForm, max_score: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <Input value={assignForm.rubric} onChange={(e) => setAssignForm({ ...assignForm, rubric: e.target.value })} placeholder="Grading rubric (optional)" className="h-8 text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>Publish Assignment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quiz builder */}
      <Dialog open={quizBuilderOpen} onOpenChange={setQuizBuilderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">New Quiz</DialogTitle>
            <DialogDescription className="text-xs">Mark the correct option for each question. Answers are graded on the server.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuiz} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input required value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="Quiz title" className="h-8 text-xs col-span-3 sm:col-span-1" />
              <div className="space-y-1"><Label className="text-[10px]">Time limit (min)</Label><Input type="number" min={1} value={quizForm.time_limit_mins} onChange={(e) => setQuizForm({ ...quizForm, time_limit_mins: Number(e.target.value) })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Pass mark %</Label><Input type="number" min={0} max={100} value={quizForm.passing_score} onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })} className="h-8 text-xs" /></div>
            </div>
            {quizQuestions.map((q, qi) => (
              <div key={q.id} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex gap-2">
                  <Input value={q.question} onChange={(e) => setQuizQuestions((all) => all.map((x) => (x.id === q.id ? { ...x, question: e.target.value } : x)))} placeholder={`Question ${qi + 1}`} className="h-8 text-xs" />
                  {quizQuestions.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuizQuestions((all) => all.filter((x) => x.id !== q.id))} className="h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === oi} onChange={() => setQuizQuestions((all) => all.map((x) => (x.id === q.id ? { ...x, correctAnswer: oi } : x)))} title="Correct answer" />
                    <Input value={opt} onChange={(e) => setQuizQuestions((all) => all.map((x) => (x.id === q.id ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x)))} placeholder={`Option ${oi + 1}`} className="h-7 text-xs" />
                  </label>
                ))}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setQuizQuestions((all) => [...all, blankQuestion(Math.max(...all.map((x) => x.id)) + 1)])}>
              <Plus className="w-3.5 h-3.5" /> Add Question
            </Button>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuizBuilderOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>Publish Quiz</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UploadMaterialDialog open={uploadOpen} onOpenChange={setUploadOpen} courses={courses} defaultCourseId={selectedCourse?.id} onUploaded={handleMaterialUploaded} />
    </div>
  );
};
