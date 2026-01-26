// src/pages/CreateChurch.tsx
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Church, ChevronLeft, Loader2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";

async function uploadPublicImage(file: File, folder: string) {
  const safeName = (file.name || "image")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");

  const rid =
    (globalThis.crypto && "randomUUID" in globalThis.crypto && (globalThis.crypto as any).randomUUID())
      ? (globalThis.crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const path = `public/${folder}/${rid}-${safeName}`;

  const { error: uploadError } = await supabase
    .storage
    .from("public-media")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: "3600",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("public-media").getPublicUrl(path);
  return data.publicUrl;
}

export default function CreateChurch() {
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  // ✅ upload state
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const newChurch = await base44.entities.Church.create({
        ...data,
        admin_emails: [user.email],
        created_by: user.email,
      });

      const existingProfile = await base44.entities.UserProfile
        .filter({ user_email: user.email }, null, 1)
        .then(r => r[0]);

      if (existingProfile) {
        await base44.entities.UserProfile.update(existingProfile.id, { church_id: newChurch.id });
      } else {
        await base44.entities.UserProfile.create({
          user_email: user.email,
          display_name: user.full_name,
          church_id: newChurch.id,
          faith_journey_stage: 'leader'
        });
      }

      return newChurch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['churches']);
      queryClient.invalidateQueries(['profile']);
      window.location.href = createPageUrl("ChurchAdmin");
    }
  });

  const onPickLogo = async (file?: File | null) => {
    if (!file) return;
    setLogoError(null);
    setLogoUploading(true);
    try {
      const url = await uploadPublicImage(file, "logos/churches");
      setLogoUrl(url);
    } catch (err: any) {
      setLogoError(err?.message || "Failed to upload logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const onPickCover = async (file?: File | null) => {
    if (!file) return;
    setCoverError(null);
    setCoverUploading(true);
    try {
      const url = await uploadPublicImage(file, "covers/churches");
      setCoverUrl(url);
    } catch (err: any) {
      setCoverError(err?.message || "Failed to upload cover image.");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    createMutation.mutate({
      name: formData.get('name'),
      description: formData.get('description'),
      location: formData.get('location'),
      website: formData.get('website'),
      logo_url: logoUrl || formData.get('logo_url') || null,
      cover_image_url: coverUrl || formData.get('cover_image_url') || null
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 text-violet-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Church className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Create Your Church</h1>
          <p className="text-violet-100">Set up your church's presence and start building community</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="purple" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Church Name</Label>
              <Input name="name" required placeholder="e.g., Grace Community Church" className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                name="description"
                placeholder="Tell people about your church..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input name="location" placeholder="City, State" className="mt-1" />
              </div>
              <div>
                <Label>Website</Label>
                <Input name="website" placeholder="https://..." className="mt-1" />
              </div>
            </div>

            {/* ✅ Logo upload + URL */}
            <div className="space-y-3">
              <Label>Logo (optional)</Label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  {logoUploading ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickLogo(e.target.files?.[0] || null)}
                    disabled={logoUploading}
                  />
                </label>

                {logoUrl && (
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setLogoUrl("")} disabled={logoUploading}>
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>

              {logoError && <div className="text-sm text-red-600">{logoError}</div>}

              {logoUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white p-4 flex items-center gap-4">
                  <img src={logoUrl} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border border-slate-200" />
                  <div className="text-sm text-slate-600 break-all">{logoUrl}</div>
                </div>
              )}

              <div>
                <Label>Logo URL (optional)</Label>
                <Input name="logo_url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>

            {/* ✅ Cover upload + URL */}
            <div className="space-y-3">
              <Label>Cover Image (optional)</Label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  {coverUploading ? "Uploading..." : "Upload Cover"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickCover(e.target.files?.[0] || null)}
                    disabled={coverUploading}
                  />
                </label>

                {coverUrl && (
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setCoverUrl("")} disabled={coverUploading}>
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>

              {coverError && <div className="text-sm text-red-600">{coverError}</div>}

              {coverUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <img src={coverUrl} alt="Cover preview" className="w-full h-40 object-cover" />
                </div>
              )}

              <div>
                <Label>Cover Image URL (optional)</Label>
                <Input name="cover_image_url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to={createPageUrl("Home")}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending || logoUploading || coverUploading}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Church
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
