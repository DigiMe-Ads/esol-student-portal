import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  name: string;            // e.g. "Nethmi Jayasinghe"
  confirmCode: string;     // must be typed back, e.g. the student number
  codeLabel: string;       // "student number" / "staff ID"
  loadSummary: () => Promise<Record<string, number>>;
  summaryLabels: Record<string, string>;
  note?: string;
  onConfirm: (typed: string) => Promise<void>;
  onDeleted: () => void;
}

// Permanent delete with a "what goes with it" list and the record's code typed back to confirm.
export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open, onOpenChange, title, name, confirmCode, codeLabel, loadSummary, summaryLabels, note, onConfirm, onDeleted,
}) => {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setSummary(null);
    loadSummary().then(setSummary).catch((err) => toast.error(err.message));
  }, [open]);

  const matches = typed.trim().toUpperCase() === confirmCode.toUpperCase();
  const linked = summary ? Object.entries(summaryLabels).filter(([k]) => (summary[k] ?? 0) > 0) : [];

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onConfirm(typed.trim());
      toast.success(`${name} was permanently deleted.`);
      onOpenChange(false);
      onDeleted();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            This permanently deletes <span className="font-semibold text-foreground">{name}</span> ({confirmCode}). It cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-1">
          <div className="font-semibold">Also deleted with it:</div>
          {!summary && <div className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking linked records…</div>}
          {summary && linked.length === 0 && <div className="text-muted-foreground">Nothing else; no linked records.</div>}
          {linked.map(([k, label]) => (
            <div key={k}>• {summary![k]} {label}</div>
          ))}
          {note && <div className="text-muted-foreground pt-1">{note}</div>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type the {codeLabel} <span className="font-mono font-bold">{confirmCode}</span> to confirm</Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmCode} className="h-8 text-xs font-mono" />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" disabled={!matches || busy || !summary} onClick={handleDelete} className="gap-1">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
