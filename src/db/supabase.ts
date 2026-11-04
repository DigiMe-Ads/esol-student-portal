import { createClient } from '@supabase/supabase-js';

// The portal shares the ESOL HR Suite Supabase project but only ever touches the student_portal schema.
// It does not use Supabase Auth: the signed-in session is an opaque token from student_portal.sign_in,
// sent on every request as the x-portal-session header, which the schema's RLS policies check.
//
// Requests go to /supabase on the portal's own domain (vercel.json / vite.config.ts forward them to the
// project), so browsers on networks that can't reach *.supabase.co still work. Set
// VITE_SUPABASE_DIRECT=true to call VITE_SUPABASE_URL directly instead.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_DIRECT === 'true'
    ? import.meta.env.VITE_SUPABASE_URL
    : `${window.location.origin}/supabase`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const PORTAL_SCHEMA = 'student_portal';
const SESSION_STORAGE_KEY = 'esol-student-portal.session';

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

let sessionToken: string | null = readStoredToken();

export function getSessionToken(): string | null {
  return sessionToken;
}

export function setSessionToken(token: string | null) {
  sessionToken = token;
  try {
    if (token) localStorage.setItem(SESSION_STORAGE_KEY, token);
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // storage blocked (private mode): the session just won't survive a reload
  }
}

const portalFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers);
  if (sessionToken) headers.set('x-portal-session', sessionToken);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: PORTAL_SCHEMA },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'esol-student-portal.auth',
  },
  global: { fetch: portalFetch },
});
