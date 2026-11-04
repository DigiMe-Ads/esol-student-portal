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
import { toast } from 'sonner';

export const AcademicsPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => toast.info('New programme accreditation workflow triggered')}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add Programme
          </Button>
        </div>
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
                      <Users className="w-3.5 h-3.5" /> Batches Enrolled
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info(`Viewing syllabus for ${prog.name}`)}
                      className="h-6 text-[10px] text-primary"
                    >
                      Manage Syllabus →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Modules */}
        <TabsContent value="modules">
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
        <TabsContent value="batches">
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
                      <td className="py-3 px-4 text-muted-foreground">{b.room_number || 'Hall 302'}</td>
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
        <TabsContent value="campuses">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campuses.map((camp) => (
              <Card key={camp.id} className="shadow-sm border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]">
                    Operational
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
    </div>
  );
};
