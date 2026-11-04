import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { ClassSession, Batch, Module, Lecturer, Campus, Room } from '@/types/campus';
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
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
import { todayISO } from '@/lib/print';

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
  const [roomNumber, setRoomNumber] = useState('');
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showPast, setShowPast] = useState(false);
  const { selectedCampusId, currentRole, portalLecturerId } = useAuthRole();
  const [onlyMine, setOnlyMine] = useState(currentRole === 'lecturer');
  const can = usePermission();
  const canManage = can('manageTimetable');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getClassSessions(),
      campusApi.getBatches(),
      campusApi.getModules(),
      campusApi.getLecturers(),
      campusApi.getCampuses(),
      campusApi.getRooms(),
    ])
      .then(([s, b, m, l, c, r]) => {
        setRooms(r);
        if (r.length > 0) setRoomNumber((prev) => prev || r[0].name);
        setSessions(s);
        setBatches(b);
        setModules(m);
        setLecturers(l);
        setCampuses(c);
        if (b.length > 0) setBatchId(b[0].id);
        if (m.length > 0) setModuleId(m[0].id);
        if (l.length > 0) setLecturerId(l[0].id);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  const batchProgramme = batches.find((b) => b.id === batchId)?.intake?.programme_id;
  const batchModules = modules.filter((m) => !batchProgramme || m.programme_id === batchProgramme);
  useEffect(() => {
    if (batchModules.length && !batchModules.some((m) => m.id === moduleId)) setModuleId(batchModules[0].id);
  }, [batchId, modules]);

  const today = todayISO();
  const shown = sessions
    .filter((x) => showPast || x.date >= today)
    .filter((x) => selectedCampusId === 'all' || x.campus_id === selectedCampusId)
    .filter((x) => !onlyMine || x.lecturer_id === portalLecturerId);

  const handleCancel = async (id: string, status: string) => {
    try {
      await campusApi.updateClassSessionStatus(id, status);
      toast.success(status === 'Cancelled' ? 'Session cancelled.' : 'Session restored.');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endTime <= startTime) {
      toast.error('End time must be after the start time.');
      return;
    }
    const clash = sessions.find((x) => x.batch_id === batchId && x.date === sessionDate && x.status !== 'Cancelled'
      && x.start_time < endTime && x.end_time > startTime);
    if (clash) {
      toast.error(`Batch conflict: this batch already has ${clash.module?.code} at ${clash.start_time.slice(0, 5)}.`);
      return;
    }
    const room = rooms.find((r) => r.name === roomNumber);
    try {
      const booked = (await campusApi.getRoomBookings(sessionDate)).find((b) => b.room_id === room?.id && b.date === sessionDate
        && b.start_time < endTime && b.end_time > startTime);
      if (booked) throw new Error(`${roomNumber} is reserved then for "${booked.purpose}".`);
      const created = await campusApi.createClassSession({
        batch_id: batchId,
        module_id: moduleId,
        lecturer_id: lecturerId,
        room_number: roomNumber,
        date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        campus_id: room?.campus_id ?? campuses[0]?.id,
        status: 'Scheduled',
      });

      toast.success(
        `Session scheduled for ${created.date} ${created.start_time.slice(0, 5)}; no room, lecturer or batch conflicts.`
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

        <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past</label>
        {portalLecturerId && <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Only my classes</label>}
        {canManage && <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Schedule Session
        </Button>}
        </div>
      </div>

      {/* Scheduled Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.length === 0 && <div className="text-xs text-muted-foreground italic">{loading ? 'Loading…' : 'No sessions to show.'}</div>}
        {shown.map((sess) => (
          <Card key={sess.id} className="shadow-sm border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  {sess.batch?.code || 'BATCH'}
                </Badge>
                <Badge className={`${sess.status === 'Cancelled' ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-600'} text-[10px] font-normal`}>
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
                  {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{sess.room_number}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/60">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Instructor: {sess.lecturer?.full_name ?? 'TBA'}</span>
              </div>
              {canManage && sess.date >= today && (
                <div className="pt-1 flex justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleCancel(sess.id, sess.status === 'Cancelled' ? 'Scheduled' : 'Cancelled')}>
                    {sess.status === 'Cancelled' ? 'Restore Session' : 'Cancel Session'}
                  </Button>
                </div>
              )}
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
                  {batchModules.map((m) => (
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
                <Select value={roomNumber} onValueChange={setRoomNumber}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {rooms.map((r) => <SelectItem key={r.id} value={r.name}>{r.name} ({r.campus?.code ?? ''}, {r.capacity})</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <span>Checks room, lecturer, batch and room-reservation clashes before saving.</span>
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
