import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { User as UserIcon, Loader2, Camera } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

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

const STAGES: Array<{ value: string; label: string }> = [
  { value: "seeking", label: "Seeking" },
  { value: "new_believer", label: "New Believer" },
  { value: "growing", label: "Growing" },
  { value: "mature", label: "Mature" },
  { value: "leader", label: "Leader" },
];

export default function SetupProfile() {
  const { user, supabase, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [faithStage, setFaithStage] = useState("growing");
  const [churchId, setChurchId] = useState<string>("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If not logged in, bounce to Get Started
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = createPageUrl("GetStarted");
    }
  }, [loading, user]);

  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["my-profile-row", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // Prefill form when profile loads
  useEffect(() => {
    if (!user) return;

    // Always prefer DB values when present; fallback to auth metadata/email.
    setDisplayName(
      (profile?.display_name ?? (user.user_metadata as any)?.full_name ?? (user.user_metadata as any)?.name ?? user.email ?? "") as string
    );
    setBio((profile?.bio ?? "") as string);
    setFaithStage((profile?.faith_journey_stage ?? "growing") as string);
    setChurchId((profile?.church_id ?? "") as string);
    setAvatarUrl((profile?.avatar_url ?? "") as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, user?.id]);

  const canSubmit = useMemo(() => {
    return !!user?.id && displayName.trim().length > 0;
  }, [user?.id, displayName]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const payload: Partial<ProfileRow> & { id: string } = {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName.trim(),
        bio: bio?.trim() ? bio.trim() : null,
        faith_journey_stage: faithStage || null,
        church_id: churchId ? String(churchId) : null,
        avatar_url: avatarUrl ? String(avatarUrl) : null,
        profile_completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" }).select("*").single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile-row"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] }); // Profile.tsx
      await refreshProfile();
      window.location.href = createPageUrl("Home");
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
      alert(err?.message ?? "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

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
          <p className="text-amber-100">Tell us a bit about yourself and your faith journey</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-white overflow-hidden border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <UserIcon className="h-7 w-7" />
                  </div>
                )}
              </div>

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

              <button
                type="button"
                onClick={handlePickAvatar}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 p-2 bg-amber-600 rounded-full text-white hover:bg-amber-700 transition-colors disabled:opacity-60"
                title="Upload profile picture"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <div>
              <div className="text-sm text-slate-600">Signed in as</div>
              <div className="font-medium text-slate-900">{user?.email}</div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              saveProfileMutation.mutate();
            }}
            className="space-y-6"
          >
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

            <div>
              <Label htmlFor="faith_journey_stage">Faith Journey Stage</Label>
              <select
                id="faith_journey_stage"
                name="faith_journey_stage"
                value={faithStage}
                onChange={(e) => setFaithStage(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="church_id">Your Church (optional)</Label>
              <select
                id="church_id"
                name="church_id"
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                Can’t find your church? Use <span className="font-medium">Get Started → I’m a Church Leader</span> to create it.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="submit"
                disabled={!canSubmit || saveProfileMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {saveProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>

            {saveProfileMutation.isError ? (
              <pre className="text-xs bg-white border rounded-lg p-3 overflow-auto text-red-700">
                {String((saveProfileMutation.error as any)?.message ?? saveProfileMutation.error)}
              </pre>
            ) : null}
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
