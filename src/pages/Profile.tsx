import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserAvatar from "@/components/shared/UserAvatar";
import StudyCard from "@/components/studies/StudyCard";
import CourseCard from "@/components/courses/CourseCard";
import GradientCard from "@/components/ui/GradientCard";
import ProgressRing from "@/components/ui/ProgressRing";
import ActivityItem from "@/components/social/ActivityItem";
import { 
  User, Camera, BookOpen, GraduationCap, Users, Settings,
  Check, X, Loader2, Edit2, Award, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewEmail = urlParams.get('email');
  
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isOwnProfile = !viewEmail || viewEmail === user?.email;
  const profileEmail = viewEmail || user?.email;

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', profileEmail],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: profileEmail }, null, 1).then(r => r[0]),
    enabled: !!profileEmail
  });

  const { data: studyProgress = [] } = useQuery({
    queryKey: ['my-study-progress', profileEmail],
    queryFn: () => base44.entities.StudyProgress.filter({ user_email: profileEmail }, '-updated_date'),
    enabled: !!profileEmail
  });

  const { data: studies = [] } = useQuery({
    queryKey: ['studies-for-progress'],
    queryFn: () => base44.entities.ScriptureStudy.list()
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments', profileEmail],
    queryFn: () => base44.entities.CourseEnrollment.filter({ user_email: profileEmail }, '-updated_date'),
    enabled: !!profileEmail
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-enrollments'],
    queryFn: () => base44.entities.Course.list()
  });

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  const { data: myActivity = [] } = useQuery({
    queryKey: ['my-activity', profileEmail],
    queryFn: () => base44.entities.ActivityFeed.filter({ user_email: profileEmail }, '-created_date', 10),
    enabled: !!profileEmail
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return base44.entities.UserProfile.update(profile.id, data);
      } else {
        return base44.entities.UserProfile.create({ ...data, user_email: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleStartEdit = () => {
    setEditData({
      display_name: profile?.display_name || user?.full_name || '',
      bio: profile?.bio || '',
      church_id: profile?.church_id || '',
      faith_journey_stage: profile?.faith_journey_stage || 'growing',
      visibility: profile?.visibility || 'public'
    });
    setIsEditing(true);
  };

  const studyMap = {};
  studies.forEach(s => { studyMap[s.id] = s; });
  
  const courseMap = {};
  courses.forEach(c => { courseMap[c.id] = c; });

  const churchMap = {};
  churches.forEach(c => { churchMap[c.id] = c; });

  const completedStudies = studyProgress.filter(p => p.status === 'completed').length;
  const completedCourses = enrollments.filter(e => e.status === 'completed').length;
  const totalStudyTime = studyProgress.length * 20 + enrollments.length * 60;

  const faithStageLabels = {
    seeking: "Seeker",
    new_believer: "New Believer",
    growing: "Growing",
    mature: "Mature",
    leader: "Leader"
  };

  if (loadingProfile && profileEmail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative">
              <UserAvatar 
                name={profile?.display_name || user?.full_name}
                imageUrl={profile?.avatar_url}
                size="xl"
              />
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full text-white hover:bg-amber-600 transition-colors">
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label className="text-slate-300">Display Name</Label>
                    <Input
                      value={editData.display_name}
                      onChange={(e) => setEditData(d => ({ ...d, display_name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Bio / Testimony</Label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData(d => ({ ...d, bio: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="Share a bit about your faith journey..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Faith Journey</Label>
                      <Select value={editData.faith_journey_stage} onValueChange={(v) => setEditData(d => ({ ...d, faith_journey_stage: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
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
                      <Label className="text-slate-300">Home Church</Label>
                      <Select value={editData.church_id} onValueChange={(v) => setEditData(d => ({ ...d, church_id: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select church" />
                        </SelectTrigger>
                        <SelectContent>
                          {churches.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={updateProfileMutation.isPending} className="bg-amber-500 hover:bg-amber-600 gap-2">
                      {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="border-white/20 text-white hover:bg-white/10">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-2">{profile?.display_name || user?.full_name || 'Anonymous'}</h1>
                  {profile?.bio && <p className="text-slate-300 mb-4 max-w-xl">{profile.bio}</p>}
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                    {profile?.faith_journey_stage && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30">
                        {faithStageLabels[profile.faith_journey_stage]}
                      </Badge>
                    )}
                    {profile?.church_id && churchMap[profile.church_id] && (
                      <Badge variant="outline" className="border-slate-500 text-slate-300">
                        {churchMap[profile.church_id].name}
                      </Badge>
                    )}
                  </div>
                  {isOwnProfile && (
                    <Button onClick={handleStartEdit} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Studies Completed", value: completedStudies, icon: BookOpen, color: "amber" },
            { label: "Courses Completed", value: completedCourses, icon: GraduationCap, color: "violet" },
            { label: "Study Time (min)", value: totalStudyTime, icon: TrendingUp, color: "emerald" },
            { label: "Achievements", value: Math.floor((completedStudies + completedCourses) / 3), icon: Award, color: "blue" }
          ].map((stat, i) => (
            <GradientCard key={i} variant="cool" className="p-5 text-center">
              <stat.icon className={`h-6 w-6 text-${stat.color}-500 mx-auto mb-2`} />
              <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </GradientCard>
          ))}
        </div>
      </div>
      
      {/* Content Tabs */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Tabs defaultValue="studies">
          <TabsList className="mb-6">
            <TabsTrigger value="studies" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Studies
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="studies">
            {studyProgress.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyProgress.map(p => {
                  const study = studyMap[p.study_id];
                  if (!study) return null;
                  return (
                    <div key={p.id} className="relative">
                      <StudyCard study={study} />
                      {p.status === 'completed' && (
                        <Badge className="absolute top-4 right-4 bg-emerald-500">
                          <Check className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>{isOwnProfile ? "You haven't started any studies yet." : "No studies yet."}</p>
                {isOwnProfile && (
                  <Link to={createPageUrl("Studies")}>
                    <Button className="mt-4 bg-amber-600 hover:bg-amber-700">Browse Studies</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="courses">
            {enrollments.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map(e => {
                  const course = courseMap[e.course_id];
                  if (!course) return null;
                  return (
                    <div key={e.id} className="relative">
                      <CourseCard course={course} showProgress enrollment={e} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>{isOwnProfile ? "You haven't enrolled in any courses yet." : "No courses yet."}</p>
                {isOwnProfile && (
                  <Link to={createPageUrl("Courses")}>
                    <Button className="mt-4 bg-violet-600 hover:bg-violet-700">Browse Courses</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            {myActivity.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {myActivity.map(a => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No activity yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
