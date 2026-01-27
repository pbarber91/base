// AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";

type ProfileLike = {
  id: string;
  email?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  church_id?: string | null;

  // Added: lets the app reliably force onboarding when no row exists in `profiles`
  needs_setup?: boolean;

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

    // Start with a minimal profile shape
    let nextProfile: ProfileLike = { id: u.id, email: u.email ?? null };

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();

      if (error) {
        // If RLS/table isn't ready yet, don't brick the app.
        // Keep minimal profile (but DO NOT mark needs_setup here because we can't be sure)
        // eslint-disable-next-line no-console
        console.warn("Profile fetch error:", error.message);
      } else if (data) {
        nextProfile = { ...(data as any), needs_setup: false };
      } else {
        // No row exists => user must complete SetupProfile
        nextProfile.needs_setup = true;

        // Preserve admin hints from metadata if present
        if (u.user_metadata?.role) nextProfile.role = u.user_metadata.role;
        if (u.user_metadata?.is_admin != null) nextProfile.is_admin = u.user_metadata.is_admin;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Profile fetch exception:", err);
      // Keep minimal profile
    }

    if (!mountedRef.current) return;
    setProfile(nextProfile);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    await fetchProfile(data.user ?? null);
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

        // Important: stop blocking UI; profile loads async
        setLoading(false);

        void fetchProfile(sess?.user ?? null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Session check error:", err);
        if (mountedRef.current) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mountedRef.current) return;

      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      setLoading(false);

      void fetchProfile(sess?.user ?? null);
    });

    return () => {
      mountedRef.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;

    if (profile?.is_admin === true) return true;

    if (typeof profile?.role === "string") {
      const r = profile.role.toLowerCase();
      if (r === "admin" || r === "superadmin") return true;
    }

    const metaRole = String((user.user_metadata as any)?.role ?? "").toLowerCase();
    if (metaRole === "admin" || metaRole === "superadmin") return true;
    if ((user.user_metadata as any)?.is_admin === true) return true;

    const appRole = String((user.app_metadata as any)?.role ?? "").toLowerCase();
    if (appRole === "admin" || appRole === "superadmin") return true;
    if ((user.app_metadata as any)?.is_admin === true) return true;

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
    setLoading(true);

    const hardClear = () => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      try {
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
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Sign out timed out")), 6000)),
      ]);
      hardClear();
    } catch {
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
