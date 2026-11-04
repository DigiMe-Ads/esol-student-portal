import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { ClassSession, LMSCourse, LMSSubmission, Student } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserCheck,
  Calendar,
  BookOpen,
  QrCode,
  FileText,
  Clock,
  CheckCircle2,
  Upload,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export const LecturerPortalPage: React.FC = () => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([campusApi.getClassSessions(), campusApi.getLMSCourses()])
      .then(([sess, cList]) => {
        setSessions(sess);
        setCourses(cList);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
            alt=""
            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">
                Dr. Manjula Senanayake's Workstation
              </h1>
              <Badge className="bg-primary/10 text-primary text-[10px]">Senior Faculty</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lecturer ID: <span className="font-mono text-primary font-bold">LEC-COL-001</span> • Department of Professional English
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => toast.success('Attendance scanner initialized for Hall 302')}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
          >
            <QrCode className="w-4 h-4" />
            Open Class Scanner
          </Button>
        </div>
      </div>

      {/* Workload Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Assigned Modules</div>
          <div className="text-xl font-bold font-serif text-foreground mt-1">2 Active Modules</div>
          <div className="text-[10px] text-emerald-600">DPEC-M1 & DPEC-M2</div>
        </Card>

        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Enrolled Students</div>
          <div className="text-xl font-bold font-serif text-foreground mt-1">32 Students</div>
          <div className="text-[10px] text-blue-600">Across 2 Weekend Batches</div>
        </Card>

        <Card className="p-4 shadow-sm border-border">
          <div className="text-[11px] text-muted-foreground uppercase font-mono">Lecturer Evaluation Rating</div>
          <div className="text-xl font-bold font-serif text-emerald-600 mt-1">4.9 / 5.0 ⭐</div>
          <div className="text-[10px] text-muted-foreground">From 28 anonymous student surveys</div>
        </Card>
      </div>

      {/* Classes & Teaching Schedules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">My Weekly Teaching Schedule</h3>
          <Badge variant="outline" className="text-xs">
            {sessions.length} Scheduled Sessions
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((sess) => (
            <Card key={sess.id} className="p-4 border-border shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  {sess.batch?.code}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">
                  {sess.status}
                </Badge>
              </div>
              <h4 className="font-bold text-xs text-foreground">{sess.module?.name}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>📅 Date: {sess.date}</div>
                <div>⏱ Time: {sess.start_time} - {sess.end_time}</div>
                <div>📍 Venue: {sess.room_number}</div>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success(`Viewing register for ${sess.batch?.name}`)}
                  className="h-7 text-xs"
                >
                  View Attendance Register
                </Button>
                <Button
                  size="sm"
                  onClick={() => toast.info('Uploading lesson slides to student LMS')}
                  className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                >
                  <Upload className="w-3 h-3" /> Upload Slides
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
