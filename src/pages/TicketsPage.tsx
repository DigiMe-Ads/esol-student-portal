import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Award, Plus, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState([
    {
      id: 'TICK-001',
      studentName: 'Kavinda Perera',
      subject: 'Request for Exam Admission Card Re-print',
      category: 'Examinations',
      priority: 'High',
      status: 'In Progress',
      date: '2026-10-10',
    },
    {
      id: 'TICK-002',
      studentName: 'Malith Sandeepa',
      subject: 'Correction in Parent Contact Phone Number',
      category: 'Student Affairs',
      priority: 'Medium',
      status: 'Resolved',
      date: '2026-10-08',
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newSubj, setNewSubj] = useState('');
  const [newCat, setNewCat] = useState('Examinations');
  const [newDesc, setNewDesc] = useState('');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `TICK-00${tickets.length + 1}`,
      studentName: 'Kavinda Perera',
      subject: newSubj,
      category: newCat,
      priority: 'Medium',
      status: 'Open',
      date: '2026-10-10',
    };
    setTickets([created, ...tickets]);
    setModalOpen(false);
    toast.success(`Ticket ${created.id} logged to campus helpdesk queue.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Student Support Desk & Help Tickets
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              SLA Resolution Engine
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Student grievances, ID card re-issue requests, exam deferrals, and administrative inquiries.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Create Support Ticket
        </Button>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Card key={t.id} className="p-4 shadow-sm border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">
                  {t.id}
                </Badge>
                <Badge variant="secondary" className="text-[9px]">
                  {t.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{t.date}</span>
              </div>
              <h4 className="font-bold text-xs text-foreground">{t.subject}</h4>
              <div className="text-[11px] text-muted-foreground">Logged by: {t.studentName}</div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Badge
                className={
                  t.status === 'Resolved'
                    ? 'bg-emerald-600 text-white text-[9px]'
                    : 'bg-amber-600 text-white text-[9px]'
                }
              >
                {t.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`Viewing ticket history for ${t.id}`)}
                className="h-7 text-xs"
              >
                Inspect
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">New Helpdesk Ticket</DialogTitle>
            <DialogDescription className="text-xs">
              Log an administrative or academic inquiry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Subject *</Label>
              <Input
                required
                value={newSubj}
                onChange={(e) => setNewSubj(e.target.value)}
                placeholder="e.g. Inquire about batch transfer"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="Examinations">Examinations & Hall Tickets</SelectItem>
                  <SelectItem value="Finance">Tuition Fees & Payments</SelectItem>
                  <SelectItem value="Academic">Academic Transcripts</SelectItem>
                  <SelectItem value="Student Affairs">Student Affairs & ID Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Details of the request..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
