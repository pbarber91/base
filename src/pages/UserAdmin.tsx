// src/pages/UserAdmin.tsx
import React, { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GradientCard from "@/components/ui/GradientCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Save } from "lucide-react";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  church_id: string | null;
  profile_completed_at?: string | null;
};

type ChurchRow = { id: string; name: string | null };

export default function UserAdmin() {
  const { supabase } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: churches = [] } = useQuery<ChurchRow[]>({
    queryKey: ["admin-churches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const { data: profiles = [], isLoading } = useQuery<ProfileRow[]>({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,role,church_id,profile_completed_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any;
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

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return profiles.find((p) => p.id === selectedId) ?? null;
  }, [profiles, selectedId]);

  const [editRole, setEditRole] = useState<string>("user");
  const [editChurchId, setEditChurchId] = useState<string>("");

  React.useEffect(() => {
    if (!selected) return;
    setEditRole(String(selected.role ?? "user"));
    setEditChurchId(selected.church_id ?? "");
  }, [selected?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No user selected");

      const { error } = await supabase
        .from("profiles")
        .update({
          role: editRole || "user",
          church_id: editChurchId ? editChurchId : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold">User Admin</h1>
              <p className="text-slate-200 mt-1">Manage users, roles, and church assignment.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GradientCard variant="warm" className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Users</h2>
                <p className="text-sm text-slate-600">Select a user to edit.</p>
              </div>
              <div className="w-64">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name..." />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-slate-600">No users found.</div>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, 200).map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={[
                        "w-full text-left p-3 rounded-xl border transition",
                        active ? "bg-white border-amber-200 shadow-sm" : "bg-white/60 border-slate-200 hover:bg-white",
                      ].join(" ")}
                    >
                      <div className="font-medium text-slate-900">{p.display_name || "(no name)"}</div>
                      <div className="text-xs text-slate-500 truncate">{p.email || "(no email)"}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        role: <span className="font-medium">{p.role ?? "user"}</span> ·{" "}
                        {p.profile_completed_at ? "profile complete" : "needs setup"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GradientCard>

          <GradientCard variant="purple" className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Edit</h2>
            <p className="text-sm text-slate-600 mb-4">Update role and church assignment.</p>

            {!selected ? (
              <div className="text-slate-600">Select a user on the left.</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-sm text-slate-600">User</div>
                  <div className="font-semibold text-slate-900">{selected.display_name || "(no name)"}</div>
                  <div className="text-xs text-slate-500">{selected.email || "(no email)"}</div>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="superadmin">superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Note: church_members.role is separate (owner/admin/member). This is global platform role.
                  </p>
                </div>

                <div>
                  <Label>Primary Church</Label>
                  <Select value={editChurchId || ""} onValueChange={setEditChurchId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a church" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {churches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name ?? "Unnamed church"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 gap-2"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                  >
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>

                {save.isError ? (
                  <pre className="text-xs bg-white border rounded-lg p-3 overflow-auto text-red-700">
                    {String((save.error as any)?.message ?? save.error)}
                  </pre>
                ) : null}
              </div>
            )}
          </GradientCard>
        </div>
      </div>
    </div>
  );
}
