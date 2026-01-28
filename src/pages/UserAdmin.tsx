import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X, Save } from "lucide-react";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio?: string | null;
  faith_journey_stage?: string | null;
  church_id: string | null;
  profile_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChurchRow = {
  id: string;
  name: string | null;
};

export default function UserAdmin() {
  const { supabase } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [edit, setEdit] = useState<Partial<ProfileRow>>({});

  const { data: churches = [], isLoading: loadingChurches } = useQuery({
    queryKey: ["admin-churches"],
    queryFn: async (): Promise<ChurchRow[]> => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name");
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const { data: profiles = [], isLoading: loadingProfiles, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,role,bio,faith_journey_stage,church_id,profile_completed_at,created_at,updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter((p) => {
      const email = (p.email ?? "").toLowerCase();
      const name = (p.display_name ?? "").toLowerCase();
      return email.includes(s) || name.includes(s);
    });
  }, [profiles, q]);

  const churchMap = useMemo(() => {
    const m: Record<string, ChurchRow> = {};
    for (const c of churches) m[c.id] = c;
    return m;
  }, [churches]);

  const updateUser = useMutation({
    mutationFn: async (patch: Partial<ProfileRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: patch.display_name ?? null,
          role: patch.role ?? null,
          church_id: patch.church_id ? String(patch.church_id) : null,
          faith_journey_stage: (patch as any).faith_journey_stage ?? null,
          bio: (patch as any).bio ?? null,
        })
        .eq("id", patch.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as any as ProfileRow;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(saved);
      setEdit({});
    },
  });

  const openUser = (p: ProfileRow) => {
    setSelected(p);
    setEdit({
      display_name: p.display_name ?? "",
      role: p.role ?? "user",
      church_id: p.church_id ?? "",
      faith_journey_stage: (p as any).faith_journey_stage ?? "growing",
      bio: (p as any).bio ?? "",
    });
  };

  const closePanel = () => {
    setSelected(null);
    setEdit({});
  };

  if (loadingProfiles || loadingChurches) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-2xl w-full px-6">
          <GradientCard variant="warm" className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">User Admin Error</h2>
            <pre className="text-xs bg-white border rounded-lg p-4 overflow-auto">
              {String((error as any)?.message ?? error)}
            </pre>
          </GradientCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/15 text-white border-0">Admin</Badge>
                <Badge className="bg-white/15 text-white border-0">Users</Badge>
              </div>
              <h1 className="text-3xl font-serif font-bold">User Admin</h1>
              <p className="text-amber-50/90 mt-1">Search users and edit profile fields.</p>
            </div>

            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/80" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or email…"
                  className="pl-9 bg-white/15 border-white/20 text-white placeholder:text-white/70"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <GradientCard variant="cool" className="p-0 lg:col-span-1 overflow-hidden">
            <div className="p-4 border-b bg-white">
              <div className="text-sm text-slate-600">{filtered.length} users</div>
            </div>

            <div className="divide-y bg-white">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => openUser(p)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {p.display_name || "(no display name)"}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{p.email || "(no email)"}</div>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 border-0">
                      {p.role || "user"}
                    </Badge>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Church:{" "}
                    <span className="text-slate-700">
                      {p.church_id && churchMap[p.church_id]
                        ? churchMap[p.church_id].name ?? p.church_id
                        : p.church_id
                        ? "Unknown"
                        : "None"}
                    </span>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No users match your search.
                </div>
              )}
            </div>
          </GradientCard>

          <GradientCard variant="warm" className="p-6 lg:col-span-2">
            {!selected ? (
              <div className="text-center py-16">
                <div className="text-slate-800 font-semibold">Select a user</div>
                <div className="text-slate-500 text-sm mt-2">
                  Click a user on the left to edit their profile.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-slate-900 truncate">
                      {selected.display_name || "(no display name)"}
                    </div>
                    <div className="text-sm text-slate-600 truncate">{selected.email || "(no email)"}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      id: <span className="font-mono">{selected.id}</span>
                    </div>
                  </div>

                  <Button variant="outline" onClick={closePanel} className="gap-2">
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={(edit.display_name as any) ?? ""}
                      onChange={(e) => setEdit((d) => ({ ...d, display_name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Role</Label>
                    <Select
                      value={(edit.role as any) ?? "user"}
                      onValueChange={(v) => setEdit((d) => ({ ...d, role: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="superadmin">superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Church</Label>
                    <Select
                      value={(edit.church_id as any) ?? ""}
                      onValueChange={(v) => setEdit((d) => ({ ...d, church_id: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a church" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {churches.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name ?? c.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      This sets the user’s primary church on their profile.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={() => updateUser.mutate({ id: selected.id, ...(edit as any) })}
                    disabled={updateUser.isPending}
                    className="gap-2"
                  >
                    {updateUser.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>

                  {updateUser.isError && (
                    <div className="mt-3 text-sm text-red-600">
                      {String((updateUser.error as any)?.message ?? updateUser.error)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </GradientCard>
        </div>
      </div>
    </div>
  );
}
