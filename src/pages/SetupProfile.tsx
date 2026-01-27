// src/pages/SetupProfile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import UserAvatar from "@/components/shared/UserAvatar";

import { Loader2, User, Camera, Check } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  faith_journey_stage: string | null;
  church_id: string | null;
  profile_completed_at: string | null;
};

type ChurchRow = {
  id: string;
  name: string;
};

export default function SetupProfile() {
  const { user, supabase, refreshProfile } = useAuth();
  const nav = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedChurch, setSelectedChurch] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [faithStage, setFaithStage] = useState<string>("growing");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const userId = user?.id ?? null;

  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches"],
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const {
    data: profile,
    isLoading: loadingProfile,
    error: profileError,
  } = useQuery<ProfileRow | null>({
    queryKey: ["my-profile-row", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // Initialize form from Supabase profile
  useEffect(() => {
    if (!user) return;

    const initialName =
      (profile?.display_name ?? "").trim() ||
      ((user.user_metadata as any)?.full_name ?? "") ||
      (user.email ?? "");

    setDisplayName(initialName);
    setBio(profile?.bio ?? "");
    setFaithStage(profile?.faith_journey_stage ?? "growing");
    setSelectedChurch(profile?.church_id ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [user, profile]);

  const canSubmit = useMemo(() => {
    return !!user && displayName.trim().length > 0;
  }, [user, displayName]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const payload: Partial<ProfileRow> & { id: string } = {
        id: user.id,
        // email should exist; keep stable from auth
        email: user.email ?? null,
        display_name: displayName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        faith_journey_stage: faithStage ?? null,
        church_id: selectedChurch ? selectedChurch : null,
        avatar_url: avatarUrl ? avatarUrl : null,
        profile_completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: async () => {
      // Ensure AuthProvider has the latest profile BEFORE we navigate.
      await refreshProfile();
      nav("/", { replace: true });
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

  if (!user) {
    // If someone hits this route logged out, send them to get-started
    nav("/get-started", { replace: true });
    return null;
  }

  if (loadingProfile || loadingChurches) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-xl w-full px-6">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Setup error</h2>
            <p className="text-slate-600 mb-4">We couldn’t load your profile.</p>
            <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">
              {String((profileError as any)?.message ?? profileError)}
            </pre>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </div>
        </div>
      </div>
    );
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
          <p className="text-amber-100">Tell us a bit about yourself and your faith journey.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              <UserAvatar name={displayName || user.email} imageUrl={avatarUrl || undefined} size="xl" />
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
                className="absolute bottom-0 right-0 p-2 bg-amber-600 rounded-full text-white hover:bg-amber-700 transition-colors disabled:opacity-60"
                title="Upload profile picture"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex-1">
              <div className="text-sm text-slate-600">Signed in as</div>
              <div className="font-medium text-slate-900">{user.email}</div>
              {profile?.profile_completed_at ? (
                <div className="text-xs text-slate-500 mt-1">Previously completed. Updating will refresh your info.</div>
              ) : (
                <div className="text-xs text-slate-500 mt-1">Complete setup to unlock the full app.</div>
              )}
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
                name="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Bio / Testimony</Label>
              <Textarea
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a bit about your faith journey..."
                className="mt-1 min-h-[110px]"
              />
            </div>

            <div>
              <Label htmlFor="faith_journey_stage">Faith Journey Stage</Label>
              {/* Native select (no shadcn Select name wiring issues) */}
              <div className="mt-1">
                <select
                  id="faith_journey_stage"
                  name="faith_journey_stage"
                  value={faithStage}
                  onChange={(e) => setFaithStage(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="seeking">Seeking</option>
                  <option value="new_believer">New Believer</option>
                  <option value="growing">Growing</option>
                  <option value="mature">Mature</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="church_id">Your Church (optional)</Label>
              <div className="mt-1">
                <select
                  id="church_id"
                  name="church_id"
                  value={selectedChurch}
                  onChange={(e) => setSelectedChurch(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">None</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                If you don’t see your church, a leader can create it from Get Started.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={!canSubmit || saveProfileMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {saveProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Complete Setup
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
