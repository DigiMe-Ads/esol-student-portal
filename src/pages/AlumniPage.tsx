import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Archive,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  Search,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const AlumniPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const alumni = [
    {
      id: '1',
      name: 'Nimesha Fernando',
      studentNumber: 'EPC-2024-00142',
      programme: 'Higher Diploma in English & Communication',
      gradYear: '2025',
      currentRole: 'Corporate Communications Executive',
      company: 'Dialog Axiata PLC',
      phone: '+94 77 445 1199',
      email: 'nimesha.f@gmail.com',
    },
    {
      id: '2',
      name: 'Thilina Bandara',
      studentNumber: 'EPC-2024-00188',
      programme: 'Certificate in TESL (Teaching English as a Second Language)',
      gradYear: '2025',
      currentRole: 'Assistant English Teacher',
      company: 'Gateway College Kandy',
      phone: '+94 71 889 0044',
      email: 'thilina.bandara@yahoo.com',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Alumni Relations & Graduate Progression
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Alumni Network
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Tracking post-graduation employment outcomes, career progression, and postgraduate re-enrollment opportunities.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('Alumni re-enrollment discount offer dispatched')}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <GraduationCap className="w-4 h-4" />
          Send Progression Offer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alumni.map((alum) => (
          <Card key={alum.id} className="shadow-sm border-border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-foreground text-sm">{alum.name}</h3>
                <div className="text-[10px] font-mono text-primary font-semibold">{alum.studentNumber}</div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">Class of {alum.gradYear}</Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              🎓 Graduated: <span className="text-foreground font-medium">{alum.programme}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>{alum.currentRole}</span>
              </div>
              <div className="text-muted-foreground text-[11px]">Organization: {alum.company}</div>
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground text-[11px]">📞 {alum.phone}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`Viewing employment record for ${alum.name}`)}
                className="h-7 text-xs"
              >
                Graduate Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
