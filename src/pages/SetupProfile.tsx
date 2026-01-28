import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { User, Loader2, Camera, Check } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  faith_journey_stage: string | null;
  church_id: string | null;
  profile_completed_at: string | null;
};

type ChurchRow = {
  id: string;
  name: string;
};

const faithStages = [
  { value: "seeking", label: "Seeking" },
  { value: "new_believer", label: "New Believer" },
  { value: "growing", label: "Growing" },
  { value: "mature", label: "Mature" },
  { value: "leader", label: "Leader" },
];

export default function SetupProfile() {
  const { user, supabase, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [faithStage, setFaithStage] = useState("growing");
  const [churchId, setChurchId] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const canUse = !!user?.id;

  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches-list-for-setup"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["setup-profile-row", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,bio,faith_journey_stage,church_id,profile_completed_at")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // Prefill from Supabase + auth metadata
  useEffect(() => {
    if (!user) return;
    if (!profile) {
      // still allow prefill from auth metadata
      const metaName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        "";
      setDisplayName(metaName || user.email || "");
      return;
    }

    setDisplayName(profile.display_name || user.email || "");
    setBio(profile.bio || "");
    setFaithStage(profile.faith_journey_stage || "growing");
    setChurchId(profile.church_id || "");
    setAvatarUrl(profile.avatar_url || "");
  }, [user, profile]);

  // If user is already complete, kick them to profile (or home)
  const alreadyComplete = useMemo(() => !!profile?.profile_completed_at, [profile?.profile_completed_at]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (loadingProfile) return;

    if (alreadyComplete) {
      navigate(createPageUrl("Profile"), { replace: true });
    }
  }, [loading, user, loadingProfile, alreadyComplete, navigate]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const payload: Partial<ProfileRow> & { id: string } = {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        faith_journey_stage: faithStage || null,
        church_id: churchId ? String(churchId) : null,
        avatar_url: avatarUrl || null,
        profile_completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" }).select("*").single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["setup-profile-row"] });
      queryClient.invalidateQueries({ queryKey: ["profile-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate(createPageUrl("Profile"), { replace: true });
    },
  });

  const handlePickAvatar = () => {
    if (!user) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (file: File) => {
    if (!user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be 5MB or smaller.");
      return;
    }

    try {
      setUploadingAvatar(true);

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `users/${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("public-media").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("public-media").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert(err?.message ?? "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (loading || (user && loadingProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    // Not logged in: send to auth page
    navigate("/auth", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <User className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Complete Your Profile</h1>
          <p className="text-amber-100">Tell us a bit about yourself and your faith journey</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-2xl bg-white/60 border overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-slate-500 text-sm">Photo</span>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!file) return;
                    void handleAvatarFile(file);
                  }}
                />
              </div>

              <div className="flex-1">
                <Label>Profile Photo</Label>
                <div className="mt-1 flex gap-2">
                  <Button type="button" variant="outline" onClick={handlePickAvatar} disabled={uploadingAvatar} className="gap-2">
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Upload Photo
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Max 5MB. PNG/JPG recommended.</p>
              </div>
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Bio / Testimony</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a bit about your faith journey..."
                className="mt-1 min-h-[110px]"
              />
            </div>

            {/* Native select (clean + predictable) */}
            <div>
              <Label htmlFor="faith_journey_stage">Faith Journey Stage</Label>
              <select
                id="faith_journey_stage"
                name="faith_journey_stage"
                value={faithStage}
                onChange={(e) => setFaithStage(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="" disabled>
                  Select stage…
                </option>
                {faithStages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Your Church (optional)</Label>
              <select
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                Can’t find your church? A church leader can create it, then you can select it here.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="submit" disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Complete Setup
              </Button>
            </div>

            {saveMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveMutation.error as any)?.message ?? "Failed to save profile."}
              </div>
            ) : null}
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
