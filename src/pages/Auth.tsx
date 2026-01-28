// src/pages/Auth.tsx
import React, { useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Auth() {
  const { user, signInWithMagicLink } = useAuth();
  const qp = useQueryParams();

  const redirect = qp.get("redirect") || createPageUrl("Home");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSend = async () => {
    setErr(null);
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setErr("Please enter a valid email address.");
      return;
    }

    try {
      setSending(true);
      // Supabase will create the user on first login (if sign-ups enabled).
      await signInWithMagicLink({ email: e, redirectTo: window.location.origin + redirect });
      setSent(true);
    } catch (ex: any) {
      setErr(ex?.message ?? "Failed to send sign-in link.");
    } finally {
      setSending(false);
    }
  };

  // If already logged in, just go where they intended.
  if (user) {
    window.location.href = redirect;
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="mb-6">
          <Link to={createPageUrl("GetStarted")} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <GradientCard variant="warm" className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Mail className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-800">Sign in/Sign up</h1>
              <p className="text-sm text-slate-600">First time? Same flow—your account is created automatically!</p>
            </div>
          </div>

          {sent ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-700">
                A sign-in link has been sent to:
              </div>
              <div className="font-medium text-slate-900 break-all">{email.trim()}</div>
              <div className="text-xs text-slate-500">
                Open your email and click the link. You’ll be returned here and redirected automatically.
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Send another link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                  autoComplete="email"
                />
              </div>

              {err ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>
              ) : null}

              <Button onClick={handleSend} disabled={sending} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Email me a sign-in link
              </Button>

              
            </div>
          )}
        </GradientCard>
      </div>
    </div>
  );
}
