import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

export const CampusAdminPage: React.FC = () => {
  const rooms = [
    {
      name: 'Hall 302 (Multimedia Lecture Hall)',
      campus: 'Colombo City Campus',
      capacity: '60 seats',
      status: 'Occupied',
      currentSession: 'DPEC Weekend Batch A (09:00 - 13:00)',
    },
    {
      name: 'Hall 204 (Language Lab & Audio Studio)',
      campus: 'Colombo City Campus',
      capacity: '35 booths',
      status: 'Available',
      currentSession: 'Scheduled next at 14:00',
    },
    {
      name: 'Seminar Room K1',
      campus: 'Kandy Hill Campus',
      capacity: '45 seats',
      status: 'Available',
      currentSession: 'Open for booking',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Campus Facilities & Resource Management
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Multi-Campus Operations
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Real-time room availability, lecture theatre allocations, audiovisual equipment, and building maintenance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map((r, i) => (
          <Card key={i} className="shadow-sm border-border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Badge
                className={
                  r.status === 'Available'
                    ? 'bg-emerald-600 text-white text-[10px]'
                    : 'bg-amber-600 text-white text-[10px]'
                }
              >
                {r.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">{r.capacity}</span>
            </div>

            <div>
              <h3 className="font-bold text-foreground text-sm leading-snug">{r.name}</h3>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{r.campus}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground/90">
              {r.currentSession}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Booked ${r.name} for revision workshop`)}
              className="w-full text-xs h-7"
            >
              Reserve Facility
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
