import React from 'react';
import type { Student } from '@/types/campus';

// Student photo, or their initials when no photo is on file.
export const StudentAvatar: React.FC<{ student: Pick<Student, 'full_name' | 'photo_url'>; className?: string }> = ({ student, className = 'w-7 h-7 rounded-full text-[10px]' }) => {
  if (student.photo_url) {
    return <img src={student.photo_url} alt="" className={`${className} object-cover border border-border shrink-0`} />;
  }
  const initials = student.full_name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${className} bg-primary/10 text-primary font-bold flex items-center justify-center border border-border shrink-0`}>
      {initials}
    </div>
  );
};
