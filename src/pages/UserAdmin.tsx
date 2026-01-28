// src/pages/UserAdmin.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Search, ArrowLeft, Save } from "lucide-react";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  church_id: string | null;
  bio?: string | null;
  faith_journey_stage?: string | null;
  profile_completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ChurchRow = { id: string; name: string | null };

export default function UserAdmin() {
  const { supabase, user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.userId; // present on /admin/users/:userId
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const { data: churches = [], isLoading: loadingChurches } = useQuery({
    queryKey: ["admin-churches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChurchRow[];
    },
    enabled: !!user,
  });

  const churchMap = useMemo(() => {
    const m: Record<string, ChurchRow> = {};
    churches.forEach((c) => (m[c.id] = c));
    return m;
  }, [churches]);

  // List of users
  const { data: users = [], isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      // Keep it simple + safe: fetch a reasonable list and filter client-side.
      // (If your profiles table grows large, we can add server-side search later.)
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,role,church_id,profile_completed_at,updated_at,created_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const rows = ((data ?? []) as ProfileRow[]).filter((p) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        const hay = `${p.display_name ?? ""} ${p.email ?? ""} ${p.role ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });

      return rows;
    },
    enabled: !!user,
  });

  // Selected user details (only when userId exists)
  const { data: selected, isLoading: loadingSelected, error: selectedError } = useQuery({
    queryKey: ["admin-user", userId],
    enabled: !!user && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId as string)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
  });

  const [editRole, setEditRole] = useState<string>("");
  const [editChurchId, setEditChurchId] = useState<string>("");

  // keep local edit state in sync when selected changes
  React.useEffect(() => {
    if (!selected) return;
    setEditRole(String(selected.role ?? "user"));
    setEditChurchId(selected.church_id ? String(selected.church_id) : "");
  }, [selected?.id]); // only when switching users

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Missing userId");
      const patch: Partial<ProfileRow> = {
        role: editRole || "user",
        church_id: editChurchId ? editChurchId : null,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select("*")
        .single();

      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      // keep UI consistent
      setEditRole(String(saved.role ?? "user"));
      setEditChurchId(saved.church_id ? String(saved.church_id) : "");
    },
  });

  // ---- UI helpers ----
  const RightPane = () => {
    // If no userId, show a helpful empty state instead of throwing/blanking.
    if (!userId) {
      return (
        <GradientCard variant="warm" className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Select a user</h2>
          <p className="text-sm text-slate-600 mt-1">
            Click a user on the left to view and edit their church and role.
          </p>
        </GradientCard>
      );
    }

    if (loadingSelected) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      );
    }

    if (selectedError) {
      return (
        <GradientCard variant="warm" className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Couldn’t load user</h2>
          <pre className="mt-3 text-xs bg-white border rounded-lg p-3 overflow-auto">
            {String((selectedError as any)?.message ?? selectedError)}
          </pre>
        </GradientCard>
      );
    }

    if (!selected) {
      return (
        <GradientCard variant="warm" className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">User not found</h2>
          <p className="text-sm text-slate-600 mt-1">That user record doesn’t exist (or you don’t have access).</p>
        </GradientCard>
      );
    }

    const churchName = selected.church_id ? churchMap[selected.church_id]?.name : null;

    return (
      <GradientCard variant="warm" className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{selected.display_name || "(No display name)"}</h2>
            <div className="text-sm text-slate-600">{selected.email ?? "(No email)"}</div>
            {churchName ? <div className="text-xs text-slate-500 mt-1">Current church: {churchName}</div> : null}
          </div>

          <Button variant="outline" className="gap-2" onClick={() => navigate(createPageUrl("UserAdmin"))}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Role</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">This controls app-wide admin privileges.</p>
          </div>

          <div>
            <Label>Primary Church</Label>
            <Select value={editChurchId || ""} onValueChange={setEditChurchId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingChurches ? "Loading churches..." : "Select a church"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? "(Unnamed church)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Users can still belong to churches via memberships; this is their “primary” on the profile.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            className="gap-2"
            onClick={() => updateUserMutation.mutate()}
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </GradientCard>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">User Admin</h1>
            <p className="text-slate-600 mt-1">View and manage users, roles, and primary church.</p>
          </div>
          <Link to={createPageUrl("AdminHub")}>
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left pane: user list */}
          <GradientCard variant="cool" className="p-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users (name/email/role)…"
              />
            </div>

            <div className="mt-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                </div>
              ) : usersError ? (
                <div className="text-sm text-red-600">
                  {String((usersError as any)?.message ?? usersError)}
                </div>
              ) : users.length === 0 ? (
                <div className="text-sm text-slate-600 py-8 text-center">No users found.</div>
              ) : (
                <div className="divide-y">
                  {users.map((u) => {
                    const isSelected = !!userId && u.id === userId;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className={[
                          "w-full text-left py-3 px-2 rounded-lg transition",
                          isSelected ? "bg-white shadow-sm" : "hover:bg-white/60",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">
                              {u.display_name || "(No display name)"}
                            </div>
                            <div className="text-xs text-slate-600 truncate">{u.email ?? "(No email)"}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Role: {u.role ?? "user"}
                              {u.profile_completed_at ? " • Profile complete" : " • Profile incomplete"}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {u.church_id ? (churchMap[u.church_id]?.name ?? "Church") : "No church"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </GradientCard>

          {/* Right pane: details */}
          <div className="lg:col-span-3">
            <RightPane />
          </div>
        </div>
      </div>
    </div>
  );
}
