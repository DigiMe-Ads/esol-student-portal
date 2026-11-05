import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Lecturer, Campus, Module, ClassSession, Batch } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  UserCheck,
  Mail,
  Phone,
  BookOpen,
  Award,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
import { FormDialog, clean, type FormField } from '@/components/common/FormDialog';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [workloadFor, setWorkloadFor] = useState<Lecturer | null>(null);
  const [editing, setEditing] = useState<Lecturer | null>(null);
  const [deleting, setDeleting] = useState<Lecturer | null>(null);
  const [alloc, setAlloc] = useState({ module_id: '', batch_id: '' });
  const { selectedCampusId } = useAuthRole();
  const can = usePermission();
  const canManage = can('manageAcademics');

  const loadData = () => {
    setLoading(true);
    Promise.all([campusApi.getLecturers(), campusApi.getCampuses(), campusApi.getClassSessions(), campusApi.getLecturerAllocations(), campusApi.getModules(), campusApi.getBatches()])
      .then(([lList, cList, sess, al, mods, bs]) => {
        setLecturers(lList);
        setCampuses(cList);
        setSessions(sess);
        setAllocations(al);
        setModules(mods);
        setBatches(bs);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // only batches of the module's programme (batch -> intake -> programme)
  const batchesFor = (moduleId: string) => {
    const prog = modules.find((m) => m.id === moduleId)?.programme_id;
    return batches.filter((b) => b.intake?.programme_id === prog);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workloadFor) return;
    try {
      await campusApi.allocateLecturer({ lecturer_id: workloadFor.id, ...alloc });
      toast.success('Module allocated.');
      setAllocations(await campusApi.getLecturerAllocations());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveAllocation = async (id: string) => {
    try {
      await campusApi.removeAllocation(id);
      setAllocations(await campusApi.getLecturerAllocations());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = lecturers.filter(
    (l) => (selectedCampusId === 'all' || l.campus_id === selectedCampusId) && (
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.specializations?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Faculty & Lecturer Management
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Academic Faculty
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Faculty directory, certified academic credentials, teaching workload, and module allocations.
          </p>
        </div>

        {canManage && <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Onboard Lecturer
        </Button>}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search faculty by name, qualification or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((lec) => (
          <Card key={lec.id} className="shadow-sm border-border hover:shadow-md transition-shadow flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <StudentAvatar student={lec} className="w-16 h-16 rounded-xl text-lg border-2 border-primary/20" />
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary mb-1">
                    {lec.lecturer_id}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-foreground leading-snug truncate">
                    {lec.full_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {lec.employment_type} • {lec.campus?.name || '—'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 text-xs space-y-3">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
                    Qualifications:
                  </div>
                  <div className="text-foreground text-[11px] leading-tight">
                    {lec.qualifications || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
                    Specializations:
                  </div>
                  <div className="text-primary text-[11px] font-medium leading-tight">
                    {lec.specializations || '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-muted-foreground text-[11px] pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{lec.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{lec.phone || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className={lec.status === 'Active' ? 'text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-[10px]'}>
                  {lec.status} • {sessions.filter((x) => x.lecturer_id === lec.id && x.status !== 'Cancelled').length} sessions
                </Badge>
                <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setWorkloadFor(lec); setAlloc({ module_id: modules[0]?.id ?? '', batch_id: batchesFor(modules[0]?.id ?? '')[0]?.id ?? '' }); }}
                  className="h-7 text-xs"
                >
                  Workload & Batches
                </Button>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(lec)} className="h-7 w-7 p-0" title="Edit lecturer" aria-label={`Edit ${lec.full_name}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {can('deleteRecords') && (
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(lec)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Delete lecturer" aria-label={`Delete ${lec.full_name}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Onboard Lecturer"
        description="Creates the faculty record. To give them a login, add a Lecturer account in Settings & RBAC linked to this record."
        fields={[
          { name: 'full_name', label: 'Full name', required: true, wide: true },
          { name: 'lecturer_id', label: 'Staff ID', required: true, placeholder: 'e.g. LEC-0104' },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone' },
          { name: 'employment_type', label: 'Employment', type: 'select', options: ['Full-time', 'Part-time', 'Visiting'].map((v) => ({ value: v, label: v })) },
          { name: 'campus_id', label: 'Campus', type: 'select', options: campuses.map((c) => ({ value: c.id, label: c.name })) },
          { name: 'qualifications', label: 'Qualifications', wide: true },
          { name: 'specializations', label: 'Specializations', wide: true },
        ]}
        initial={{ full_name: '', lecturer_id: '', email: '', phone: '', employment_type: 'Full-time', campus_id: campuses[0]?.id ?? '', qualifications: '', specializations: '' }}
        submitLabel="Add Lecturer"
        successMessage="Lecturer added to the faculty directory."
        onSubmit={async (v) => { await campusApi.createLecturer({ ...clean(v), status: 'Active' }); loadData(); }}
      />

      <Dialog open={workloadFor !== null} onOpenChange={(o) => !o && setWorkloadFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Workload & Batches: {workloadFor?.full_name}</DialogTitle>
            <DialogDescription className="text-xs">Module allocations and timetabled sessions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="font-semibold mb-1.5">Module allocations</div>
              <div className="border border-border rounded-lg divide-y divide-border">
                {allocations.filter((a) => a.lecturer_id === workloadFor?.id).length === 0 && <div className="p-2.5 text-muted-foreground italic">No modules allocated.</div>}
                {allocations.filter((a) => a.lecturer_id === workloadFor?.id).map((a) => (
                  <div key={a.id} className="p-2.5 flex items-center justify-between">
                    <span>{a.module?.code} – {a.module?.name} • {a.batch?.name}</span>
                    {canManage && <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => handleRemoveAllocation(a.id)}>Remove</Button>}
                  </div>
                ))}
              </div>
              {canManage && (
                <form onSubmit={handleAllocate} className="flex flex-wrap gap-2 mt-2">
                  <Select value={alloc.module_id} onValueChange={(v) => setAlloc({ module_id: v, batch_id: batchesFor(v)[0]?.id ?? '' })}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                    <SelectContent className="text-xs">{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} – {m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={alloc.batch_id} onValueChange={(v) => setAlloc({ ...alloc, batch_id: v })}>
                    <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder={batchesFor(alloc.module_id).length ? 'Batch' : 'No batch for this programme'} /></SelectTrigger>
                    <SelectContent className="text-xs">{batchesFor(alloc.module_id).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="submit" size="sm" className="h-8 text-xs" disabled={!alloc.module_id || !alloc.batch_id}>Allocate</Button>
                </form>
              )}
            </div>
            <div>
              <div className="font-semibold mb-1.5">Timetabled sessions</div>
              <table className="w-full text-xs text-left border border-border rounded-lg">
                <tbody className="divide-y divide-border">
                  {sessions.filter((x) => x.lecturer_id === workloadFor?.id).length === 0 && <tr><td className="p-2.5 text-muted-foreground italic">No sessions scheduled.</td></tr>}
                  {sessions.filter((x) => x.lecturer_id === workloadFor?.id).map((x) => (
                    <tr key={x.id}>
                      <td className="p-2 font-mono">{x.date}</td>
                      <td className="p-2">{x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)}</td>
                      <td className="p-2">{x.module?.code}</td>
                      <td className="p-2">{x.batch?.name}</td>
                      <td className="p-2">{x.room_number}</td>
                      <td className="p-2">{x.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Edit ${editing?.full_name ?? 'lecturer'}`}
        fields={[
          ...([
          { name: 'full_name', label: 'Full name', required: true, wide: true },
          { name: 'lecturer_id', label: 'Staff ID', required: true, placeholder: 'e.g. LEC-0104' },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone' },
          { name: 'employment_type', label: 'Employment', type: 'select', options: ['Full-time', 'Part-time', 'Visiting'].map((v) => ({ value: v, label: v })) },
          { name: 'campus_id', label: 'Campus', type: 'select', options: campuses.map((c) => ({ value: c.id, label: c.name })) },
          { name: 'qualifications', label: 'Qualifications', wide: true },
          { name: 'specializations', label: 'Specializations', wide: true },
        ] as FormField[]),
          { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'].map((v) => ({ value: v, label: v })) },
        ]}
        initial={{
          full_name: editing?.full_name ?? '', lecturer_id: editing?.lecturer_id ?? '', email: editing?.email ?? '', phone: editing?.phone ?? '',
          employment_type: editing?.employment_type ?? 'Full-time', campus_id: editing?.campus_id ?? '', qualifications: editing?.qualifications ?? '',
          specializations: editing?.specializations ?? '', status: editing?.status ?? 'Active',
        }}
        submitLabel="Save Changes"
        successMessage="Lecturer details saved."
        onSubmit={async (v) => { if (editing) { await campusApi.updateLecturer(editing.id, clean(v) as Partial<Lecturer>); loadData(); } }}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete lecturer"
        name={deleting?.full_name ?? ''}
        confirmCode={deleting?.lecturer_id ?? ''}
        codeLabel="staff ID"
        loadSummary={() => campusApi.getLecturerDeleteSummary(deleting!.id)}
        summaryLabels={{ allocations: 'module allocation(s)', evaluations: 'student evaluation(s) of this lecturer', logins: 'lecturer portal login(s)' }}
        note={`Timetabled sessions are kept and show the lecturer as "TBA". To keep everything instead, edit the lecturer and set the status to Inactive.`}
        onConfirm={(typed) => campusApi.deleteLecturer(deleting!.id, typed)}
        onDeleted={loadData}
      />
    </div>
  );
};
