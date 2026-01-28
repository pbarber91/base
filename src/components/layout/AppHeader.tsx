// src/components/layout/AppHeader.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import UserAvatar from "@/components/shared/UserAvatar";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppHeader() {
  const { user, profile, isAdmin, signInWithPassword, signInWithMagicLink, signOut, loading } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  // Where to return after login (best-effort)
  const returnTo = useMemo(() => location.pathname + location.search + location.hash, [location]);

  useEffect(() => {
    if (!authOpen) {
      setMsg(null);
      setBusy(false);
      setMode("password");
      setPassword("");
      // keep email (nice UX)
    }
  }, [authOpen]);

  const displayEmail = profile?.email ?? user?.email ?? "";

  // Base44 profile by email (where display_name/avatar_url may still live in some areas)
  const { data: base44Profile } = useQuery({
    queryKey: ["header-profile", displayEmail],
    queryFn: async () => {
      const e = displayEmail?.trim();
      if (!e) return null;
      const res = await base44.entities.UserProfile.filter({ user_email: e }, null, 1);
      return res?.[0] ?? null;
    },
    enabled: !!displayEmail,
    staleTime: 30_000,
  });

  const displayName =
    base44Profile?.display_name?.trim() ||
    (profile as any)?.display_name?.trim?.() ||
    (profile as any)?.full_name?.trim?.() ||
    (user as any)?.user_metadata?.full_name?.trim?.() ||
    (user as any)?.user_metadata?.name?.trim?.() ||
    (user as any)?.user_metadata?.display_name?.trim?.() ||
    displayEmail ||
    "Account";

  const avatarUrl = base44Profile?.avatar_url ?? (profile as any)?.avatar_url ?? undefined;

  // Brand assets (Option A: public/brand/*)
  const BRAND_ICON = "/brand/icon.png";
  const BRAND_WORDMARK = "/brand/logo-horizontal.png";

  const openLogin = () => setAuthOpen(true);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const eaddr = email.trim();
    if (!eaddr) {
      setMsg("Please enter an email address.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "password") {
        if (!password) {
          setMsg("Please enter your password.");
          setBusy(false);
          return;
        }
        await signInWithPassword({ email: eaddr, password });
        setAuthOpen(false);
        setBusy(false);
        navigate(returnTo, { replace: true });
      } else {
        await signInWithMagicLink({ email: eaddr });
        setMsg("Magic link sent. Check your email.");
        setBusy(false);
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setMobileOpen(false);
    } finally {
      setSigningOut(false);
    }
  };

  const navLinks = [
    { to: "/Home", label: "Home" },
    { to: "/Studies", label: "Studies" },
    { to: "/Courses", label: "Courses" },
    { to: "/Groups", label: "Groups" },
    { to: "/Community", label: "Community" },
  ];

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link className="flex items-center gap-3" to="/Home" onClick={() => setMobileOpen(false)}>
            <img
              src={BRAND_ICON}
              alt="Formation Initiative"
              className="h-9 w-9 rounded-xl object-contain"
              loading="eager"
              onError={(e) => {
                // if the image path is wrong, avoid a broken image icon taking over layout
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />

            {/* Wordmark on sm+ */}
            <img
              src={BRAND_WORDMARK}
              alt="Formation Initiative"
              className="h-7 hidden sm:block object-contain"
              loading="eager"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:block">
            <nav className="flex items-center gap-1">
              {navLinks.map((l) => {
                const active = location.pathname.toLowerCase().startsWith(l.to.toLowerCase());
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={cx(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      active ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}

              {user && isAdmin && (
                <Link
                  to="/admin"
                  className={cx(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    location.pathname.toLowerCase().startsWith("/admin")
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={cx("flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all", "hover:bg-slate-50")}
                  title="Go to profile"
                >
                  <UserAvatar name={displayName} imageUrl={avatarUrl} size="sm" />
                  <span className="text-sm text-slate-700 font-medium max-w-[220px] truncate">{displayName}</span>
                </Link>

                <button
                  onClick={doSignOut}
                  disabled={signingOut || loading}
                  className={cx(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    "h-9 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className={cx(
                  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500",
                  "h-9 px-4 py-2 bg-amber-600 text-white hover:bg-amber-700"
                )}
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            <button
              className={cx(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500",
                "h-9 w-9 lg:hidden hover:bg-slate-100"
              )}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden pb-4">
            <nav className="flex flex-col gap-1 pt-2">
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <UserAvatar name={displayName} imageUrl={avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate">{displayName}</div>
                    {displayEmail && <div className="text-xs text-slate-500 truncate">{displayEmail}</div>}
                  </div>
                </Link>
              )}

              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {l.label}
                </Link>
              ))}

              {user && isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Admin
                </Link>
              )}

              <div className="pt-2 border-t border-slate-100 mt-2">
                {user ? (
                  <button
                    onClick={doSignOut}
                    disabled={signingOut || loading}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      openLogin();
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Sign-in modal */}
      {authOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setAuthOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
                <p className="text-sm text-slate-500">Enter Password or send yourself a magic link!</p>
              </div>
              <button
                onClick={() => !busy && setAuthOpen(false)}
                className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("password")}
                className={cx(
                  "flex-1 h-9 rounded-lg text-sm font-medium border",
                  mode === "password"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-white border-slate-200 text-slate-700"
                )}
                disabled={busy}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMode("magic")}
                className={cx(
                  "flex-1 h-9 rounded-lg text-sm font-medium border",
                  mode === "magic"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-white border-slate-200 text-slate-700"
                )}
                disabled={busy}
              >
                Magic link
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              {mode === "password" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              )}

              {msg && <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">{msg}</div>}

              <button
                type="submit"
                disabled={busy}
                className={cx(
                  "w-full h-10 rounded-lg text-sm font-semibold",
                  "bg-amber-600 text-white hover:bg-amber-700",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                {busy ? "Working..." : mode === "password" ? "Sign In" : "Send Magic Link"}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
