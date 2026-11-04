import React, { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { campusApi } from '@/services/campusApi';
import { deletePortalFile, materialTypeFor, MAX_UPLOAD_BYTES, uploadPortalFile } from '@/services/fileStorage';
import type { LMSCourse, LMSMaterial } from '@/types/campus';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: LMSCourse[];
  defaultCourseId?: string;
  heading?: string;
  onUploaded?: (material: LMSMaterial) => void;
}

export const UploadMaterialDialog: React.FC<UploadMaterialDialogProps> = ({
  open,
  onOpenChange,
  courses,
  defaultCourseId,
  heading = 'Upload Lesson Material',
  onUploaded,
}) => {
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setCourseId(defaultCourseId || courses[0]?.id || '');
      setTitle('');
      setDescription('');
      setFile(null);
    }
  }, [open, defaultCourseId, courses]);

  const handleFile = (f: File | null) => {
    if (f && f.size > MAX_UPLOAD_BYTES) {
      toast.error('File is larger than the 50 MB limit.');
      return;
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !courseId) return;
    setUploading(true);
    let stored: string | null = null;
    try {
      stored = await uploadPortalFile(file, `lms/${courseId}`);
      const material = await campusApi.createLMSMaterial({
        course_id: courseId,
        title: title.trim() || file.name,
        description: description.trim() || undefined,
        type: materialTypeFor(file),
        url: stored,
      });
      toast.success(`Uploaded "${material.title}" to the LMS.`);
      onUploaded?.(material);
      onOpenChange(false);
    } catch (err) {
      if (stored) await deletePortalFile(stored);
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{heading}</DialogTitle>
          <DialogDescription className="text-xs">
            PDFs, slides, documents or video, up to 50 MB. Files are private to signed-in portal users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">LMS course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.module?.code ? `${c.module.code} – ` : ''}{c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File</Label>
            <Input
              type="file"
              required
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*,video/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={uploading || !file || !courseId} className="gap-1.5">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
