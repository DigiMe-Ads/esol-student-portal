import React, { useEffect, useState } from 'react';
import { campusApi } from '@/services/campusApi';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/lib/permissions';
import type { AlumniProfile, Certificate, Student } from '@/types/campus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog, clean } from '@/components/common/FormDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, Briefcase, Search } from 'lucide-react';
import { toast } from 'sonner';

const ALUMNI_STATUSES = ['Graduated', 'Alumni', 'Completed'];

export const AlumniPage: React.FC = () => {
  const { user } = useAuth();
  const can = usePermission();
  const canManage = can('manageAlumni');
  const [alumni, setAlumni] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AlumniProfile>>({});
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Student | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState({ title: 'Progression offer for ESOL graduates', message: '' });
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([campusApi.getStudents(), campusApi.getAlumniProfiles(), campusApi.getCertificates()])
      .then(([st, pr, ce]) => {
        setAlumni(st.filter((s) => ALUMNI_STATUSES.includes(s.status)));
        setProfiles(Object.fromEntries(pr.map((p) => [p.student_id, p])));
        setCerts(ce);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const q = searchQuery.toLowerCase();
  const shown = alumni.filter((a) => {
    const p = profiles[a.id];
    return !q || [a.full_name, a.student_number, p?.organization, p?.current_position].some((v) => v?.toLowerCase().includes(q));
  });

  const sendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await Promise.all(alumni.map((a) => campusApi.createNotification({ student_id: a.id, title: offer.title, message: offer.message, sent_by: user?.display_name })));
      toast.success(`Offer sent to ${alumni.length} graduate(s); it appears in their portal notices.`);
      setOfferOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Alumni Relations & Graduate Progression</h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Alumni Network</Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Students whose status is Graduated, Alumni or Completed, with their employment outcomes. Change a student's status from their 360° profile.
          </p>
        </div>
        {canManage && (
          <Button size="sm" disabled={alumni.length === 0} onClick={() => { setOffer({ title: 'Progression offer for ESOL graduates', message: '' }); setOfferOpen(true); }} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
            <GraduationCap className="w-4 h-4" /> Send Progression Offer
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input placeholder="Search graduates by name, number, employer or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
      </div>

      {shown.length === 0 && (
        <div className="text-xs text-muted-foreground italic">{loading ? 'Loading…' : 'No graduates yet. Mark a student as Graduated or Alumni in Students (SIS) to list them here.'}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map((alum) => {
          const p = profiles[alum.id];
          const cert = certs.find((c) => c.student_id === alum.id);
          return (
            <Card key={alum.id} className="shadow-sm border-border p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{alum.full_name}</h3>
                  <div className="text-[10px] font-mono text-primary font-semibold">{alum.student_number}</div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">{p?.graduation_year ? `Class of ${p.graduation_year}` : alum.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                🎓 <span className="text-foreground font-medium">{cert?.qualification ?? alum.enrollments?.[0]?.programme?.name ?? '—'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  <span>{p?.current_position || 'Employment not recorded'}</span>
                </div>
                {p?.organization && <div className="text-muted-foreground text-[11px]">Organization: {p.organization}</div>}
                {p?.notes && <div className="text-muted-foreground text-[11px]">{p.notes}</div>}
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground text-[11px]">📞 {alum.phone} {alum.email && `• ${alum.email}`}</span>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(alum)} className="h-7 text-xs">Update Graduate Profile</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Graduate profile: ${editing?.full_name ?? ''}`}
        fields={[
          { name: 'graduation_year', label: 'Graduation year', type: 'number', min: 1990 },
          { name: 'current_position', label: 'Current role' },
          { name: 'organization', label: 'Organization', wide: true },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        initial={{
          graduation_year: profiles[editing?.id ?? '']?.graduation_year ?? new Date().getFullYear(),
          current_position: profiles[editing?.id ?? '']?.current_position ?? '',
          organization: profiles[editing?.id ?? '']?.organization ?? '',
          notes: profiles[editing?.id ?? '']?.notes ?? '',
        }}
        submitLabel="Save Profile"
        successMessage="Graduate profile saved."
        onSubmit={async (v) => { if (editing) { await campusApi.saveAlumniProfile({ student_id: editing.id, ...clean(v) }); load(); } }}
      />

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Send Progression Offer</DialogTitle>
            <DialogDescription className="text-xs">Sent as an in-app notice to all {alumni.length} graduate(s). SMS / email gateways are not connected.</DialogDescription>
          </DialogHeader>
          <form onSubmit={sendOffer} className="space-y-3">
            <Input required value={offer.title} onChange={(e) => setOffer({ ...offer, title: e.target.value })} className="h-8 text-xs" />
            <Textarea required rows={4} value={offer.message} onChange={(e) => setOffer({ ...offer, message: e.target.value })} placeholder="e.g. 15% re-enrolment discount on the HND in English Studies for the January intake." className="text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOfferOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={sending}>Send to Graduates</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
