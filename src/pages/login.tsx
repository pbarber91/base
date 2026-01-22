import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useRedirectTarget() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  return redirect && redirect.startsWith("/") ? redirect : "/";
}

export default function Login() {
  const navigate = useNavigate();
  const redirectTo = useRedirectTarget();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setMsg(err?.message ?? "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  const sendMagicLink = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Supabase will append the token params; your app should be loaded at this URL
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
      setMsg("Magic link sent! Check your email.");
    } catch (err: any) {
      setMsg(err?.message ?? "Unable to send magic link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Sign in</h1>
        <p className="text-slate-600 mt-1">Use your password, or send a magic link.</p>

        <form onSubmit={signInPassword} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>

          {msg && <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{msg}</div>}

          <Button type="submit" className="w-full bg-amber-400 hover:bg-amber-500" disabled={busy}>
            Sign in with password
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={sendMagicLink} disabled={busy || !email.trim()}>
            Send magic link
          </Button>
        </form>
      </div>
    </div>
  );
}
