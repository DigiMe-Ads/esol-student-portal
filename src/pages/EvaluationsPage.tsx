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
import { useAuthRole } from '@/contexts/AuthRoleContext';

export const EvaluationsPage: React.FC = () => {
  const { currentRole, portalLecturerId } = useAuthRole();
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

        <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
          {evaluations.length} anonymous response{evaluations.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Aggregate Lecturer Rating Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {lecturers.filter((lec) => currentRole !== 'lecturer' || lec.id === portalLecturerId).map((lec) => {
          const lecEvals = evaluations.filter((e) => e.lecturer_id === lec.id);
          const avgRating =
            lecEvals.length > 0
              ? (
                  lecEvals.reduce((a, b) => a + (b.ratings?.overall || 5), 0) /
                  lecEvals.length
                ).toFixed(1)
              : null;

          return (
            <Card key={lec.id} className="shadow-sm border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{lec.full_name}</h3>
                  <div className="text-[10px] text-muted-foreground font-mono">{lec.lecturer_id}</div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-300 text-xs font-bold gap-1">
                  {avgRating ? `⭐ ${avgRating} / 5.0` : 'No ratings yet'}
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                Specialization: <span className="text-foreground font-medium">{lec.specializations}</span>
              </div>

              {/* Feedback Snippets */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-mono text-muted-foreground font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Anonymous Student Comments ({lecEvals.filter((e) => e.comments).length}):
                </div>
                {lecEvals.some((e) => e.comments) ? (
                  lecEvals.filter((e) => e.comments).slice(0, 3).map((ev) => (
                    <div key={ev.id} className="p-2 rounded bg-muted/30 border border-border text-[11px] italic text-foreground/90">
                      "{ev.comments}"
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded bg-muted/30 border border-border text-[11px] italic text-foreground/90">
                    No written comments yet.
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

    </div>
  );
};
