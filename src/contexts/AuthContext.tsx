import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, getSessionToken, setSessionToken } from '@/db/supabase';
import type { UserRole } from '@/types/campus';

export interface PortalUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  student_id?: string | null;   // student & parent accounts
  lecturer_id?: string | null;  // lecturer accounts
  student_name?: string | null;
  lecturer_name?: string | null;
}

interface AuthContextType {
  user: PortalUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null; user?: PortalUser }>;
  signOut: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSessionToken()) {
      setLoading(false);
      return;
    }
    supabase
      .rpc('me')
      .then(({ data, error }) => {
        if (error || !data) {
          setSessionToken(null);
          setUser(null);
        } else {
          setUser(data as PortalUser);
        }
      })
      .then(() => setLoading(false));
  }, []);

  const signIn = async (username: string, password: string) => {
    const { data, error } = await supabase.rpc('sign_in', { p_username: username, p_password: password });
    if (error) return { error: error.message };
    const result = data as { token?: string; user?: PortalUser; error?: string };
    if (result.error || !result.token || !result.user) return { error: result.error || 'Sign in failed.' };
    setSessionToken(result.token);
    setUser(result.user);
    return { error: null, user: result.user };
  };

  const signOut = async () => {
    await supabase.rpc('sign_out');
    setSessionToken(null);
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    const { error } = await supabase.rpc('change_password', { p_old: oldPassword, p_new: newPassword });
    return { error: error ? error.message : null };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
