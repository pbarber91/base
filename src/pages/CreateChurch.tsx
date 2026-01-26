import React, { useState, useEffect } from "react";
import { base44, supabase } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Church, ChevronLeft, Loader2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

type Me = {
  id: string;
  email: string | null;
  full_name?: string | null;
};

function extFromFile(file: File) {
  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
  return ext.replace(/[^a-z0-9]/g, "") || "bin";
}

async function uploadPublicMedia(path: string, file: File) {
  const { error } = await supabase.storage
    .from("public-media")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("public-media").getPublicUrl(path);
  return data.publicUrl;
}

export default function CreateChurch() {
  const [user, setUser] = useState<Me | null>(null);
  const queryClient = useQueryClient();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => (window.location.href = "/"));
  }, []);

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      if (!user?.id) throw new Error("Not authenticated");

      // 1) Create church first (get id)
      const newChurch = await base44.entities.Church.create({
        name: form.name,
        description: form.description || null,
        location: form.location || null,
        website: form.website || null,
        created_by: user.id,
        // we'll fill these after uploads
        logo_url: null,
        cover_image_url: null,
      });

      // 2) Upload images (optional) to public-media
      const updates: any = {};
      const ts = Date.now();

      if (logoFile) {
        const p = `public/churches/${newChurch.id}/logo_${ts}.${extFromFile(logoFile)}`;
        updates.logo_url = await uploadPublicMedia(p, logoFile);
      }
      if (coverFile) {
        const p = `public/churches/${newChurch.id}/cover_${ts}.${extFromFile(coverFile)}`;
        updates.cover_image_url = await uploadPublicMedia(p, coverFile);
      }

      if (Object.keys(updates).length) {
        await base44.entities.Church.update(newChurch.id, updates);
      }

      // 3) Ensure church admin membership exists for creator
      await base44.entities.ChurchMember.create({
        church_id: newChurch.id,
        user_id: user.id,
        role: "admin",
      });

      return newChurch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churches"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.location.href = createPageUrl("ChurchAdmin");
    },
    onError: (err: any) => {
      console.error("Create church failed:", err);
      alert(err?.message || "Create church failed. Check console for details.");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    createMutation.mutate({
      name: fd.get("name"),
      description: fd.get("description"),
      location: fd.get("location"),
      website: fd.get("website"),
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
          <Link
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-2 text-violet-100 hover:text-white mb-6 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Church className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Create Your Church</h1>
          <p className="text-violet-100">Set up your church&apos;s presence and start building community</p>
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
              <Textarea name="description" placeholder="Tell people about your church..." className="mt-1 min-h-[100px]" />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Logo (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                {logoFile && <p className="text-xs text-slate-600 mt-1">Selected: {logoFile.name}</p>}
              </div>

              <div>
                <Label>Cover Image (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                {coverFile && <p className="text-xs text-slate-600 mt-1">Selected: {coverFile.name}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to={createPageUrl("Home")}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Create Church
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
