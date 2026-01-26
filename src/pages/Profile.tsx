// src/pages/Profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Upload } from "lucide-react";

type ProfileRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  church_id?: string | null;
  faith_journey_stage?: string | null;
  visibility?: string | null;
  role?: string | null;
};

type ChurchRow = {
  id: string;
  name: string;
  cover_image_url?: string | null;
  logo_url?: string | null;
};

export default function Profile() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [churchId, setChurchId] = useState<string>("");
  const [faithStage, setFaithStage] = useState<string>("leader");
  const [visibility, setVisibility] = useState<string>("public");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const { data: authUser, isLoading: loadingUser } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not authenticated");
      return data.user;
    },
  });

  const { data: churches = [], isLoading: loadingChurches } = useQuery({
    queryKey: ["churches_list"],
    enabled: !!authUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churches")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChurchRow[];
    },
  });

  const { data: profileRow, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", authUser?.id],
    enabled: !!authUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,bio,church_id,faith_journey_stage,visibility,role")
        .eq("id", authUser!.id)
        .maybeSingle();

      // If row doesn't exist yet, return null (we'll create on save)
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = 0 rows in maybeSingle
      return (data ?? null) as ProfileRow | null;
    },
  });

  // Seed form state from DB
  useEffect(() => {
    if (!authUser) return;

    const fallbackName =
      (authUser.user_metadata as any)?.full_name ||
      (authUser.user_metadata as any)?.name ||
      authUser.email ||
      "";

    setDisplayName(profileRow?.display_name ?? fallbackName);
    setBio(profileRow?.bio ?? "");
    setChurchId(profileRow?.church_id ?? "");
    setFaithStage(profileRow?.faith_journey_stage ?? "leader");
    setVisibility(profileRow?.visibility ?? "public");
    setAvatarUrl(profileRow?.avatar_url ?? "");
  }, [authUser, profileRow]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!authUser) throw new Error("Not authenticated");

      const payload: ProfileRow = {
        id: authUser.id,
        email: authUser.email,
        display_name: displayName.trim(),
        bio: bio,
        church_id: churchId || null,
        faith_journey_stage: faithStage || null,
        visibility: visibility || null,
        avatar_url: avatarUrl || null,
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      return true;
    },
    onSuccess: async () => {
      await refetchProfile();
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!authUser) throw new Error("Not authenticated");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `users/${authUser.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("public-media").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("public-media").getPublicUrl(path);
      const url = data.publicUrl;

      setAvatarUrl(url);

      // Persist immediately
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: authUser.id, email: authUser.email, avatar_url: url }, { onConflict: "id" });
      if (error) throw error;

      return url;
    },
  });

  const isBusy =
    loadingUser || loadingProfile || updateProfileMutation.isPending || uploadAvatarMutation.isPending;

  const avatarInitials = useMemo(() => {
    const n = (displayName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
  }, [displayName]);

  if (loadingUser || !authUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="cool" className="p-8">
          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-lg overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </div>

              <label className="absolute -bottom-2 -right-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatarMutation.mutate(f);
                  }}
                />
                <div className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50">
                  <Upload className="h-4 w-4 text-slate-700" />
                </div>
              </label>
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900">Your Profile</h1>
              <p className="text-sm text-slate-500 truncate">{authUser.email}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="space-y-6"
          >
            <div>
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
                placeholder="Your name"
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 min-h-[100px]"
                placeholder="A short bio (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Church</Label>
                <Select value={churchId} onValueChange={setChurchId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={loadingChurches ? "Loading..." : "Select a church"} />
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
              </div>

              <div>
                <Label>Faith Journey Stage</Label>
                <Select value={faithStage} onValueChange={setFaithStage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seeker">Seeker</SelectItem>
                    <SelectItem value="new_believer">New Believer</SelectItem>
                    <SelectItem value="growing">Growing</SelectItem>
                    <SelectItem value="leader">Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="church">Church</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isBusy} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
