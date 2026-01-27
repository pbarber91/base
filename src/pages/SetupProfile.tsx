import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { User as UserIcon, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

type ChurchRow = { id: string; name: string };
type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  faith_journey_stage: string | null;
  church_id: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

function isProfileComplete(p: ProfileRow | null): boolean {
  if (!p) return false;
  const hasName = !!(p.display_name ?? "").trim();
  const hasStage = !!(p.faith_journey_stage ?? "").trim();
  return hasName && hasStage;
}

export default function SetupProfile() {
  const { user, supabase, loading } = useAuth();
  const queryClient = useQueryClient();

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) window.location.href = "/auth";
  }, [loading, user]);

  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches-list"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churches")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["profile", user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,bio,faith_journey_stage,church_id,avatar_url,role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // If already complete, go home
  useEffect(() => {
    if (!user) return;
    if (loadingProfile) return;
    if (isProfileComplete(profile)) {
      window.location.href = createPageUrl("Home");
    }
  }, [user, loadingProfile, profile]);

  const defaultName = useMemo(() => {
    const meta: any = user?.user_metadata ?? {};
    const n = String(meta.full_name ?? meta.name ?? "").trim();
    return n || (user?.email ?? "");
  }, [user]);

  const upsertProfileMutation = useMutation({
    mutationFn: async (data: { display_name: string; bio: string; faith_journey_stage: string; church_id: string | null }) => {
      if (!user) throw new Error("Not authenticated");

      const payload: Partial<ProfileRow> & { id: string } = {
        id: user.id,
        email: user.email ?? null,
        display_name: data.display_name.trim() ? data.display_name.trim() : null,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        faith_journey_stage: data.faith_journey_stage ?? null,
        church_id: data.church_id ? data.church_id : null,
      };

      const { data: saved, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("id,email,display_name,bio,faith_journey_stage,church_id,avatar_url,role")
        .single();

      if (error) throw error;
      return saved as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.location.href = createPageUrl("Home");
    },
  });

  const [selectedChurch, setSelectedChurch] = useState<string>("");
  useEffect(() => {
    // Set initial selected church from supabase profile when loaded
    if (!profile) return;
    setSelectedChurch(profile.church_id ?? "");
  }, [profile?.church_id]);

  if (loading || !user || loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const display_name = String(formData.get("display_name") ?? "").trim();
    const bio = String(formData.get("bio") ?? "");
    const faith_journey_stage = String(formData.get("faith_journey_stage") ?? "").trim();

    if (!display_name) {
      alert("Please enter a display name.");
      return;
    }
    if (!faith_journey_stage) {
      alert("Please choose your faith journey stage.");
      return;
    }

    upsertProfileMutation.mutate({
      display_name,
      bio,
      faith_journey_stage,
      church_id: selectedChurch ? selectedChurch : null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <UserIcon className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Complete Your Profile</h1>
          <p className="text-amber-100">Tell us a bit about yourself and your faith journey.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Display Name</Label>
              <Input
                name="display_name"
                defaultValue={profile?.display_name ?? defaultName}
                placeholder="How should we call you?"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Bio / Testimony</Label>
              <Textarea
                name="bio"
                defaultValue={profile?.bio ?? ""}
                placeholder="Share a bit about your faith journey..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            {/* Clean native select for faith_journey_stage */}
            <div>
              <Label htmlFor="faith_journey_stage">Faith Journey Stage</Label>
              <select
                id="faith_journey_stage"
                name="faith_journey_stage"
                defaultValue={profile?.faith_journey_stage ?? ""}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  Select a stage…
                </option>
                <option value="seeking">Seeker</option>
                <option value="new_believer">New Believer</option>
                <option value="growing">Growing</option>
                <option value="mature">Mature</option>
                <option value="leader">Leader</option>
              </select>
            </div>

            <div>
              <Label>Your Church (optional)</Label>
              <select
                value={selectedChurch}
                onChange={(e) => setSelectedChurch(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loadingChurches}
              >
                <option value="">None</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <p className="text-xs text-slate-500 mt-1">
                You can change your church later in your profile.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="submit" disabled={upsertProfileMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {upsertProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
