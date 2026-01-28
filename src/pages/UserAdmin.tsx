// src/pages/UserAdmin.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Save, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio?: string | null;
  faith_journey_stage?: string | null;
  church_id?: string | null;
  profile_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChurchRow = { id: string; name: string };

export default function UserAdmin() {
  const { supabase, user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<ProfileRow>>({});

  const canView = !!user && !loading && isAdmin;

  const { data: churches = [], isLoading: churchesLoading } = useQuery<ChurchRow[]>({
    queryKey: ["admin-churches"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true }).limit(500);
      if (error) throw error;
      return (data as any[])?.map((c) => ({ id: String(c.id), name: String(c.name) })) ?? [];
    },
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<ProfileRow[]>({
    queryKey: ["admin-users", q],
    enabled: canView,
    queryFn: async () => {
      // Basic list; optionally filter client-side.
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,role,faith_journey_stage,church_id,profile_completed_at,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = (data as any[])?.map((r) => ({
        id: String(r.id),
        email: r.email ?? null,
        display_name: r.display_name ?? null,
        avatar_url: r.avatar_url ?? null,
        role: r.role ?? null,
        faith_journey_stage: r.faith_journey_stage ?? null,
        church_id: r.church_id ? String(r.church_id) : null,
        profile_completed_at: r.profile_completed_at ?? null,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
      })) as ProfileRow[];

      const needle = q.trim().toLowerCase();
      if (!needle) return rows;

      return rows.filter((r) => {
        const a = (r.email ?? "").toLowerCase();
        const b = (r.display_name ?? "").toLowerCase();
        return a.includes(needle) || b.includes(needle);
      });
    },
  });

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId]);

  const startEdit = (u: ProfileRow) => {
    setSelectedId(u.id);
    setEdit({
      display_name: u.display_name ?? "",
      role: u.role ?? "user",
      faith_journey_stage: u.faith_journey_stage ?? "growing",
      church_id: u.church_id ?? "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      const payload: any = {
        display_name: (edit.display_name ?? "") || null,
        role: (edit.role ?? "user") || "user",
        faith_journey_stage: (edit.faith_journey_stage ?? "growing") || null,
        church_id: edit.church_id ? String(edit.church_id) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", selectedUser.id);
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Admin</h1>
          <p className="text-slate-600 mb-6">Please sign in to access User Admin.</p>
          <Link to="/auth">
            <Button className="bg-amber-600 hover:bg-amber-700">Sign In</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Not allowed</h1>
          <p className="text-slate-600 mb-6">You don’t have permission to view this page.</p>
          <Link to={createPageUrl("Home")}>
            <Button>Back Home</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

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
              <p className="text-slate-200 text-sm">Search and manage users, roles, and church assignment.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: list */}
        <GradientCard className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1">
              <Label>Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or display name" className="mt-1" />
            </div>
          </div>

          {usersLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : usersError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {String((usersError as any)?.message ?? usersError)}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startEdit(u)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === u.id ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{u.display_name || "(No name)"}</div>
                      <div className="text-xs text-slate-600 truncate">{u.email || "(No email)"}</div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                      {u.role || "user"}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Profile complete:{" "}
                    <span className="font-medium">{u.profile_completed_at ? "yes" : "no"}</span>
                  </div>
                </button>
              ))}
              {users.length === 0 ? <div className="text-sm text-slate-500 py-6 text-center">No users found.</div> : null}
            </div>
          )}
        </GradientCard>

        {/* Right: editor */}
        <GradientCard className="p-6">
          {!selectedUser ? (
            <div className="text-slate-600 text-sm">Select a user to edit.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-semibold text-slate-900">{selectedUser.display_name || "User"}</div>
                <div className="text-sm text-slate-600">{selectedUser.email}</div>
              </div>

              <div>
                <Label>Display name</Label>
                <Input
                  className="mt-1"
                  value={String(edit.display_name ?? "")}
                  onChange={(e) => setEdit((d) => ({ ...d, display_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select value={String(edit.role ?? "user")} onValueChange={(v) => setEdit((d) => ({ ...d, role: v }))}>
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

                <div>
                  <Label>Faith journey stage</Label>
                  <Select
                    value={String(edit.faith_journey_stage ?? "growing")}
                    onValueChange={(v) => setEdit((d) => ({ ...d, faith_journey_stage: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seeking">seeking</SelectItem>
                      <SelectItem value="new_believer">new_believer</SelectItem>
                      <SelectItem value="growing">growing</SelectItem>
                      <SelectItem value="mature">mature</SelectItem>
                      <SelectItem value="leader">leader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Primary church</Label>
                <Select
                  value={String(edit.church_id ?? "")}
                  onValueChange={(v) => setEdit((d) => ({ ...d, church_id: v }))}
                  disabled={churchesLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={churchesLoading ? "Loading..." : "Select church"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {churches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">This controls the user’s primary church. Membership is managed separately.</p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                {saveMutation.isError ? (
                  <div className="text-sm text-red-700">{String((saveMutation.error as any)?.message ?? saveMutation.error)}</div>
                ) : null}
                {saveMutation.isSuccess ? <div className="text-sm text-green-700">Saved.</div> : null}
              </div>
            </div>
          )}
        </GradientCard>
      </div>
    </div>
  );
}
