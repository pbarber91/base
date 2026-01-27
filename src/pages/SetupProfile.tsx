import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";

import { Camera, Check, Loader2, User } from "lucide-react";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  faith_journey_stage: string | null;
  church_id: string | null;
  profile_completed_at?: string | null;
};

type ChurchRow = {
  id: string;
  name: string;
};

function nowIso() {
  return new Date().toISOString();
}

export default function SetupProfile() {
  const { user, supabase, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [faithStage, setFaithStage] = useState<string>("growing");
  const [churchId, setChurchId] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userId = user?.id ?? null;

  // Load churches (Supabase)
  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches-list"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return (data as any[]) as ChurchRow[];
    },
  });

  // Load my profile (Supabase)
  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["my-profile-row", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // Initialize form from profile/user
  useEffect(() => {
    if (!userId) return;

    const fallbackName =
      (user?.user_metadata as any)?.full_name ||
      (user?.user_metadata as any)?.name ||
      user?.email ||
      "";

    setDisplayName(profile?.display_name ?? fallbackName ?? "");
    setBio(profile?.bio ?? "");
    setFaithStage(profile?.faith_journey_stage ?? "growing");
    setChurchId(profile?.church_id ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [userId, user?.email, user?.user_metadata, profile?.display_name, profile?.bio, profile?.faith_journey_stage, profile?.church_id, profile?.avatar_url]);

  const canSubmit = useMemo(() => {
    return !!userId && !!user?.email && displayName.trim().length > 0;
  }, [userId, user?.email, displayName]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      const payload: Partial<ProfileRow> & { id: string } = {
        id: userId,
        email: user?.email ?? null, // keep stable for own user
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        faith_journey_stage: faithStage || null,
        church_id: churchId ? String(churchId) : null,
        avatar_url: avatarUrl ? String(avatarUrl) : null,
        profile_completed_at: nowIso(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: async () => {
      // Make routing reliable:
      // 1) refresh AuthProvider profile state
      // 2) invalidate queries
      // 3) hard navigate so we don't get a transient layout/guard mismatch
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["my-profile-row"] });
      queryClient.invalidateQueries({ queryKey: ["has-profile-complete"] });
      window.location.replace(createPageUrl("Home"));
    },
  });

  const handlePickAvatar = () => {
    if (!userId) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (file: File) => {
    if (!userId) return;

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
      const path = `users/${userId}/avatar_${Date.now()}.${ext}`;

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

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!userId) {
      window.location.replace(createPageUrl("GetStarted"));
    }
  }, [loading, userId]);

  if (loading || (!userId && !loading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  const busy = loadingProfile || loadingChurches || saveProfileMutation.isPending || uploadingAvatar;

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
          <p className="text-amber-100">Tell us a bit about yourself and your faith journey.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-white/70 border flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-slate-500" />
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

            <div className="flex-1">
              <div className="text-sm text-slate-500">Signed in as</div>
              <div className="font-medium text-slate-800">{user?.email}</div>
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

            {/* Native select for clean name handling */}
            <div>
              <Label htmlFor="faith_journey_stage">Faith Journey Stage</Label>
              <select
                id="faith_journey_stage"
                name="faith_journey_stage"
                value={faithStage}
                onChange={(e) => setFaithStage(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="seeking">Seeking</option>
                <option value="new_believer">New Believer</option>
                <option value="growing">Growing</option>
                <option value="mature">Mature</option>
                <option value="leader">Leader</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">You can change this later.</p>
            </div>

            <div>
              <Label>Your Church (optional)</Label>
              <Select value={churchId || ""} onValueChange={(v) => setChurchId(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your church" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {churches.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-slate-500 mt-1">
                If you don’t see your church, you can create one from <span className="font-medium">Get Started</span>.
              </p>
            </div>

            {saveProfileMutation.error ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {String((saveProfileMutation.error as any)?.message ?? saveProfileMutation.error)}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="submit"
                disabled={!canSubmit || busy}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Complete Setup
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
