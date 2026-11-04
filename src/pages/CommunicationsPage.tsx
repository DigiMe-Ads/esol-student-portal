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
  MessageSquare,
  Mail,
  Send,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const CommunicationsPage: React.FC = () => {
  const [channel, setChannel] = useState<'SMS' | 'WhatsApp' | 'Email'>('WhatsApp');
  const [recipientGroup, setRecipientGroup] = useState('All Weekend Batch Students');
  const [template, setTemplate] = useState('Exam Hall Notice');
  const [messageBody, setMessageBody] = useState(
    'Dear Student, Your term examination is scheduled for Saturday at 09:00 AM at Hall 302, ESOL Premier Campus Colombo. Please bring your scannable Student ID card.'
  );

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      `Broadcast dispatched successfully via ${channel} to ${recipientGroup}! (32 messages queued)`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Institutional Communications Hub
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Multi-Channel Broadcast
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Automated SMS notifications, WhatsApp updates, email circulars, and dispatch audit logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Compose Broadcast Announcement</CardTitle>
            <CardDescription className="text-xs">
              Reach students, parents, or faculty across automated mobile channels
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSendBroadcast} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Delivery Channel</Label>
                <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="WhatsApp">WhatsApp Gateway (+94)</SelectItem>
                    <SelectItem value="SMS">Direct SMS (Dialog / Mobitel)</SelectItem>
                    <SelectItem value="Email">Campus Email Broadcast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Recipient Batch</Label>
                <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="All Weekend Batch Students">All Weekend Batch Students</SelectItem>
                    <SelectItem value="DPEC 2026 Batch A">DPEC 2026 Batch A</SelectItem>
                    <SelectItem value="Parents of Overdue Installments">Parents of Overdue Installments</SelectItem>
                    <SelectItem value="All Academic Faculty">All Academic Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notification Message Content</Label>
              <Textarea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button type="submit" className="h-9 text-xs bg-primary text-primary-foreground gap-1.5">
              <Send className="w-4 h-4" /> Send Instant Broadcast
            </Button>
          </form>
        </Card>

        {/* Live Logs Feed */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Recent Dispatch Logs</CardTitle>
            <CardDescription className="text-xs">Delivery status audit log</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Registration Invoice Alert</span>
                  <Badge className="bg-emerald-600 text-white text-[8px]">Delivered</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">WhatsApp • Student: Kavinda Perera</div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Class Cancellation Reminder</span>
                  <Badge className="bg-emerald-600 text-white text-[8px]">Delivered</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">SMS • Batch: CAE Weekend</div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Exam Eligibility Clearance</span>
                  <Badge className="bg-emerald-600 text-white text-[8px]">Delivered</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">Email • 18 Candidates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
