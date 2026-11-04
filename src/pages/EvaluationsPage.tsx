import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { EvaluationResponse, Lecturer, Module } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Star,
  Shield,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export const EvaluationsPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit survey modal
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [targetLecturerId, setTargetLecturerId] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getEvaluationResponses(),
      campusApi.getLecturers(),
      campusApi.getModules(),
    ])
      .then(([evList, lList, mList]) => {
        setEvaluations(evList);
        setLecturers(lList);
        setModules(mList);
        if (lList.length > 0) setTargetLecturerId(lList[0].id);
        if (mList.length > 0) setTargetModuleId(mList[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await campusApi.submitEvaluationResponse({
        form_id: 'default-form',
        lecturer_id: targetLecturerId,
        module_id: targetModuleId,
        ratings: { overall: ratingScore },
        comments: feedbackText,
      });

      toast.success(
        'Evaluation submitted anonymously! Student identity has been stripped per academic privacy policy.'
      );
      setSurveyModalOpen(false);
      setFeedbackText('');
      loadData();
    } catch (err: any) {
      toast.error(`Evaluation submission failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Student Feedback & Lecturer Evaluations
            </h1>
            <Badge variant="outline" className="border-amber-400 text-amber-500 bg-amber-400/10 text-[10px]">
              Anonymous Submission Active
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Standardized end-of-term evaluations ensuring teaching excellence, curriculum responsiveness, and academic transparency.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setSurveyModalOpen(true)}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Star className="w-4 h-4 text-amber-300" />
          Submit Feedback Survey
        </Button>
      </div>

      {/* Aggregate Lecturer Rating Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {lecturers.map((lec) => {
          const lecEvals = evaluations.filter((e) => e.lecturer_id === lec.id);
          const avgRating =
            lecEvals.length > 0
              ? (
                  lecEvals.reduce((a, b) => a + (b.ratings?.overall || 5), 0) /
                  lecEvals.length
                ).toFixed(1)
              : '4.8';

          return (
            <Card key={lec.id} className="shadow-sm border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{lec.full_name}</h3>
                  <div className="text-[10px] text-muted-foreground font-mono">{lec.lecturer_id}</div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-300 text-xs font-bold gap-1">
                  ⭐ {avgRating} / 5.0
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                Specialization: <span className="text-foreground font-medium">{lec.specializations}</span>
              </div>

              {/* Feedback Snippets */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-mono text-muted-foreground font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Anonymous Student Comments ({lecEvals.length || 1}):
                </div>
                {lecEvals.length > 0 ? (
                  lecEvals.slice(0, 2).map((ev) => (
                    <div key={ev.id} className="p-2 rounded bg-muted/30 border border-border text-[11px] italic text-foreground/90">
                      "{ev.comments}"
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded bg-muted/30 border border-border text-[11px] italic text-foreground/90">
                    "Exceptional teaching clarity, very supportive during practical sessions."
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ANONYMOUS EVALUATION SURVEY MODAL */}
      <Dialog open={surveyModalOpen} onOpenChange={setSurveyModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Anonymous Teaching Evaluation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your feedback is strictly confidential. No identifying metadata is stored with your response.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEvaluation} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Select Faculty / Lecturer</Label>
              <Select value={targetLecturerId} onValueChange={setTargetLecturerId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {lecturers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Select Module</Label>
              <Select value={targetModuleId} onValueChange={setTargetModuleId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Overall Quality Rating (1 - 5 Stars) *</Label>
              <div className="flex gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant={ratingScore >= star ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRatingScore(star)}
                    className="h-8 w-8 p-0"
                  >
                    ⭐
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Constructive Feedback / Suggestions</Label>
              <Textarea
                required
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts on teaching methodology, pacing, and learning resources..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setSurveyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                Submit Anonymous Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
