// src/pages/AcceptInvite.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AcceptInvite() {
  const { user, supabase, loading } = useAuth();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [setPrimary, setSetPrimary] = useState(true);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (loading) return;

    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    if (!user) {
      const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
      window.location.href = `/auth?redirect=${encodeURIComponent(returnTo)}`;
      return;
    }
  }, [loading, user, token]);

  const accept = async () => {
    if (!user) return;
    setStatus("working");
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("accept_church_invite", {
        invite_token: token,
        set_primary: setPrimary,
      });

      if (error) throw error;

      setStatus("done");
      setMessage("Invite accepted! You’ve been added to the church.");
      return data;
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "Failed to accept invite.");
    }
  };

  useEffect(() => {
    if (!user || loading) return;
    if (!token) return;
    // auto-accept once authenticated
    if (status === "idle") void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, token]);

  if (loading || (user && (status === "idle" || status === "working"))) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto" />
          <div className="mt-4 text-slate-700">Accepting invite…</div>
        </GradientCard>
      </div>
    );
  }

  if (!user) {
    // Redirect handled in effect; show fallback
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto" />
          <div className="mt-4 text-slate-700">Redirecting to sign in…</div>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <GradientCard className="p-8 max-w-xl w-full">
        {status === "done" ? (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-serif font-bold text-slate-900 mt-3">You’re in!</h1>
            <p className="text-slate-600 mt-2">{message}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl("Profile")}>
                <Button className="bg-amber-600 hover:bg-amber-700">Go to Profile</Button>
              </Link>
              <Link to={createPageUrl("Home")}>
                <Button variant="outline">Home</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
            <h1 className="text-2xl font-serif font-bold text-slate-900 mt-3">Invite problem</h1>
            <p className="text-slate-600 mt-2">{message || "Something went wrong."}</p>

            <div className="mt-6 text-left max-w-sm mx-auto">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={setPrimary} onChange={(e) => setSetPrimary(e.target.checked)} />
                Set this as my primary church
              </label>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={accept} className="bg-amber-600 hover:bg-amber-700">
                Try Again
              </Button>
              <Link to={createPageUrl("Home")}>
                <Button variant="outline">Home</Button>
              </Link>
            </div>
          </div>
        )}
      </GradientCard>
    </div>
  );
}
