import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { campusApi } from '@/services/campusApi';
import type { Student, Programme, Campus, Batch } from '@/types/campus';
import { StudentIDCard } from '@/components/id-card/StudentIDCard';
import { StudentProfileDialog, STUDENT_STATUSES } from '@/components/students/StudentProfileDialog';
import { EnrollStudentDialog } from '@/components/students/EnrollStudentDialog';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { usePermission } from '@/lib/permissions';
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
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

export const StudentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const { selectedCampusId } = useAuthRole();
  const can = usePermission();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState(selectedCampusId);
  useEffect(() => setCampusFilter(selectedCampusId), [selectedCampusId]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Active Student for 360 View / ID Card
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadData = () =>
    campusApi.getStudents().then((sList) => {
      setStudents(sList);
      setSelectedStudent((prev) => (prev ? sList.find((s) => s.id === prev.id) ?? null : prev));
      return sList;
    });

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadData(),
      campusApi.getCampuses(),
      campusApi.getProgrammes(),
      campusApi.getBatches(),
    ])
      .then(([sList, cList, pList, bList]) => {
        setCampuses(cList);
        setProgrammes(pList);
        setBatches(bList);

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
      .catch((err) => toast.error(err.message))
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
          {can('manageStudents') && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground">
              <UserPlus className="w-4 h-4" /> Add Student
            </Button>
          )}
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
              {STUDENT_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>{st}</SelectItem>
              ))}
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
                    {loading ? 'Loading students…' : 'No student records matching current criteria.'}
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
                          <StudentAvatar student={student} />
                          <div>
                            <div className="font-semibold text-foreground">{student.full_name}</div>
                            <div className="text-[11px] text-muted-foreground">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground/90 font-medium">
                          {enrollment?.programme?.name || 'Not enrolled'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Batch: {enrollment?.batch?.name || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.campus?.name || '—'}
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
                        {student.enrollment_date}
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

      {/* MODAL 1: DIGITAL STUDENT ID CARD */}
      <Dialog open={idCardModalOpen} onOpenChange={setIdCardModalOpen}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-serif font-bold">Official Student ID Card</DialogTitle>
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

      {/* MODAL 2: 360-DEGREE STUDENT PROFILE */}
      <StudentProfileDialog
        student={selectedStudent}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onChanged={loadData}
      />

      {/* MODAL 3: REGISTER NEW STUDENT */}
      <EnrollStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        campuses={campuses}
        programmes={programmes}
        batches={batches}
        onEnrolled={() => loadData()}
      />
    </div>
  );
};
