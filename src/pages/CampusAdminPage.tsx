import React, { useEffect, useState } from 'react';
import { campusApi } from '@/services/campusApi';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
import { todayISO } from '@/lib/print';
import type { Campus, ClassSession, Room, RoomBooking } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormDialog, clean } from '@/components/common/FormDialog';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const nowTime = () => new Date().toTimeString().slice(0, 5);

export const CampusAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedCampusId } = useAuthRole();
  const can = usePermission();
  const canBook = can('bookRooms');
  const canManage = can('manageAcademics');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveRoom, setReserveRoom] = useState<Room | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    setLoading(true);
    const today = todayISO();
    Promise.all([campusApi.getRooms(), campusApi.getCampuses(), campusApi.getClassSessions(), campusApi.getRoomBookings(today)])
      .then(([r, c, s, b]) => {
        setRooms(r);
        setCampuses(c);
        setSessions(s.filter((x) => x.date >= today && x.status !== 'Cancelled'));
        setBookings(b);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const today = todayISO();
  const now = nowTime();
  const status = (room: Room) => {
    const events = [
      ...sessions.filter((s) => s.room_number === room.name && s.date === today).map((s) => ({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5), label: `${s.batch?.name ?? 'Class'} • ${s.module?.code ?? ''}` })),
      ...bookings.filter((b) => b.room_id === room.id && b.date === today).map((b) => ({ start: b.start_time.slice(0, 5), end: b.end_time.slice(0, 5), label: `Reserved: ${b.purpose}` })),
    ].sort((a, b) => a.start.localeCompare(b.start));
    const current = events.find((e) => e.start <= now && e.end > now);
    const next = events.find((e) => e.start > now);
    return { current, next };
  };

  const shownRooms = rooms.filter((r) => selectedCampusId === 'all' || r.campus_id === selectedCampusId);
  const upcoming = bookings.filter((b) => shownRooms.some((r) => r.id === b.room_id));

  const cancelBooking = async (b: RoomBooking) => {
    try {
      await campusApi.cancelRoomBooking(b.id);
      toast.success('Reservation cancelled.');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Campus Facilities & Resource Management</h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Multi-Campus Operations</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Live room status from today's timetable and reservations. Reservations are checked against classes and other bookings.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Add Room
          </Button>
        )}
      </div>

      {shownRooms.length === 0 && <div className="text-xs text-muted-foreground italic">{loading ? 'Loading…' : 'No rooms for this campus.'}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shownRooms.map((r) => {
          const st = status(r);
          return (
            <Card key={r.id} className="shadow-sm border-border p-4 space-y-3">
              <div className="flex justify-between items-start">
                <Badge className={st.current ? 'bg-amber-600 text-white text-[10px]' : 'bg-emerald-600 text-white text-[10px]'}>
                  {st.current ? 'Occupied' : 'Available'}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">{r.capacity} seats</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm leading-snug">{r.name} <span className="font-normal text-muted-foreground">({r.kind})</span></h3>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{r.campus?.name ?? '—'}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground/90">
                {st.current ? `Now: ${st.current.label} (until ${st.current.end})` : st.next ? `Next today: ${st.next.label} at ${st.next.start}` : 'Free for the rest of today'}
              </div>
              {canBook && (
                <Button variant="outline" size="sm" onClick={() => setReserveRoom(r)} className="w-full text-xs h-7">Reserve Facility</Button>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-bold text-sm">Upcoming reservations</div>
        <table className="w-full text-xs text-left">
          <tbody className="divide-y divide-border">
            {upcoming.length === 0 && <tr><td className="p-4 text-muted-foreground italic">No reservations.</td></tr>}
            {upcoming.map((b) => (
              <tr key={b.id}>
                <td className="p-3 font-mono">{b.date}</td>
                <td className="p-3">{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</td>
                <td className="p-3 font-semibold">{b.room?.name}</td>
                <td className="p-3">{b.purpose}</td>
                <td className="p-3 text-muted-foreground">{b.booked_by}</td>
                <td className="p-3 text-right">
                  {canBook && <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive gap-1" onClick={() => cancelBooking(b)}><Trash2 className="w-3.5 h-3.5" /> Cancel</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <FormDialog
        open={reserveRoom !== null}
        onOpenChange={(o) => !o && setReserveRoom(null)}
        title={`Reserve ${reserveRoom?.name ?? ''}`}
        description={`${reserveRoom?.campus?.name ?? ''} • ${reserveRoom?.capacity ?? ''} seats`}
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'purpose', label: 'Purpose', required: true, placeholder: 'e.g. Revision workshop' },
          { name: 'start_time', label: 'From', type: 'time', required: true },
          { name: 'end_time', label: 'To', type: 'time', required: true },
        ]}
        initial={{ date: today, purpose: '', start_time: '14:00', end_time: '16:00' }}
        submitLabel="Reserve"
        successMessage="Room reserved."
        onSubmit={async (v) => {
          if (!reserveRoom) return;
          if (String(v.date) < today) throw new Error('Choose today or a future date.');
          await campusApi.bookRoom({ room: reserveRoom, date: String(v.date), start_time: String(v.start_time), end_time: String(v.end_time), purpose: String(v.purpose), booked_by: user?.display_name ?? '' });
          load();
        }}
      />

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Room"
        fields={[
          { name: 'name', label: 'Room name', required: true, placeholder: 'e.g. Hall 305' },
          { name: 'kind', label: 'Type', placeholder: 'Lecture Hall' },
          { name: 'campus_id', label: 'Campus', type: 'select', required: true, options: campuses.map((c) => ({ value: c.id, label: c.name })) },
          { name: 'capacity', label: 'Capacity', type: 'number', min: 1 },
        ]}
        initial={{ name: '', kind: 'Lecture Hall', campus_id: campuses[0]?.id ?? '', capacity: 30 }}
        submitLabel="Add Room"
        successMessage="Room added."
        onSubmit={async (v) => { await campusApi.createRoom(clean(v)); load(); }}
      />
    </div>
  );
};
