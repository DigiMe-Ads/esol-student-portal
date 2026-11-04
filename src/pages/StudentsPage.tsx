import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import type { Student, Programme, Campus, Invoice, AttendanceRecord } from '@/types/campus';
import { StudentIDCard } from '@/components/id-card/StudentIDCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  CreditCard,
  QrCode,
  Calendar,
  Search,
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Clock,
  Printer,
  Edit3,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export const StudentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Active Student for 360 View / ID Card
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getStudents(),
      campusApi.getCampuses(),
      campusApi.getProgrammes(),
    ])
      .then(([sList, cList, pList]) => {
        setStudents(sList);
        setCampuses(cList);
        setProgrammes(pList);

        // Check if query param ?id=... was passed
        const targetId = searchParams.get('id');
        if (targetId) {
          const match = sList.find((s) => s.id === targetId || s.student_number === targetId);
          if (match) {
            setSelectedStudent(match);
            setDetailModalOpen(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);
    const matchCampus = campusFilter === 'all' || s.campus_id === campusFilter;
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchCampus && matchStatus;
  });

  const handleOpenIdCard = (student: Student) => {
    setSelectedStudent(student);
    setIdCardModalOpen(true);
  };

  const handleOpen360 = (student: Student) => {
    setSelectedStudent(student);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
              Student Information System (SIS)
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              360° Academic Records
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Institutional directory of registered students with Barcode/QR identity credentials, academic enrollment, and financial balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
            Total Students: {students.length}
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by student number (EPC-2026-...), name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Campus:</Label>
          <Select value={campusFilter} onValueChange={setCampusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
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

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Registered">Registered</SelectItem>
              <SelectItem value="Deferred">Deferred</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student Records Grid / Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase font-mono text-[10px] border-b border-border">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Enrolled Programme</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4 text-right">Credentials & Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                    No student records matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const enrollment = student.enrollments?.[0];
                  return (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {student.student_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              student.photo_url ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                            }
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-foreground">{student.full_name}</div>
                            <div className="text-[11px] text-muted-foreground">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground/90 font-medium">
                          {enrollment?.programme?.name || 'Higher Diploma in English'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Batch: {enrollment?.batch?.name || 'Weekend Batch A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.campus?.name || 'Colombo Campus'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            student.status === 'Active'
                              ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                              : 'text-muted-foreground'
                          }
                        >
                          {student.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.enrollment_date || '2026-02-01'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenIdCard(student)}
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                          >
                            <QrCode className="w-3.5 h-3.5" /> ID Card
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpen360(student)}
                            className="h-7 text-xs bg-slate-800 text-slate-100 hover:bg-slate-700"
                          >
                            360° View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: DIGITAL STUDENT ID CARD GENERATOR & PRINT */}
      <Dialog open={idCardModalOpen} onOpenChange={setIdCardModalOpen}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-serif font-bold">
              Official Student ID Card Generator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Code 128 Barcode & QR Code credential for campus gate check-in, exams, and LMS verification.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="py-2 flex justify-center">
              <StudentIDCard student={selectedStudent} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: 360-DEGREE STUDENT PROFILE VIEW */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-serif font-bold text-foreground">
                  Student 360° Profile Record
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Institutional Master Record • EPC Identifier: {selectedStudent?.student_number}
                </DialogDescription>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">
                {selectedStudent?.status}
              </Badge>
            </div>
          </DialogHeader>

          {selectedStudent && (
            <Tabs defaultValue="personal" className="pt-2">
              <TabsList className="h-9 mb-4">
                <TabsTrigger value="personal" className="text-xs">Personal & Guardian</TabsTrigger>
                <TabsTrigger value="academic" className="text-xs">Academic Enrollment</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financial Ledger (LKR)</TabsTrigger>
                <TabsTrigger value="idcard" className="text-xs">Digital ID</TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start p-4 bg-muted/40 rounded-xl border border-border">
                  <img
                    src={selectedStudent.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt=""
                    className="w-20 h-24 rounded-lg object-cover border-2 border-primary/20 shrink-0"
                  />
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-base font-bold text-foreground">{selectedStudent.full_name}</h3>
                    <div className="text-xs font-mono text-primary font-semibold">{selectedStudent.student_number}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div>📞 Phone: <span className="text-foreground">{selectedStudent.phone}</span></div>
                      <div>💬 WhatsApp: <span className="text-foreground">{selectedStudent.whatsapp || selectedStudent.phone}</span></div>
                      <div>✉️ Email: <span className="text-foreground">{selectedStudent.email || 'N/A'}</span></div>
                      <div>🎂 DOB: <span className="text-foreground">{selectedStudent.dob || '2004-05-14'}</span></div>
                      <div>🚻 Gender: <span className="text-foreground">{selectedStudent.gender || 'Not specified'}</span></div>
                      <div>📍 Campus: <span className="text-foreground">{selectedStudent.campus?.name || 'Colombo Main'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Parent / Guardian & Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground text-[10px]">Guardian Name</div>
                      <div className="font-semibold text-foreground">{selectedStudent.parent_name || 'Sunil Perera'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">Guardian Phone</div>
                      <div className="font-semibold text-foreground">{selectedStudent.parent_phone || '+94 71 223 9988'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">Emergency Protocol</div>
                      <div className="font-semibold text-foreground">{selectedStudent.emergency_contact || '+94 11 273 1122'}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Academic Enrollment Tab */}
              <TabsContent value="academic" className="space-y-3">
                <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground text-sm">
                      {selectedStudent.enrollments?.[0]?.programme?.name || 'Diploma in Professional English & Communication'}
                    </div>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50">Active Batch</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px]">Intake:</span>
                      <div className="font-semibold text-foreground">{selectedStudent.enrollments?.[0]?.intake?.name || '2026 Batch 01 (Spring)'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">Batch:</span>
                      <div className="font-semibold text-foreground">{selectedStudent.enrollments?.[0]?.batch?.name || 'Weekend Batch A (DPEC-26A)'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">Enrollment Date:</span>
                      <div className="font-semibold text-foreground">{selectedStudent.enrollment_date}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="text-xs font-semibold text-foreground mb-1.5">Module Registration Checklist</div>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                    <li>Advanced Business Writing & Reporting (DPEC-M1) — Status: Enrolled (Pass)</li>
                    <li>Public Speaking & Oral Rhetoric (DPEC-M2) — Status: In Progress</li>
                  </ul>
                </div>
              </TabsContent>

              {/* Financial Ledger Tab */}
              <TabsContent value="financial" className="space-y-3">
                <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase font-mono">Total Financial Clearance</div>
                    <div className="text-xl font-bold font-serif text-emerald-600">LKR 75,000 Verified</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground uppercase font-mono">Current Outstanding Balance</div>
                    <div className="text-xl font-bold font-serif text-amber-600">LKR 35,000 Due</div>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Total Amount</th>
                        <th className="py-2.5 px-3">Paid</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-medium">INV-2026-0001</td>
                        <td className="py-2.5 px-3">Registration & Tuition Installment 1</td>
                        <td className="py-2.5 px-3 font-medium">LKR 75,000</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">LKR 75,000</td>
                        <td className="py-2.5 px-3">
                          <Badge className="bg-emerald-600 text-white text-[9px]">Paid</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-medium">INV-2026-0002</td>
                        <td className="py-2.5 px-3">Term 2 Tuition Installment</td>
                        <td className="py-2.5 px-3 font-medium">LKR 70,000</td>
                        <td className="py-2.5 px-3 text-blue-600 font-semibold">LKR 35,000</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[9px]">Partial</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Digital ID Card Tab */}
              <TabsContent value="idcard" className="flex justify-center py-3">
                <StudentIDCard student={selectedStudent} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
