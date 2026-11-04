import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { campusApi } from '@/services/campusApi';
import type { Student, Inquiry, Programme, Lecturer } from '@/types/campus';
import {
  User,
  GraduationCap,
  FileText,
  CreditCard,
  QrCode,
  Users,
  Search,
  BookOpen,
} from 'lucide-react';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        campusApi.getStudents(),
        campusApi.getInquiries(),
        campusApi.getProgrammes(),
        campusApi.getLecturers(),
      ])
        .then(([sData, iData, pData, lData]) => {
          setStudents(sData);
          setInquiries(iData);
          setProgrammes(pData);
          setLecturers(lData);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search students, student ID (EPC-...), leads, courses, or staff..." />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>No matching campus records found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="System Shortcuts">
          <CommandItem onSelect={() => handleSelect(() => navigate('/attendance'))}>
            <QrCode className="mr-2 h-4 w-4 text-primary" />
            <span>Barcode & QR Attendance Scanner</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm'))}>
            <Users className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Admissions Kanban Pipeline</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/finance'))}>
            <CreditCard className="mr-2 h-4 w-4 text-amber-600" />
            <span>Finance & Payment Verification (LKR)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/lms'))}>
            <BookOpen className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Learning Management Courses</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Students */}
        <CommandGroup heading="Registered Students">
          {students.slice(0, 6).map((student) => (
            <CommandItem
              key={student.id}
              value={`${student.full_name} ${student.student_number} ${student.phone}`}
              onSelect={() => handleSelect(() => navigate(`/students?id=${student.id}`))}
            >
              <User className="mr-2 h-4 w-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs text-foreground">{student.full_name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {student.student_number} • {student.phone}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* CRM Leads */}
        <CommandGroup heading="Admissions Inquiries">
          {inquiries.slice(0, 5).map((inquiry) => (
            <CommandItem
              key={inquiry.id}
              value={`${inquiry.student_name} ${inquiry.ref_number} ${inquiry.status}`}
              onSelect={() => handleSelect(() => navigate('/crm'))}
            >
              <FileText className="mr-2 h-4 w-4 text-amber-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs text-foreground">{inquiry.student_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  Ref: {inquiry.ref_number} • Status: {inquiry.status}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Academic Programmes */}
        <CommandGroup heading="Academic Programmes">
          {programmes.map((prog) => (
            <CommandItem
              key={prog.id}
              value={`${prog.name} ${prog.code}`}
              onSelect={() => handleSelect(() => navigate('/academics'))}
            >
              <GraduationCap className="mr-2 h-4 w-4 text-purple-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs text-foreground">{prog.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {prog.code} • Fee: LKR {prog.total_fee.toLocaleString()}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
