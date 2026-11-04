import React, { useEffect, useState } from 'react';
import { KeyRound, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth, type PortalUser } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/contexts/AuthRoleContext';
import type { AuditLog, Lecturer, Student, UserRole } from '@/types/campus';
import { campusApi } from '@/services/campusApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const roleLabel = (role: string) => USER_ROLES.find((r) => r.id === role)?.label ?? role;

export const ChangePasswordCard: React.FC = () => {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setSaving(true);
    const { error } = await changePassword(oldPassword, newPassword);
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    setOldPassword('');
    setNewPassword('');
    setConfirm('');
    toast.success('Password changed. Other devices have been signed out.');
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Change Password
        </CardTitle>
        <CardDescription className="text-xs">Update the password for the account you are signed in with</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current password</Label>
            <Input type="password" autoComplete="current-password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New password (min 8)</Label>
            <Input type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm new password</Label>
            <Input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={saving}>Update Password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const PortalAccountsCard: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PortalUser[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('admissions');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkId, setLinkId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const needsStudent = role === 'student' || role === 'parent';
  const needsLecturer = role === 'lecturer';

  useEffect(() => {
    campusApi.getStudents().then(setStudents).catch(() => setStudents([]));
    campusApi.getLecturers().then(setLecturers).catch(() => setLecturers([]));
  }, []);
  useEffect(() => setLinkId(''), [role]);

  const load = async () => {
    const { data, error } = await supabase.rpc('list_users');
    if (error) toast.error(error.message);
    else setAccounts((data as PortalUser[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((needsStudent || needsLecturer) && !linkId) {
      toast.error(needsLecturer ? 'Choose the lecturer record this login belongs to.' : 'Choose the student this login belongs to.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('create_user', {
      p_username: username,
      p_display_name: displayName,
      p_role: role,
      p_password: password,
      p_student: needsStudent ? linkId : null,
      p_lecturer: needsLecturer ? linkId : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Account "${username}" created.`);
    setUsername('');
    setDisplayName('');
    setPassword('');
    load();
  };

  const handleReset = async (account: PortalUser) => {
    const next = window.prompt(`New password for ${account.username} (min 8 characters):`);
    if (!next) return;
    const { error } = await supabase.rpc('reset_user_password', { p_user: account.id, p_password: next });
    if (error) toast.error(error.message);
    else toast.success(`Password reset for ${account.username}. They have been signed out everywhere.`);
  };

  const handleDelete = async (account: PortalUser) => {
    if (!window.confirm(`Delete the portal account "${account.username}"?`)) return;
    const { error } = await supabase.rpc('delete_user', { p_user: account.id });
    if (error) toast.error(error.message);
    else {
      toast.success(`Account ${account.username} deleted.`);
      load();
    }
  };

  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Portal Accounts
        </CardTitle>
        <CardDescription className="text-xs">
          Sign-in accounts for this portal. Each account is locked to its role; only Super Admins can preview other roles.
        </CardDescription>
      </CardHeader>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground">
            <tr>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="py-3 px-4 font-mono font-semibold text-foreground">{a.username}</td>
                <td className="py-3 px-4">{a.display_name}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{roleLabel(a.role)}</Badge>
                  {(a.student_name || a.lecturer_name) && <div className="text-[10px] text-muted-foreground mt-0.5">↳ {a.student_name ?? a.lecturer_name}</div>}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleReset(a)}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                  {a.id !== user?.id && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(a)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CardContent className="pt-4 border-t border-border">
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <Input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. finance.desk" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(needsStudent || needsLecturer) && (
            <div className="space-y-1.5">
              <Label className="text-xs">{needsLecturer ? 'Lecturer record' : 'Student'}</Label>
              <Select value={linkId} onValueChange={setLinkId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Link to…" /></SelectTrigger>
                <SelectContent>
                  {needsLecturer
                    ? lecturers.map((l) => <SelectItem key={l.id} value={l.id} className="text-xs">{l.lecturer_id} – {l.full_name}</SelectItem>)
                    : students.map((st) => <SelectItem key={st.id} value={st.id} className="text-xs">{st.student_number} – {st.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Password (min 8)</Label>
            <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            <UserPlus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export const AuditLogCard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    campusApi.getAuditLogs(200).then(setLogs).catch((err) => toast.error(err.message)).finally(() => setLoading(false));
  }, []);
  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground">Audit Trail</CardTitle>
        <CardDescription className="text-xs">Every change to students, finance, exams, accounts and more, written by the database. Entries cannot be edited or deleted.</CardDescription>
      </CardHeader>
      <div className="w-full overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/80 text-[10px] uppercase font-mono text-muted-foreground sticky top-0">
            <tr><th className="py-2 px-3">When</th><th className="py-2 px-3">Who</th><th className="py-2 px-3">Action</th><th className="py-2 px-3">Record</th><th className="py-2 px-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 && <tr><td colSpan={5} className="py-4 px-3 text-muted-foreground italic">{loading ? 'Loading…' : 'No entries.'}</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 px-3 font-mono whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="py-2 px-3">{l.user_role}</td>
                <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">{l.action}</Badge></td>
                <td className="py-2 px-3">{l.entity_type}</td>
                <td className="py-2 px-3 text-muted-foreground">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
