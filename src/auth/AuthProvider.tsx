// AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

type ProfileLike = {
  id: string;
  email?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  church_id?: string | null;
  [key: string]: any;
};

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  profile: ProfileLike | null;
  loading: boolean;

  isAdmin: boolean;

  signInWithPassword: (args: { email: string; password: string }) => Promise<void>;
  signInWithMagicLink: (args: { email: string; redirectTo?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getEnv(name: string): string {
  const v = (import.meta as any).env?.[name];
  if (!v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

const supabaseUrl = getEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY");

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  const fetchProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }

    // Try to load profile from `profiles` table. If it doesn't exist, fail gracefully.
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (error) {
        // If RLS/table isn’t ready yet, don’t brick the app.
        setProfile({ id: u.id, email: u.email ?? null });
        return;
      }

      if (data) setProfile(data as ProfileLike);
      else setProfile({ id: u.id, email: u.email ?? null });
    } catch {
      setProfile({ id: u.id, email: u.email ?? null });
    }
  };

  const refreshProfile = async () => {
    await fetchProfile(supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : user);
  };

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sess = data.session ?? null;

        if (!mountedRef.current) return;

        setSession(sess);
        setUser(sess?.user ?? null);
        await fetchProfile(sess?.user ?? null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      // This is the reliable way to keep UI in sync on sign-in/sign-out.
      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      await fetchProfile(sess?.user ?? null);
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (profile?.is_admin === true) return true;
    if (typeof profile?.role === "string" && profile.role.toLowerCase() === "admin") return true;
    return false;
  }, [user, profile]);

  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  };

  const signInWithMagicLink = async ({ email, redirectTo }: { email: string; redirectTo?: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Make sign-out “reliable”:
    // 1) always clear UI state even if supabase call hangs/errors
    // 2) also remove local storage keys so refresh won’t resurrect a session
    setLoading(true);

    const hardClear = () => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      try {
        // supabase-js v2 stores tokens in localStorage with keys including "supabase.auth"
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.includes("supabase") && k.includes("auth")) {
            localStorage.removeItem(k);
          }
        }
      } catch {
        // ignore
      }
    };

    try {
      // Timeout so we never get stuck in "Signing out..."
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Sign out timed out")), 6000)),
      ]);
      hardClear();
    } catch {
      // Even if it errors/times out, we still hard-clear the app state.
      hardClear();
    }
  };

  const value: AuthContextValue = {
    supabase,
    session,
    user,
    profile,
    loading,
    isAdmin,
    signInWithPassword,
    signInWithMagicLink,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
