import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { LMSCourse, LMSMaterial, LMSAssignment, LMSSubmission, LMSQuiz } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Laptop,
  FileText,
  Video,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Upload,
  PlayCircle,
  HelpCircle,
  ArrowRight,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

export const LMSPage: React.FC = () => {
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<LMSCourse | null>(null);
  const [submissions, setSubmissions] = useState<LMSSubmission[]>([]);
  const [quizzes, setQuizzes] = useState<LMSQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Grading Modal
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<LMSSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState(85);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Interactive Quiz State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<LMSQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizScoreResult, setQuizScoreResult] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    campusApi
      .getLMSCourses()
      .then(async (cList) => {
        setCourses(cList);
        if (cList.length > 0) {
          const first = cList[0];
          setSelectedCourse(first);

          if (first.assignments && first.assignments.length > 0) {
            const subs = await campusApi.getAssignmentSubmissions(first.assignments[0].id);
            setSubmissions(subs);
          }

          const qList = await campusApi.getLMSQuizzes(first.id);
          setQuizzes(qList);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCourse = async (course: LMSCourse) => {
    setSelectedCourse(course);
    if (course.assignments && course.assignments.length > 0) {
      const subs = await campusApi.getAssignmentSubmissions(course.assignments[0].id);
      setSubmissions(subs);
    } else {
      setSubmissions([]);
    }

    const qList = await campusApi.getLMSQuizzes(course.id);
    setQuizzes(qList);
  };

  const handleOpenGrade = (sub: LMSSubmission) => {
    setActiveSubmission(sub);
    setGradeScore(sub.score || 85);
    setGradeFeedback(sub.feedback || 'Good critical thought and structured arguments.');
    setGradingModalOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!activeSubmission) return;
    try {
      await campusApi.gradeSubmission(activeSubmission.id, gradeScore, gradeFeedback, 'Dr. Manjula Senanayake');
      toast.success(`Score ${gradeScore}/100 and feedback published to student portal.`);
      setGradingModalOpen(false);
      if (selectedCourse?.assignments?.[0]) {
        const updated = await campusApi.getAssignmentSubmissions(selectedCourse.assignments[0].id);
        setSubmissions(updated);
      }
    } catch (err: any) {
      toast.error(`Grading failed: ${err.message}`);
    }
  };

  // Quiz Handling
  const handleStartQuiz = (quiz: LMSQuiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setQuizScoreResult(null);
    setQuizModalOpen(true);
  };

  const handleAnswerSelect = (questionId: number, optionIndex: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const scorePct = Math.round((correctCount / activeQuiz.questions.length) * 100);
    setQuizScoreResult(scorePct);

    if (scorePct >= activeQuiz.passing_score) {
      toast.success(`Congratulations! You passed with ${scorePct}% (${correctCount}/${activeQuiz.questions.length})!`);
    } else {
      toast.error(`Score: ${scorePct}%. Below passing mark of ${activeQuiz.passing_score}%. Retake recommended.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Learning Management System (LMS)
            </h1>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-600 bg-indigo-500/10 text-[10px]">
              Virtual Learning Environment
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Curriculum content delivery, lecture videos, downloadable handouts, coursework assessments, rubric grading, and timed quizzes.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('File upload storage modal ready.')}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Upload className="w-4 h-4" />
          Upload Lesson Material
        </Button>
      </div>

      {/* Main Course Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course Navigation List (1 col) */}
        <div className="space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground px-1">
            Enrolled LMS Modules
          </div>
          {courses.map((c) => (
            <Card
              key={c.id}
              onClick={() => handleSelectCourse(c)}
              className={`p-3.5 cursor-pointer transition-all border ${
                selectedCourse?.id === c.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <div className="font-bold text-xs text-foreground line-clamp-1">{c.title}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {c.module?.code} • {c.module?.credits} Credits
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                <span>📚 {c.materials?.length || 0} Materials</span>
                <span>📝 {c.assignments?.length || 0} Tasks</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Selected Course Workstation (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {selectedCourse && (
            <>
              {/* Course Header Banner */}
              <div className="relative rounded-xl overflow-hidden border border-border bg-slate-900 text-white p-6 shadow-sm">
                <div className="relative z-10 space-y-1.5">
                  <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                    {selectedCourse.module?.code}
                  </Badge>
                  <h2 className="text-lg md:text-xl font-serif font-bold text-white">
                    {selectedCourse.title}
                  </h2>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>
              </div>

              {/* Tabs: Materials, Assignments, Quizzes */}
              <Tabs defaultValue="materials" className="space-y-4">
                <TabsList className="h-9">
                  <TabsTrigger value="materials" className="text-xs">
                    Lecture Materials ({selectedCourse.materials?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="text-xs">
                    Coursework & Submissions ({selectedCourse.assignments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="quizzes" className="text-xs">
                    Assessments & Quizzes ({quizzes.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Materials */}
                <TabsContent value="materials" className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {selectedCourse.materials?.map((mat) => (
                      <Card key={mat.id} className="p-4 border-border shadow-sm flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[9px] uppercase font-mono">
                              {mat.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">Week 2</span>
                          </div>
                          <h4 className="font-bold text-xs text-foreground line-clamp-1">{mat.title}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{mat.description}</p>
                        </div>

                        <div className="pt-3 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-emerald-600 font-medium">Verified Syllabus Asset</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(mat.url, '_blank');
                              toast.success(`Accessing material: ${mat.title}`);
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            {mat.type === 'video' ? <PlayCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            {mat.type === 'video' ? 'Watch Stream' : 'Download Document'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 2: Assignments & Grading */}
                <TabsContent value="assignments" className="space-y-4">
                  {selectedCourse.assignments?.map((assign) => (
                    <Card key={assign.id} className="border-border shadow-sm">
                      <CardHeader className="pb-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-foreground">{assign.title}</CardTitle>
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Due: {new Date(assign.due_date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">{assign.description}</CardDescription>
                        {assign.rubric && (
                          <div className="mt-2 p-2 bg-muted/40 rounded text-[11px] text-muted-foreground">
                            <strong>Grading Rubric:</strong> {assign.rubric}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 space-y-3">
                        <div className="font-semibold text-xs text-foreground">
                          Student Submissions Queue ({submissions.length})
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                              <tr>
                                <th className="py-2.5 px-3">Student</th>
                                <th className="py-2.5 px-3">Submission Notes</th>
                                <th className="py-2.5 px-3">Score</th>
                                <th className="py-2.5 px-3">Feedback</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {submissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-muted/30">
                                  <td className="py-2.5 px-3 font-semibold text-foreground">
                                    {sub.student?.full_name || 'Kavinda Perera'}
                                  </td>
                                  <td className="py-2.5 px-3 text-muted-foreground text-[11px] max-w-xs truncate">
                                    {sub.submission_text}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-primary">
                                    {sub.score ? `${sub.score}/100` : 'Pending'}
                                  </td>
                                  <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-xs truncate">
                                    {sub.feedback || 'Awaiting grading'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenGrade(sub)}
                                      className="h-6 text-[10px] px-2 bg-primary text-primary-foreground"
                                    >
                                      Grade Work
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Tab 3: Interactive Online Quizzes */}
                <TabsContent value="quizzes" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => (
                      <Card key={quiz.id} className="p-4 border-border shadow-sm flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-purple-500/15 text-purple-600 text-[9px]">
                              Online Assessment
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {quiz.questions?.length || 3} Questions
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-foreground">{quiz.title}</h4>
                          <div className="text-[11px] text-muted-foreground">
                            ⏱ Time limit: {quiz.time_limit_mins} mins • Passing mark: {quiz.passing_score}%
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleStartQuiz(quiz)}
                          className="mt-3 text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Launch Quiz Simulator
                        </Button>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: GRADING & FEEDBACK */}
      <Dialog open={gradingModalOpen} onOpenChange={setGradingModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Grade Student Submission</DialogTitle>
            <DialogDescription className="text-xs">
              Assign score out of 100 and enter qualitative feedback for student portal visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Grade Mark (0 - 100) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={gradeScore}
                onChange={(e) => setGradeScore(Number(e.target.value))}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lecturer Qualitative Feedback</Label>
              <Textarea
                rows={3}
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Constructive feedback..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setGradingModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveGrade} className="bg-primary text-primary-foreground">
              Submit & Publish Mark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: INTERACTIVE QUIZ TESTER */}
      <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              {activeQuiz?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Test your grammar and formal syntax mastery. Select one answer per question.
            </DialogDescription>
          </DialogHeader>

          {activeQuiz && (
            <div className="space-y-5 pt-2">
              {activeQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2.5">
                  <div className="font-bold text-foreground text-xs">
                    Question {idx + 1}: {q.question}
                  </div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          userAnswers[q.id] === oIdx
                            ? 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                            : 'border-border/80 hover:bg-muted text-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={userAnswers[q.id] === oIdx}
                          onChange={() => handleAnswerSelect(q.id, oIdx)}
                          className="text-purple-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {quizScoreResult !== null && (
                <div className="p-4 bg-muted/80 rounded-xl border border-border text-center space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-mono font-semibold">Assessment Result</div>
                  <div className="text-2xl font-bold font-serif text-purple-600">{quizScoreResult}% Score</div>
                  <div className="text-xs text-muted-foreground">
                    Required to pass: {activeQuiz.passing_score}%
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setQuizModalOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitQuiz}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Grade My Answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
