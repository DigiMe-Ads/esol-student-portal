import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadStudentPhoto, deletePortalFile, useFileUrl } from '@/services/fileStorage';
import { campusApi } from '@/services/campusApi';
import type { Student } from '@/types/campus';
import { Button } from '@/components/ui/button';

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Student photo (signed link for uploaded photos), or their initials when no photo is on file.
export const StudentAvatar: React.FC<{ student: Pick<Student, 'full_name' | 'photo_url'>; className?: string }> = ({ student, className = 'w-7 h-7 rounded-full text-[10px]' }) => {
  const src = useFileUrl(student.photo_url);
  if (src) {
    return <img src={src} alt="" className={`${className} object-cover border border-border shrink-0`} />;
  }
  return (
    <div className={`${className} bg-primary/10 text-primary font-bold flex items-center justify-center border border-border shrink-0`}>
      {initialsOf(student.full_name)}
    </div>
  );
};

// "Upload / change photo" for an existing student; saves straight to their record.
export const StudentPhotoButton: React.FC<{ student: Student; onChanged: (photoUrl: string) => void }> = ({ student, onChanged }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadStudentPhoto(student.id, file);
      await campusApi.updateStudent(student.id, { photo_url: url });
      if (student.photo_url) await deletePortalFile(student.photo_url).catch(() => undefined);
      onChanged(url);
      toast.success('Photo updated. It now appears on the ID card.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()} className="h-7 text-xs gap-1">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        {student.photo_url ? 'Change photo' : 'Upload photo'}
      </Button>
    </>
  );
};
