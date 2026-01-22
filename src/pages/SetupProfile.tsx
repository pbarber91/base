import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { User, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SetupProfile() {
  const [user, setUser] = useState(null);
  const [selectedChurch, setSelectedChurch] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.create({
      user_email: user.email,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-profile']);
      window.location.href = createPageUrl("Home");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createProfileMutation.mutate({
      display_name: formData.get('display_name') || user.full_name,
      bio: formData.get('bio'),
      church_id: selectedChurch || null,
      faith_journey_stage: formData.get('faith_journey_stage'),
      spiritual_interests: formData.get('spiritual_interests')?.split(',').map(s => s.trim()).filter(Boolean) || []
    });
  };

  if (!user) {
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
            <div>
              <Label>Display Name</Label>
              <Input 
                name="display_name" 
                defaultValue={user.full_name}
                placeholder="How should we call you?"
                className="mt-1" 
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea 
                name="bio" 
                placeholder="Share a bit about your faith journey..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label>Faith Journey Stage</Label>
              <Select name="faith_journey_stage">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Where are you in your journey?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeking">Seeking</SelectItem>
                  <SelectItem value="new_believer">New Believer</SelectItem>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="mature">Mature</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Spiritual Interests (comma separated)</Label>
              <Input 
                name="spiritual_interests" 
                placeholder="e.g., Prayer, Worship, Theology, Evangelism"
                className="mt-1" 
              />
            </div>

            <div>
              <Label>Your Church (optional)</Label>
              <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your church" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {churches.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Can't find your church? Your pastor can create it on Deeper.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={createProfileMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {createProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}