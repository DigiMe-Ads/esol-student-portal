import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Campus, Department, Programme, Intake, Batch, Module } from '@/types/campus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  Users,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react';
import { usePermission } from '@/lib/permissions';
import { FormDialog, clean } from '@/components/common/FormDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const AcademicsPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dialog, setDialog] = useState<null | 'programme' | 'module' | 'intake' | 'batch' | 'campus'>(null);
  const [modulePreset, setModulePreset] = useState('');
  const [syllabusFor, setSyllabusFor] = useState<Programme | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const can = usePermission();
  const canManage = can('manageAcademics');
  const reload = () => setReloadKey((k) => k + 1);
  const progOptions = programmes.map((p) => ({ value: p.id, label: `${p.code} – ${p.name}` }));

  useEffect(() => {
    campusApi.getDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getCampuses(),
      campusApi.getProgrammes(),
      campusApi.getIntakes(),
      campusApi.getBatches(),
      campusApi.getModules(),
    ])
      .then(([c, p, i, b, m]) => {
        setCampuses(c);
        setProgrammes(p);
        setIntakes(i);
        setBatches(b);
        setModules(m);
      })
      .finally(() => setLoading(false));
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Academic Administration & Programmes
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Curriculum Architecture
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Hierarchy of Campuses, Departments, Accredited Programmes, Intakes, Batches, and Modular Syllabi.
          </p>
        </div>

        {canManage && <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setDialog('programme')}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add Programme
          </Button>
        </div>}
      </div>

      <Tabs defaultValue="programmes" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="programmes" className="text-xs">
            Programmes ({programmes.length})
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">
            Modules & Credits ({modules.length})
          </TabsTrigger>
          <TabsTrigger value="batches" className="text-xs">
            Intakes & Batches ({batches.length})
          </TabsTrigger>
          <TabsTrigger value="campuses" className="text-xs">
            Campuses ({campuses.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Programmes */}
        <TabsContent value="programmes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programmes.map((prog) => (
              <Card key={prog.id} className="shadow-sm border-border hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                      {prog.code}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {prog.level}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-2 leading-snug">
                    {prog.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {prog.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 text-xs space-y-3">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-semibold text-foreground">{prog.duration_months} Months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tuition Fee:</span>
                      <span className="font-bold text-foreground">LKR {prog.total_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial Registration:</span>
                      <span className="font-semibold text-emerald-600">LKR {prog.registration_fee.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {batches.filter((b) => b.intake?.programme_id === prog.id).length} batch(es) • {modules.filter((m) => m.programme_id === prog.id).length} module(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSyllabusFor(prog)}
                      className="h-6 text-[10px] text-primary"
                    >
                      {canManage ? 'Manage Syllabus →' : 'View Syllabus →'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Modules */}
        <TabsContent value="modules" className="space-y-3">
          {canManage && <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { setModulePreset(''); setDialog('module'); }}><Plus className="w-3.5 h-3.5" /> Add Module</Button>}
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Module Code</th>
                    <th className="py-3 px-4">Module Title</th>
                    <th className="py-3 px-4">Parent Programme</th>
                    <th className="py-3 px-4">Academic Credits</th>
                    <th className="py-3 px-4">Term</th>
                    <th className="py-3 px-4">Overview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modules.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{m.code}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{m.name}</td>
                      <td className="py-3 px-4 text-foreground/80">{m.programme?.name}</td>
                      <td className="py-3 px-4 font-mono font-medium">{m.credits} Credits</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">{m.term}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px] max-w-xs truncate">
                        {m.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Batches & Intakes */}
        <TabsContent value="batches" className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => setDialog('intake')}><Plus className="w-3.5 h-3.5" /> Add Intake</Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" disabled={intakes.length === 0} onClick={() => setDialog('batch')}><Plus className="w-3.5 h-3.5" /> Add Batch</Button>
            </div>
          )}
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Batch Code</th>
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Intake & Programme</th>
                    <th className="py-3 px-4">Assigned Venue</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Schedule Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{b.code}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{b.name}</td>
                      <td className="py-3 px-4 text-foreground/80">
                        {b.intake?.name} ({b.intake?.programme?.code})
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{b.room_number || '—'}</td>
                      <td className="py-3 px-4 font-mono">{b.capacity} Students</td>
                      <td className="py-3 px-4 text-primary font-medium">{b.schedule_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Campuses */}
        <TabsContent value="campuses" className="space-y-3">
          {canManage && <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => setDialog('campus')}><Plus className="w-3.5 h-3.5" /> Add Campus</Button>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campuses.map((camp) => (
              <Card key={camp.id} className="shadow-sm border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className={camp.is_active ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]' : 'text-[10px]'}>
                    {camp.is_active ? 'Operational' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{camp.name}</h3>
                  <div className="text-[10px] font-mono text-primary font-medium">{camp.code}</div>
                  <p className="text-xs text-muted-foreground mt-1">{camp.address}</p>
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                  <div>📞 {camp.contact_phone}</div>
                  <div>✉️ {camp.contact_email}</div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialog === 'programme'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Add Programme"
        fields={[
          { name: 'name', label: 'Programme name', required: true, wide: true },
          { name: 'code', label: 'Code', required: true, placeholder: 'e.g. DPEC-102' },
          { name: 'level', label: 'Level', required: true, placeholder: 'e.g. Diploma (NVQ Level 5)' },
          { name: 'department_id', label: 'Department', type: 'select', options: departments.map((d) => ({ value: d.id, label: d.name })) },
          { name: 'duration_months', label: 'Duration (months)', type: 'number', min: 1 },
          { name: 'total_fee', label: 'Total tuition fee (LKR)', type: 'number', min: 0 },
          { name: 'registration_fee', label: 'Registration fee (LKR)', type: 'number', min: 0 },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        initial={{ name: '', code: '', level: '', department_id: '', duration_months: 6, total_fee: 0, registration_fee: 0, description: '' }}
        submitLabel="Add Programme"
        successMessage="Programme added."
        onSubmit={async (v) => { await campusApi.createProgramme(clean(v)); reload(); }}
      />
      <FormDialog
        open={dialog === 'module'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Add Module"
        fields={[
          { name: 'programme_id', label: 'Programme', type: 'select', required: true, options: progOptions, wide: true },
          { name: 'name', label: 'Module title', required: true, wide: true },
          { name: 'code', label: 'Code', required: true },
          { name: 'credits', label: 'Credits', type: 'number', min: 1 },
          { name: 'term', label: 'Term', placeholder: 'Semester 1' },
          { name: 'description', label: 'Overview', type: 'textarea' },
        ]}
        initial={{ programme_id: modulePreset || programmes[0]?.id || '', name: '', code: '', credits: 15, term: 'Semester 1', description: '' }}
        submitLabel="Add Module"
        successMessage="Module added."
        onSubmit={async (v) => { await campusApi.createModule(clean(v)); reload(); }}
      />
      <FormDialog
        open={dialog === 'intake'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Add Intake"
        fields={[
          { name: 'programme_id', label: 'Programme', type: 'select', required: true, options: progOptions, wide: true },
          { name: 'name', label: 'Intake name', required: true, placeholder: 'e.g. 2027 January Intake' },
          { name: 'code', label: 'Code', required: true },
          { name: 'start_date', label: 'Start date', type: 'date', required: true },
          { name: 'end_date', label: 'End date', type: 'date', required: true },
        ]}
        initial={{ programme_id: programmes[0]?.id || '', name: '', code: '', start_date: '', end_date: '' }}
        submitLabel="Add Intake"
        successMessage="Intake added."
        onSubmit={async (v) => {
          if (String(v.end_date) <= String(v.start_date)) throw new Error('End date must be after the start date.');
          await campusApi.createIntake({ ...clean(v), status: 'Upcoming' });
          reload();
        }}
      />
      <FormDialog
        open={dialog === 'batch'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Add Batch"
        fields={[
          { name: 'intake_id', label: 'Intake', type: 'select', required: true, wide: true, options: intakes.map((i) => ({ value: i.id, label: `${i.name} (${i.programme?.code ?? ''})` })) },
          { name: 'name', label: 'Batch name', required: true, placeholder: 'e.g. Weekend Batch B' },
          { name: 'code', label: 'Code', required: true },
          { name: 'capacity', label: 'Capacity', type: 'number', min: 1 },
          { name: 'room_number', label: 'Home room', placeholder: 'e.g. Hall 302' },
          { name: 'schedule_summary', label: 'Schedule summary', wide: true, placeholder: 'e.g. Saturdays 09:00 - 13:00' },
        ]}
        initial={{ intake_id: intakes[0]?.id || '', name: '', code: '', capacity: 35, room_number: '', schedule_summary: '' }}
        submitLabel="Add Batch"
        successMessage="Batch added."
        onSubmit={async (v) => { await campusApi.createBatch(clean(v)); reload(); }}
      />
      <FormDialog
        open={dialog === 'campus'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Add Campus"
        fields={[
          { name: 'name', label: 'Campus name', required: true, wide: true },
          { name: 'code', label: 'Code', required: true, placeholder: 'e.g. NEG-04' },
          { name: 'contact_phone', label: 'Phone' },
          { name: 'contact_email', label: 'Email', type: 'email' },
          { name: 'address', label: 'Address', wide: true },
        ]}
        initial={{ name: '', code: '', contact_phone: '', contact_email: '', address: '' }}
        submitLabel="Add Campus"
        successMessage="Campus added."
        onSubmit={async (v) => { await campusApi.createCampus(clean(v)); reload(); }}
      />

      {/* SYLLABUS: modules of one programme */}
      <Dialog open={syllabusFor !== null} onOpenChange={(o) => !o && setSyllabusFor(null)}>
        <DialogContent className="max-w-xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">{syllabusFor?.name}</DialogTitle>
            <DialogDescription className="text-xs">{syllabusFor?.code} • {syllabusFor?.level} • {syllabusFor?.duration_months} months</DialogDescription>
          </DialogHeader>
          <div className="border border-border rounded-lg divide-y divide-border">
            {modules.filter((m) => m.programme_id === syllabusFor?.id).length === 0 && <div className="p-3 text-muted-foreground italic">No modules yet.</div>}
            {modules.filter((m) => m.programme_id === syllabusFor?.id).map((m) => (
              <div key={m.id} className="p-3 flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{m.code} – {m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.description}</div>
                </div>
                <div className="text-right shrink-0 text-[11px]"><div>{m.credits} credits</div><div className="text-muted-foreground">{m.term}</div></div>
              </div>
            ))}
          </div>
          {canManage && (
            <DialogFooter>
              <Button size="sm" className="gap-1" onClick={() => { setModulePreset(syllabusFor?.id ?? ''); setSyllabusFor(null); setDialog('module'); }}>
                <Plus className="w-3.5 h-3.5" /> Add Module to this Programme
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
