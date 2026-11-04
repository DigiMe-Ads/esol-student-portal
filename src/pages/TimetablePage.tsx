import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { ClassSession, Batch, Module, Lecturer, Campus } from '@/types/campus';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

export const TimetablePage: React.FC = () => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  // New Session Modal & Conflict Detector
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [roomNumber, setRoomNumber] = useState('Hall 302 (Multimedia)');
  const [sessionDate, setSessionDate] = useState('2026-10-18');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('13:00:00');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getClassSessions(),
      campusApi.getBatches(),
      campusApi.getModules(),
      campusApi.getLecturers(),
      campusApi.getCampuses(),
    ])
      .then(([s, b, m, l, c]) => {
        setSessions(s);
        setBatches(b);
        setModules(m);
        setLecturers(l);
        setCampuses(c);
        if (b.length > 0) setBatchId(b[0].id);
        if (m.length > 0) setModuleId(m[0].id);
        if (l.length > 0) setLecturerId(l[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await campusApi.createClassSession({
        batch_id: batchId,
        module_id: moduleId,
        lecturer_id: lecturerId,
        room_number: roomNumber,
        date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        campus_id: campuses[0]?.id,
        status: 'Scheduled',
      });

      toast.success(
        `Class session scheduled with 0 room/lecturer conflicts! (${created.date} ${created.start_time})`
      );
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(`Scheduling Conflict Alert: ${err.message}`, {
        duration: 5000,
        icon: '⚠️',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Batches & Timetable Scheduler
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Conflict Detection Active
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Weekly class schedule planner with automated room clash & lecturer overlap protection.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Schedule Session
        </Button>
      </div>

      {/* Scheduled Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((sess) => (
          <Card key={sess.id} className="shadow-sm border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  {sess.batch?.code || 'BATCH'}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] font-normal">
                  {sess.status}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-1 leading-snug">
                {sess.module?.name}
              </CardTitle>
              <CardDescription className="text-xs">{sess.batch?.name}</CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <span>Date: {sess.date}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {sess.start_time} - {sess.end_time}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{sess.room_number}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/60">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Instructor: {sess.lecturer?.full_name}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SCHEDULE MODAL WITH CONFLICT DETECTION */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Schedule Class Session</DialogTitle>
            <DialogDescription className="text-xs">
              Assign batch, lecturer, room, and time. System validates against double-booking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSession} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Academic Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Module</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
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
              <Label className="text-xs">Assigned Lecturer</Label>
              <Select value={lecturerId} onValueChange={setLecturerId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {lecturers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.full_name} ({l.employment_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Classroom / Venue</Label>
                <Input
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Real-time conflict verification will run before confirmation.</span>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                Confirm Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
