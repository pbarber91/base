// src/pages/ChurchInvite.tsx
import React, { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";

type ChurchRow = { id: string; name: string | null };
type InviteRow = {
  id: string;
  church_id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
};

export default function ChurchInvite() {
  const { supabase, user, profile } = useAuth();
  const qc = useQueryClient();

  const [churchId, setChurchId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isGlobalAdmin = useMemo(() => {
    const r = String((profile as any)?.role ?? "").toLowerCase();
    return r === "admin" || r === "superadmin";
  }, [profile]);

  const { data: myChurches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["invite-churches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // If global admin, allow selecting from all churches; otherwise only churches they admin/own
      if (isGlobalAdmin) {
        const { data, error } = await supabase.from("churches").select("id,name").order("name");
        if (error) throw error;
        return (data ?? []) as any;
      }

      // Non-global: join via church_members
      const { data: memberships, error: memErr } = await supabase
        .from("church_members")
        .select("church_id, role")
        .eq("user_id", user!.id);

      if (memErr) throw memErr;

      const adminChurchIds = (memberships ?? [])
        .filter((m: any) => m.role === "owner" || m.role === "admin")
        .map((m: any) => m.church_id);

      if (adminChurchIds.length === 0) return [];

      const { data: churches, error: chErr } = await supabase
        .from("churches")
        .select("id,name")
        .in("id", adminChurchIds)
        .order("name");

      if (chErr) throw chErr;
      return (churches ?? []) as any;
    },
  });

  // Default church selection
  React.useEffect(() => {
    if (!churchId && myChurches.length === 1) setChurchId(myChurches[0].id);
  }, [myChurches, churchId]);

  const { data: invites = [], isLoading: loadingInvites } = useQuery<InviteRow[]>({
    queryKey: ["church-invites", churchId],
    enabled: !!user?.id && !!churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_invites")
        .select("id,church_id,email,role,token,created_at,accepted_at,expires_at")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!churchId) throw new Error("Choose a church");
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Enter an email");

      const token = crypto.randomUUID();

      const { data, error } = await supabase
        .from("church_invites")
        .insert({
          church_id: churchId,
          email: cleanEmail,
          role, // church_role enum string
          token,
          created_by: user.id,
        })
        .select("id,church_id,email,role,token,created_at,accepted_at,expires_at")
        .single();

      if (error) throw error;
      return data as any as InviteRow;
    },
    onSuccess: async () => {
      setEmail("");
      setRole("member");
      await qc.invalidateQueries({ queryKey: ["church-invites", churchId] });
    },
  });

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1200);
    } catch {
      // ignore
    }
  };

  const selectedChurchName = useMemo(() => {
    return myChurches.find((c) => c.id === churchId)?.name ?? null;
  }, [myChurches, churchId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-serif font-bold">Invite Members</h1>
              <p className="text-slate-200 mt-1">
                Create invite tokens for members to join your church.
              </p>
            </div>
            <Link to="/church-admin">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/15">
                Back to Church Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <GradientCard variant="warm" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label>Church</Label>
              <Select value={churchId} onValueChange={setChurchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingChurches ? "Loading..." : "Select a church"} />
                </SelectTrigger>
                <SelectContent>
                  {myChurches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name ?? "Unnamed church"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {myChurches.length === 0 && !loadingChurches ? (
                <p className="text-xs text-slate-500 mt-2">
                  You don’t appear to be an owner/admin of any churches yet.
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Invite email</Label>
                  <Input
                    className="mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="person@example.com"
                    disabled={!churchId || createInvite.isPending}
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1" disabled={!churchId || createInvite.isPending}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                  onClick={() => createInvite.mutate()}
                  disabled={!churchId || createInvite.isPending}
                >
                  {createInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Create Invite
                </Button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                For now this generates a token you can send to someone. Next step is wiring a “Redeem Invite” flow.
              </p>
            </div>
          </div>
        </GradientCard>

        <GradientCard variant="purple" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Invites</h2>
              <p className="text-sm text-slate-600">
                {selectedChurchName ? `Church: ${selectedChurchName}` : "Select a church to view invites."}
              </p>
            </div>
          </div>

          {!churchId ? (
            <div className="text-slate-600">Choose a church above.</div>
          ) : loadingInvites ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-slate-600">No invites yet.</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{inv.email}</div>
                    <div className="text-xs text-slate-500">
                      role: <span className="font-medium">{inv.role}</span> ·{" "}
                      {inv.accepted_at ? (
                        <span className="text-emerald-700">accepted</span>
                      ) : (
                        <span className="text-amber-700">pending</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleCopy(inv.token)}
                    title="Copy token"
                  >
                    {copiedToken === inv.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedToken === inv.token ? "Copied" : "Copy Token"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GradientCard>
      </div>
    </div>
  );
}
