import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Church, ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CreateChurch() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newChurch = await base44.entities.Church.create({
        ...data,
        admin_emails: [user.email]
      });
      
      // Create or update user profile with this church
      const existingProfile = await base44.entities.UserProfile.filter({ user_email: user.email }, null, 1).then(r => r[0]);
      
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate({
      name: formData.get('name'),
      description: formData.get('description'),
      location: formData.get('location'),
      website: formData.get('website'),
      logo_url: formData.get('logo_url'),
      cover_image_url: formData.get('cover_image_url')
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
                <Button type="button" variant="outline">Cancel</Button>
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