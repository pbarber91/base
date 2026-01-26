// src/pages/ChurchManage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, ChevronLeft, Save } from "lucide-react";

type ChurchRow = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  created_by?: string | null;
};

type MemberRow = {
  church_id: string;
  user_id: string;
  role?: string | null;
};

function useQueryParam(name: string) {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get(name), [search, name]);
}

export default function ChurchManage() {
  const { supabase, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const churchId = useQueryParam("church");

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    website: "",
    logo_url: "",
    cover_image_url: "",
  });

  // Basic auth guard (RequireAuth should handle this too, but belt + suspenders)
  useEffect(() => {
    if (user === null) {
      navigate("/login?redirect=/church-admin", { replace: true });
    }
  }, [user, navigate]);

  const { data: canManage, isLoading: loadingPerms } = useQuery({
    queryKey: ["church_manage_perm", churchId, user?.id],
    enabled: !!churchId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id,user_id,role")
        .eq("church_id", churchId!)
        .eq("user_id", user!.id)
        .limit(1);

      if (error) throw error;

      const m = (data?.[0] as MemberRow | undefined) ?? null;
      const role = (m?.role ?? "").toLowerCase();
      return role === "admin" || role === "owner" || role === "superadmin";
    },
  });

  const {
    data: church,
    isLoading: loadingChurch,
    error: churchError,
  } = useQuery({
    queryKey: ["church", churchId],
    enabled: !!churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churches")
        .select("id,name,description,location,website,logo_url,cover_image_url,created_by")
        .eq("id", churchId!)
        .single();

      if (error) throw error;
      return data as ChurchRow;
    },
  });

  useEffect(() => {
    if (!church) return;
    setForm({
      name: church.name ?? "",
      description: church.description ?? "",
      location: church.location ?? "",
      website: church.website ?? "",
      logo_url: church.logo_url ?? "",
      cover_image_url: church.cover_image_url ?? "",
    });
  }, [church]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!churchId) throw new Error("Missing church id");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        website: form.website.trim() || null,
        logo_url: form.logo_url.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
      };

      const { error } = await supabase.from("churches").update(payload).eq("id", churchId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["church"] });
      await queryClient.invalidateQueries({ queryKey: ["admin_churches"] });
    },
  });

  if (!churchId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <GradientCard variant="cool" className="p-8">
            <p className="text-slate-700 font-medium">Missing church id.</p>
            <p className="text-slate-500 text-sm mt-2">Go back to Church Admin and select Manage again.</p>
            <div className="mt-4">
              <Link to="/church-admin">
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </GradientCard>
        </div>
      </div>
    );
  }

  if (loadingPerms || loadingChurch) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (churchError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <GradientCard variant="cool" className="p-8">
            <p className="text-slate-900 font-semibold">Couldn’t load church.</p>
            <p className="text-slate-600 text-sm mt-2">
              {(churchError as any)?.message ?? "Unknown error"}
            </p>
            <div className="mt-4">
              <Link to="/church-admin">
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </GradientCard>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <GradientCard variant="cool" className="p-8">
            <p className="text-slate-900 font-semibold">Access denied.</p>
            <p className="text-slate-600 text-sm mt-2">You’re not an admin for this church.</p>
            <div className="mt-4">
              <Link to="/church-admin">
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </GradientCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/church-admin">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Manage Church</h1>
              <p className="text-sm text-slate-500">{church?.name}</p>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>

        <GradientCard variant="cool" className="p-8">
          <div className="space-y-6">
            <div>
              <Label>Church Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Logo URL (optional)</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input
                value={form.cover_image_url}
                onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </GradientCard>
      </div>
    </div>
  );
}
