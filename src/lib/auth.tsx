'use client';
// Real accounts (Supabase Auth, email + password). Wraps the whole app; pages read the user and profile with useAuth().
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from './db/client';
import { getProfile } from './db/queries';
import { post } from './post';
import type { AccountType, Profile } from './types';

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  loading: boolean; // true until we know whether someone is signed in
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (v: { email: string; password: string; fullName: string; phone: string; accountType: AccountType }) => Promise<Profile>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = (): AuthCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
};

/** Where each kind of account lands after signing in. */
export const HOME: Record<AccountType, string> = { coordinator: '/events', volunteer: '/v', attendee: '/a' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); return null; }
    try { const p = await getProfile(u.id); setProfile(p); return p; } catch { setProfile(null); return null; }
  }, []);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      // defer: calling supabase inside this callback can deadlock the auth lock
      setTimeout(() => { void loadProfile(session?.user ?? null); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
    const p = await loadProfile(data.user);
    if (!p) throw new Error('No profile found for this account. Please create an account first.');
    return p;
  }, [loadProfile]);

  const signUp = useCallback(async (v: { email: string; password: string; fullName: string; phone: string; accountType: AccountType }) => {
    await post('/api/auth/signup', v); // creates the account (no email confirmation needed) and the profile
    return signIn(v.email, v.password);
  }, [signIn]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(async () => { await loadProfile(user); }, [loadProfile, user]);

  const value = useMemo(() => ({ user, profile, loading, signIn, signUp, signOut, reloadProfile }), [user, profile, loading, signIn, signUp, signOut, reloadProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Guard for a signed-in area. Sends signed-out people to /login and people with the wrong account type to their own home.
 * Returns the profile once it is safe to render, otherwise null.
 */
export function useRequireAccount(type: AccountType): Profile | null {
  const { profile, user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    else if (profile && profile.account_type !== type) router.replace(HOME[profile.account_type]);
  }, [loading, user, profile, type, router]);
  return !loading && profile?.account_type === type ? profile : null;
}
