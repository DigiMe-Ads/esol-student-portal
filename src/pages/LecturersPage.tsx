import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Lecturer, Campus, Module } from '@/types/campus';
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
  Search,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([campusApi.getLecturers(), campusApi.getCampuses()])
      .then(([lList, cList]) => {
        setLecturers(lList);
        setCampuses(cList);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = lecturers.filter(
    (l) =>
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.specializations?.toLowerCase().includes(searchQuery.toLowerCase())
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

        <Button
          size="sm"
          onClick={() => toast.info('Faculty recruitment workflow opened.')}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Onboard Lecturer
        </Button>
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
                <img
                  src={
                    lec.photo_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={lec.full_name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shrink-0"
                />
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary mb-1">
                    {lec.lecturer_id}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-foreground leading-snug truncate">
                    {lec.full_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {lec.employment_type} • {lec.campus?.name || 'Colombo Campus'}
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
                    {lec.qualifications || 'Ph.D. in Linguistics'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
                    Specializations:
                  </div>
                  <div className="text-primary text-[11px] font-medium leading-tight">
                    {lec.specializations || 'English Pedagogy, Oral Fluency'}
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
                  <span>{lec.phone || '+94 77 123 4567'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                  Active Faculty
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Viewing workload allocation for ${lec.full_name}`)}
                  className="h-7 text-xs"
                >
                  Workload & Batches
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
