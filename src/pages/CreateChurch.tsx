import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Church, ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

type Me = {
  id: string;
  email: string | null;
  full_name?: string | null;
};

export default function CreateChurch() {
  const [user, setUser] = useState<Me | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth
      .me()
      .then(setUser)
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("Not authenticated");

      // 1) Create church (must include created_by for RLS)
      const newChurch = await base44.entities.Church.create({
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        website: data.website || null,
        logo_url: data.logo_url || null,
        cover_image_url: data.cover_image_url || null,
        created_by: user.id,
      });

      // 2) Insert initial church admin membership (requires policy added above)
      await base44.entities.ChurchMember.create({
        church_id: newChurch.id,
        user_id: user.id,
        role: "admin",
      });

      // 3) Optional: ensure your profile has display_name/email set (matches your profiles table)
      // profiles.id = auth.uid() based on your RLS policy, so update by user.id
      try {
        await base44.entities.UserProfile.update(user.id, {
          email: user.email,
          display_name: user.full_name || user.email,
          role: "user",
        });
      } catch {
        // If profile row doesn't exist yet, create it
        await base44.entities.UserProfile.create({
          id: user.id,
          email: user.email,
          display_name: user.full_name || user.email,
          role: "user",
        });
      }

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
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name"),
      description: formData.get("description"),
      location: formData.get("location"),
      website: formData.get("website"),
      logo_url: formData.get("logo_url"),
      cover_image_url: formData.get("cover_image_url"),
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

            <div>
              <Label>Logo URL (optional)</Label>
              <Input name="logo_url" placeholder="https://..." className="mt-1" />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input name="cover_image_url" placeholder="https://..." className="mt-1" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to={createPageUrl("Home")}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending}
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
