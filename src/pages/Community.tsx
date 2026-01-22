import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ActivityItem from '@/components/social/ActivityItem';
import EmptyState from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Users, Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Community() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1).then(r => r[0]),
    enabled: !!user?.email
  });

  const { data: allActivity = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-activity'],
    queryFn: () => base44.entities.ActivityFeed.filter({ visibility: 'public' }, '-created_date', 50)
  });

  const { data: followingActivity = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['following-activity', profile?.following],
    queryFn: async () => {
      if (!profile?.following?.length) return [];
      const activities = [];
      for (const email of profile.following.slice(0, 10)) {
        const userActivities = await base44.entities.ActivityFeed.filter(
          { user_email: email, visibility: 'public' }, 
          '-created_date', 
          5
        );
        activities.push(...userActivities);
      }
      return activities.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30);
    },
    enabled: !!profile?.following?.length
  });

  const isLoading = activeTab === 'all' ? loadingAll : loadingFollowing;
  const activities = activeTab === 'all' ? allActivity : followingActivity;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <span className="text-blue-100 font-medium">Community</span>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">
              Journey Together
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed">
              See what others are learning, celebrate milestones, and encourage 
              one another in your faith journeys.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="all" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              All Activity
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2" disabled={!profile?.following?.length}>
              <Users className="h-4 w-4" />
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : activities.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {activities.map((activity, i) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <ActivityItem activity={activity} />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description={activeTab === 'following' 
              ? "Follow other users to see their activity here." 
              : "Be the first to start a study or join a course!"
            }
          />
        )}
      </div>
    </div>
  );
}