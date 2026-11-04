import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'email' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  wide?: boolean; // spans both columns
  min?: number;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initial: Record<string, string | number>;
  submitLabel: string;
  onSubmit: (values: Record<string, string | number>) => Promise<unknown>;
  successMessage: string;
}

// Small two-column create/edit form in a dialog. Number fields come back as numbers; empty
// optional fields come back as null-ish empty strings for the caller to drop.
export const FormDialog: React.FC<FormDialogProps> = ({
  open, onOpenChange, title, description, fields, initial, submitLabel, onSubmit, successMessage,
}) => {
  const [values, setValues] = useState<Record<string, string | number>>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && (values[f.name] === '' || values[f.name] === undefined));
    if (missing) {
      toast.error(`${missing.label} is required.`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      toast.success(successMessage);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message?.includes('duplicate key') ? 'That code or name is already in use.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (name: string, v: string | number) => setValues((prev) => ({ ...prev, [name]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg text-xs max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold">{title}</DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name} className={`space-y-1 ${f.wide || f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <Label className="text-xs">{f.label}{f.required && ' *'}</Label>
                {f.type === 'select' ? (
                  <Select value={String(values[f.name] ?? '')} onValueChange={(v) => set(f.name, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={f.placeholder ?? 'Select'} /></SelectTrigger>
                    <SelectContent className="text-xs">
                      {(f.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === 'textarea' ? (
                  <Textarea rows={3} value={String(values[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className="text-xs" />
                ) : (
                  <Input
                    type={f.type ?? 'text'}
                    min={f.min}
                    value={values[f.name] ?? ''}
                    onChange={(e) => set(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={f.placeholder}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// drop empty strings so optional columns stay NULL
export const clean = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined));
