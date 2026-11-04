import React, { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/contexts/AuthRoleContext';
import { routes } from '@/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const LoginPage: React.FC = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signingIn = useRef(false);

  // already signed in when the page opened (not mid-login): go home
  if (user && !signingIn.current) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    signingIn.current = true;
    const result = await signIn(username, password);
    if (result.error) signingIn.current = false;
    setSubmitting(false);
    if (result.error || !result.user) {
      setError(result.error ?? 'Sign in failed.');
      return;
    }
    // Go back to the page that sent us here only if this account may open it; otherwise its home.
    const allowed = USER_ROLES.find((r) => r.id === result.user!.role)?.allowedNav ?? [];
    const target = routes.find((r) => r.path === from);
    const ok = target && (allowed.includes('*') || allowed.includes(target.navKey));
    navigate(ok ? from : '/', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-lg shadow-sm">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg tracking-tight text-foreground">ESOL PREMIER</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              CAMPUS SRI LANKA
            </span>
          </div>
        </div>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-serif">Sign in to the campus portal</CardTitle>
            <CardDescription className="text-xs">Use the portal account issued by your administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">Username</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    autoFocus
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
