import React, { useState, useEffect } from 'react';
import { campusApi } from '@/services/campusApi';
import type { Inquiry, InquiryStatus, Programme, Campus, Intake, Batch } from '@/types/campus';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  PhoneCall,
  Calendar,
  CheckCircle,
  GraduationCap,
  ArrowRight,
  Filter,
  Clock,
  MessageSquare,
  Search,
  UserCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

const KANBAN_STAGES: InquiryStatus[] = [
  'New Inquiry',
  'Contact Attempted',
  'Contacted',
  'Counselling Scheduled',
  'Counselling Completed',
  'Programme Recommended',
  'Awaiting Registration',
  'Payment Pending',
  'Registered',
  'Lost',
  'Deferred',
];

export const CRMPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Modals
  const [newInquiryOpen, setNewInquiryOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);

  // New Inquiry Form State
  const [inqName, setInqName] = useState('');
  const [inqPhone, setInqPhone] = useState('');
  const [inqWhatsapp, setInqWhatsapp] = useState('');
  const [inqEmail, setInqEmail] = useState('');
  const [inqParentName, setInqParentName] = useState('');
  const [inqParentContact, setInqParentContact] = useState('');
  const [inqCampusId, setInqCampusId] = useState('');
  const [inqProgrammeId, setInqProgrammeId] = useState('');
  const [inqSource, setInqSource] = useState<'Facebook' | 'Instagram' | 'Website' | 'Walk-in' | 'Other'>('Website');
  const [inqNotes, setInqNotes] = useState('');

  // Follow-up Form State
  const [followType, setFollowType] = useState('Phone Call');
  const [followOutcome, setFollowOutcome] = useState('Interested');
  const [followNotes, setFollowNotes] = useState('');
  const [nextDate, setNextDate] = useState('');

  // Conversion Form State
  const [convProgrammeId, setConvProgrammeId] = useState('');
  const [convIntakeId, setConvIntakeId] = useState('');
  const [convBatchId, setConvBatchId] = useState('');
  const [convFee, setConvFee] = useState(15000);
  const [convPayMethod, setConvPayMethod] = useState('Bank Transfer');
  const [convPayRef, setConvPayRef] = useState('TXN-REG-8821');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      campusApi.getInquiries(),
      campusApi.getProgrammes(),
      campusApi.getCampuses(),
      campusApi.getIntakes(),
      campusApi.getBatches(),
    ])
      .then(([i, p, c, intk, b]) => {
        setInquiries(i);
        setProgrammes(p);
        setCampuses(c);
        setIntakes(intk);
        setBatches(b);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const matchSearch =
      inq.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contact_number.includes(searchQuery) ||
      inq.ref_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProg = selectedProgramme === 'all' || inq.interested_programme_id === selectedProgramme;
    const matchCamp = selectedCampus === 'all' || inq.preferred_campus_id === selectedCampus;
    return matchSearch && matchProg && matchCamp;
  });

  const handleStageChange = async (inquiryId: string, newStatus: InquiryStatus) => {
    try {
      await campusApi.updateInquiryStatus(inquiryId, newStatus);
      setInquiries((prev) =>
        prev.map((item) => (item.id === inquiryId ? { ...item, status: newStatus } : item))
      );
      toast.success(`Inquiry moved to stage: ${newStatus}`);
    } catch (err: any) {
      toast.error(`Failed to move inquiry: ${err.message}`);
    }
  };

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqName || !inqPhone) {
      toast.error('Student Name and Contact Number are required.');
      return;
    }

    try {
      const created = await campusApi.createInquiry({
        student_name: inqName,
        contact_number: inqPhone,
        whatsapp_number: inqWhatsapp || inqPhone,
        email: inqEmail,
        parent_name: inqParentName,
        parent_contact: inqParentContact,
        preferred_campus_id: inqCampusId || campuses[0]?.id,
        interested_programme_id: inqProgrammeId || programmes[0]?.id,
        source: inqSource,
        notes: inqNotes,
        status: 'New Inquiry',
        follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });

      setInquiries([created, ...inquiries]);
      setNewInquiryOpen(false);
      // Reset form
      setInqName('');
      setInqPhone('');
      setInqWhatsapp('');
      setInqEmail('');
      setInqParentName('');
      setInqParentContact('');
      setInqNotes('');
      toast.success(`Inquiry ${created.ref_number} registered successfully!`);
    } catch (err: any) {
      toast.error(`Error adding inquiry: ${err.message}`);
    }
  };

  const handleOpenFollowup = (inquiry: Inquiry) => {
    setActiveInquiry(inquiry);
    setFollowNotes('');
    setNextDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    setFollowupOpen(true);
  };

  const handleSaveFollowup = async () => {
    if (!activeInquiry || !followNotes) {
      toast.error('Please enter follow-up activity notes.');
      return;
    }

    try {
      await campusApi.addInquiryFollowup({
        inquiry_id: activeInquiry.id,
        contact_type: followType,
        outcome: followOutcome,
        notes: followNotes,
        follow_up_date: nextDate,
        logged_by: 'Admissions Officer',
      });

      toast.success('Follow-up interaction logged to timeline.');
      setFollowupOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(`Failed to record follow-up: ${err.message}`);
    }
  };

  const handleOpenConvert = (inquiry: Inquiry) => {
    setActiveInquiry(inquiry);
    setConvProgrammeId(inquiry.interested_programme_id || programmes[0]?.id || '');
    setConvIntakeId(intakes[0]?.id || '');
    setConvBatchId(batches[0]?.id || '');
    const prog = programmes.find((p) => p.id === (inquiry.interested_programme_id || programmes[0]?.id));
    setConvFee(prog?.registration_fee || 15000);
    setConvertModalOpen(true);
  };

  const handleExecuteConversion = async () => {
    if (!activeInquiry) return;

    try {
      const result = await campusApi.convertInquiryToStudent({
        inquiryId: activeInquiry.id,
        studentName: activeInquiry.student_name,
        email: activeInquiry.email || `${activeInquiry.student_name.toLowerCase().replace(/\s+/g, '.')}@student.esolpremier.edu.lk`,
        phone: activeInquiry.contact_number,
        programmeId: convProgrammeId,
        intakeId: convIntakeId,
        batchId: convBatchId,
        campusId: activeInquiry.preferred_campus_id || campuses[0]?.id,
        registrationFee: convFee,
        paymentMethod: convPayMethod,
        paymentReference: convPayRef,
      });

      toast.success(
        `Success! Permanent Student Number ${result.student.student_number} assigned to ${result.student.full_name}. Digital ID card generated!`
      );
      setConvertModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(`Conversion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              CRM & Admissions Pipeline
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
              11-Stage Kanban
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Track prospective student inquiries, schedule follow-ups, and convert verified leads to active student profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setNewInquiryOpen(true)}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            New Inquiry
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="kanban" className="text-xs">
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                List View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search lead by name, ref, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Programme:</Label>
          <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All Programmes" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Programmes</SelectItem>
              {programmes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Campus:</Label>
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Campuses</SelectItem>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[560px]">
          {KANBAN_STAGES.map((stage) => {
            const stageInquiries = filteredInquiries.filter((inq) => inq.status === stage);

            return (
              <div
                key={stage}
                className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border/80 overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3 bg-card border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground truncate">{stage}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {stageInquiries.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[640px]">
                  {stageInquiries.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-[11px] text-muted-foreground italic">
                      No leads in this stage
                    </div>
                  ) : (
                    stageInquiries.map((inq) => (
                      <Card
                        key={inq.id}
                        className="p-3 bg-card shadow-sm border-border hover:shadow transition-shadow space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-bold text-foreground text-xs leading-snug">
                              {inq.student_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {inq.ref_number}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                            {inq.source}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-foreground/80 line-clamp-1">
                          🎓 {inq.programme?.name || 'General Inquiry'}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          <span>📞 {inq.contact_number}</span>
                          {inq.follow_up_date && (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <Clock className="w-3 h-3" />
                              {inq.follow_up_date}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFollowup(inq)}
                            className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <PhoneCall className="w-3 h-3 mr-1" /> Log Activity
                          </Button>

                          {inq.status !== 'Registered' ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenConvert(inq)}
                              className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <UserCheck className="w-3 h-3" /> Convert
                            </Button>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px] h-5">
                              Enrolled
                            </Badge>
                          )}
                        </div>

                        {/* Stage Selector Dropdown */}
                        <div className="pt-1">
                          <Select
                            value={inq.status}
                            onValueChange={(val) => handleStageChange(inq.id, val as InquiryStatus)}
                          >
                            <SelectTrigger className="h-6 text-[10px] bg-muted/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              {KANBAN_STAGES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  Move to: {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <Card className="shadow-sm border-border overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Student Prospect</th>
                  <th className="py-3 px-4">Interested Programme</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{inq.ref_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{inq.student_name}</div>
                      <div className="text-[11px] text-muted-foreground">{inq.contact_number}</div>
                    </td>
                    <td className="py-3 px-4 text-foreground/90">{inq.programme?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">{inq.source}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{inq.campus?.name || 'Colombo'}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={inq.status === 'Registered' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {inq.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{inq.follow_up_date || 'None'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenFollowup(inq)}
                          className="h-7 text-xs"
                        >
                          Log Call
                        </Button>
                        {inq.status !== 'Registered' && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenConvert(inq)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Convert
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: NEW INQUIRY CAPTURE */}
      <Dialog open={newInquiryOpen} onOpenChange={setNewInquiryOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">New Prospective Inquiry Form</DialogTitle>
            <DialogDescription className="text-xs">
              Capture walk-in, social media, or phone call admissions lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInquiry} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Student Full Name *</Label>
                <Input
                  required
                  placeholder="e.g. Malith Sandeepa Silva"
                  value={inqName}
                  onChange={(e) => setInqName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contact Phone *</Label>
                <Input
                  required
                  placeholder="e.g. +94 77 123 4567"
                  value={inqPhone}
                  onChange={(e) => setInqPhone(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">WhatsApp Number</Label>
                <Input
                  placeholder="e.g. +94 77 123 4567"
                  value={inqWhatsapp}
                  onChange={(e) => setInqWhatsapp(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. malith.silva@gmail.com"
                  value={inqEmail}
                  onChange={(e) => setInqEmail(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Parent / Guardian Name</Label>
                <Input
                  placeholder="e.g. Ranjith Silva"
                  value={inqParentName}
                  onChange={(e) => setInqParentName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Parent Contact</Label>
                <Input
                  placeholder="e.g. +94 71 889 0011"
                  value={inqParentContact}
                  onChange={(e) => setInqParentContact(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Interested Programme</Label>
                <Select value={inqProgrammeId} onValueChange={setInqProgrammeId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select programme" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Inquiry Source</Label>
                <Select value={inqSource} onValueChange={(v: any) => setInqSource(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Counselling Notes / Goals</Label>
              <Textarea
                placeholder="Student background, language goals, qualification aspirations..."
                value={inqNotes}
                onChange={(e) => setInqNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" size="sm" onClick={() => setNewInquiryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                Register Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: LOG FOLLOW-UP ACTIVITY */}
      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold">Log Interaction & Follow-Up</DialogTitle>
            <DialogDescription className="text-xs">
              Recording notes for lead: <span className="font-semibold text-foreground">{activeInquiry?.student_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Channel</Label>
                <Select value={followType} onValueChange={setFollowType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="WhatsApp Chat">WhatsApp Chat</SelectItem>
                    <SelectItem value="Campus Meeting">Campus Meeting</SelectItem>
                    <SelectItem value="Email Briefing">Email Briefing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Lead Outcome</Label>
                <Select value={followOutcome} onValueChange={setFollowOutcome}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Interested">High Interest</SelectItem>
                    <SelectItem value="Discussing with Parents">Discussing with Parents</SelectItem>
                    <SelectItem value="Requested Quotation">Requested Quotation</SelectItem>
                    <SelectItem value="Not Reachable">Not Reachable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Interaction Notes</Label>
              <Textarea
                placeholder="Details of the counselling conversation..."
                value={followNotes}
                onChange={(e) => setFollowNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Next Follow-Up Date</Label>
              <Input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setFollowupOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveFollowup} className="bg-primary text-primary-foreground">
              Save Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CONVERT INQUIRY TO STUDENT (CRITICAL WORKFLOW) */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold text-emerald-600 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Inquiry-to-Student Conversion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Automated institutional enrollment: Assigns permanent Student Number (EPC-2026-XXXXX), activates student portal, generates digital barcode ID, and verifies initial registration invoice in LKR.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <div className="font-semibold text-foreground text-sm">{activeInquiry?.student_name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Contact: {activeInquiry?.contact_number} • Ref: {activeInquiry?.ref_number}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Enroll Programme</Label>
                <Select value={convProgrammeId} onValueChange={setConvProgrammeId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Assigned Batch</Label>
                <Select value={convBatchId} onValueChange={setConvBatchId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Verified Registration Fee (LKR)</Label>
                <Input
                  type="number"
                  value={convFee}
                  onChange={(e) => setConvFee(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={convPayMethod} onValueChange={setConvPayMethod}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Bank Transfer">Bank Transfer (Deposit Slip)</SelectItem>
                    <SelectItem value="Cash">Cash at Counter</SelectItem>
                    <SelectItem value="Card">Credit/Debit POS</SelectItem>
                    <SelectItem value="Online Gateway">Online Banking Gateway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Verification Slip / Transaction Reference</Label>
              <Input
                value={convPayRef}
                onChange={(e) => setConvPayRef(e.target.value)}
                placeholder="e.g. BOC-DEP-88992 or POS receipt no"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteConversion}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Verify & Complete Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
