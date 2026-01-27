import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Camera, User } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SetupProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["setup-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: churches = [] } = useQuery({
    queryKey: ["churches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("profiles").upsert({
        id: user!.id,
        email: user!.email,
        ...values,
        profile_completed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      window.location.href = createPageUrl("Home");
    },
  });

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setAvatarUploading(true);

    const ext = file.name.split(".").pop();
    const path = `users/${user!.id}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("public-media")
      .upload(path, file, { upsert: true });

    if (error) {
      setAvatarUploading(false);
      throw error;
    }

    const { data } = supabase.storage
      .from("public-media")
      .getPublicUrl(path);

    await saveProfile.mutateAsync({ avatar_url: data.publicUrl });
    setAvatarUploading(false);
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <User className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            Complete Your Profile
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard className="p-8">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              saveProfile.mutate({
                display_name: form.get("display_name"),
                bio: form.get("bio"),
                faith_journey_stage: form.get("faith_journey_stage"),
                church_id: form.get("church_id") || null,
              });
            }}
          >
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <img
                src={profile?.avatar_url || "/avatar-placeholder.png"}
                className="w-20 h-20 rounded-full object-cover"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files && handleAvatarUpload(e.target.files[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="gap-2"
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Upload Avatar
              </Button>
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                name="display_name"
                defaultValue={profile?.display_name ?? ""}
                required
              />
            </div>

            <div>
              <Label>Bio / Testimony</Label>
              <Textarea
                name="bio"
                defaultValue={profile?.bio ?? ""}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label>Faith Journey Stage</Label>
              <select
                name="faith_journey_stage"
                defaultValue={profile?.faith_journey_stage ?? ""}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select stage</option>
                <option value="seeking">Seeking</option>
                <option value="new_believer">New Believer</option>
                <option value="growing">Growing</option>
                <option value="mature">Mature</option>
                <option value="leader">Leader</option>
              </select>
            </div>

            <div>
              <Label>Church (optional)</Label>
              <select
                name="church_id"
                defaultValue={profile?.church_id ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {churches.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={saveProfile.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saveProfile.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Complete Setup
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
