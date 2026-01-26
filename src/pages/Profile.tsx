// src/pages/Profile.tsx
import React, { useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import UserAvatar from "@/components/shared/UserAvatar";
import StudyCard from "@/components/studies/StudyCard";
import CourseCard from "@/components/courses/CourseCard";
import GradientCard from "@/components/ui/GradientCard";
import ActivityItem from "@/components/social/ActivityItem";

import { Award, BookOpen, Camera, Check, Edit2, GraduationCap, Loader2, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  faith_journey_stage: string | null;
  church_id: string | null; // uuid string
};

const CHURCH_NONE = "none";

export default function Profile() {
  const { supabase, user: authUser } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const viewEmail = urlParams.get("email");

  const isAdmin = useMemo(() => {
    const meta = (authUser as any)?.user_metadata ?? {};
    const role = String(meta.role ?? "").toLowerCase();
    return role === "admin" || role === "superadmin";
  }, [authUser]);

  const isOwnProfile = !viewEmail || viewEmail === (authUser?.email ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: loadingProfile, error: profileError } = useQuery<ProfileRow | null>({
    queryKey: ["profile", viewEmail ?? authUser?.id ?? "anon"],
    enabled: !!authUser && (!!authUser.id || !!viewEmail),
    queryFn: async () => {
      if (!authUser) return null;

      // Non-admins cannot view other users by email
      if (viewEmail && !isAdmin && !isOwnProfile) return null;

      const q = supabase.from("profiles").select("*").limit(1);

      if (!viewEmail || isOwnProfile) {
        const { data, error } = await q.eq("id", authUser.id).maybeSingle();
        if (error) throw error;
        return (data as any) ?? null;
      }

      // Admin-only: lookup other profile by email
      const { data, error } = await q.eq("email", viewEmail).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: studyProgress = [] } = useQuery({
    queryKey: ["my-study-progress", viewEmail || authUser?.email],
    queryFn: () => base44.entities.StudyProgress.filter({ user_email: viewEmail || authUser?.email }, "-updated_date"),
    enabled: !!(viewEmail || authUser?.email),
  });

  const { data: studies = [] } = useQuery({
    queryKey: ["studies-for-progress"],
    queryFn: () => base44.entities.ScriptureStudy.list(),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", viewEmail || authUser?.email],
    queryFn: () => base44.entities.CourseEnrollment.filter({ user_email: viewEmail || authUser?.email }, "-updated_date"),
    enabled: !!(viewEmail || authUser?.email),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-for-enrollments"],
    queryFn: () => base44.entities.Course.list(),
  });

  // Keep this as-is (it was working for you). It just feeds the dropdown + badges.
  const { data: churches = [] } = useQuery({
    queryKey: ["churches"],
    queryFn: () => base44.entities.Church.list(),
  });

  const { data: myActivity = [] } = useQuery({
    queryKey: ["my-activity", viewEmail || authUser?.email],
    queryFn: () => base44.entities.ActivityFeed.filter({ user_email: viewEmail || authUser?.email }, "-created_date", 10),
    enabled: !!(viewEmail || authUser?.email),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!authUser) throw new Error("Not authenticated");
      if (!isOwnProfile && !isAdmin) throw new Error("Not allowed");

      const targetId = isOwnProfile ? authUser.id : (profile?.id ?? null);
      if (!targetId) throw new Error("Missing profile id");

      const rawChurch = String(data.church_id ?? CHURCH_NONE);
      const churchId = rawChurch === CHURCH_NONE ? null : rawChurch;

      const payload: Partial<ProfileRow> & { id: string } = {
        id: targetId,
        ...(isOwnProfile ? { email: authUser.email ?? null } : {}),
        display_name: (data.display_name ?? "").trim() ? String(data.display_name) : null,
        bio: (data.bio ?? "").trim() ? String(data.bio) : null,
        church_id: churchId,
        faith_journey_stage: data.faith_journey_stage ? String(data.faith_journey_stage) : null,
        ...(data.avatar_url ? { avatar_url: String(data.avatar_url) } : {}),
      };

      const { data: saved, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    },
  });

  const handleStartEdit = () => {
    setEditData({
      display_name: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      faith_journey_stage: profile?.faith_journey_stage ?? "growing",
      church_id: profile?.church_id ?? CHURCH_NONE,
    });
    setIsEditing(true);
  };

  const handleSave = () => updateProfileMutation.mutate(editData);

  const handlePickAvatar = () => {
    if (!authUser) {
      window.location.href = "/login?redirect=/profile";
      return;
    }
    if (!isOwnProfile && !isAdmin) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (file: File) => {
    if (!authUser) {
      window.location.href = "/login?redirect=/profile";
      return;
    }
    if (!isOwnProfile && !isAdmin) return;

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

      const targetId = isOwnProfile ? authUser.id : (profile?.id ?? null);
      if (!targetId) throw new Error("Missing profile id");

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `users/${targetId}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("public-media").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("public-media").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await updateProfileMutation.mutateAsync({ avatar_url: publicUrl });
    } catch (err: any) {
      alert(err?.message ?? "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const studyMap: Record<string, any> = {};
  (studies as any[]).forEach((s: any) => (studyMap[s.id] = s));

  const courseMap: Record<string, any> = {};
  (courses as any[]).forEach((c: any) => (courseMap[c.id] = c));

  const churchMap: Record<string, any> = {};
  (churches as any[]).forEach((c: any) => (churchMap[c.id] = c));

  const completedStudies = (studyProgress as any[]).filter((p: any) => p.status === "completed").length;
  const completedCourses = (enrollments as any[]).filter((e: any) => e.status === "completed").length;
  const totalStudyTime = (studyProgress as any[]).length * 20 + (enrollments as any[]).length * 60;

  const faithStageLabels: Record<string, string> = {
    seeking: "Seeker",
    new_believer: "New Believer",
    growing: "Growing",
    mature: "Mature",
    leader: "Leader",
  };

  if (loadingProfile && (viewEmail || authUser?.id)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  // Non-admin tried to view someone else
  if (viewEmail && !isAdmin && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Not allowed</h2>
          <p className="text-slate-600 mb-6">You don&apos;t have permission to view other users&apos; profiles.</p>
          <Link to={createPageUrl("Home")}>
            <Button>Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-xl px-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile error</h2>
          <p className="text-slate-600 mb-4">There was a problem loading the profile.</p>
          <pre className="text-left text-xs bg-white border rounded-lg p-4 overflow-auto">
            {String((profileError as any)?.message ?? profileError)}
          </pre>
          <div className="mt-4">
            <Link to={createPageUrl("Home")}>
              <Button>Back Home</Button>
            </Link>
          </div>
        </div>
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
              <UserAvatar name={profile?.display_name || authUser?.email || "Profile"} imageUrl={profile?.avatar_url} size="xl" />

              {(isOwnProfile || isAdmin) && (
                <>
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
                    className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
                    title="Upload profile picture"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label className="text-slate-300">Display Name</Label>
                    <Input
                      value={String(editData.display_name ?? "")}
                      onChange={(e) => setEditData((d) => ({ ...d, display_name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Bio / Testimony</Label>
                    <Textarea
                      value={String(editData.bio ?? "")}
                      onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="Share a bit about your faith journey."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Faith Journey</Label>
                      <Select
                        value={String(editData.faith_journey_stage ?? "growing")}
                        onValueChange={(v) => setEditData((d) => ({ ...d, faith_journey_stage: v }))}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seeking">Seeker</SelectItem>
                          <SelectItem value="new_believer">New Believer</SelectItem>
                          <SelectItem value="growing">Growing</SelectItem>
                          <SelectItem value="mature">Mature</SelectItem>
                          <SelectItem value="leader">Leader</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-slate-300">Church</Label>
                      <Select
                        value={String(editData.church_id ?? CHURCH_NONE)}
                        onValueChange={(v) => setEditData((d) => ({ ...d, church_id: v }))}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select a church" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CHURCH_NONE}>None</SelectItem>
                          {(churches as any[]).map((c: any) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={updateProfileMutation.isPending} className="gap-2">
                      {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-serif font-bold">{profile?.display_name || "Profile"}</h1>
                  <p className="text-slate-200 mt-2">{profile?.email || viewEmail || authUser?.email}</p>

                  <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                    {profile?.faith_journey_stage ? (
                      <Badge className="bg-white/10 text-white border-white/20">
                        {faithStageLabels[profile.faith_journey_stage] ?? profile.faith_journey_stage}
                      </Badge>
                    ) : null}

                    {profile?.church_id && churchMap[profile.church_id] ? (
                      <Badge className="bg-white/10 text-white border-white/20">{churchMap[profile.church_id].name}</Badge>
                    ) : null}
                  </div>

                  {profile?.bio ? <p className="mt-6 text-slate-100 max-w-2xl">{profile.bio}</p> : null}

                  {(isOwnProfile || isAdmin) && (
                    <div className="mt-6">
                      <Button onClick={handleStartEdit} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="studies" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Studies
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Award className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GradientCard>
                <div className="text-sm text-slate-600">Completed Studies</div>
                <div className="text-3xl font-bold text-slate-900 mt-1">{completedStudies}</div>
              </GradientCard>
              <GradientCard>
                <div className="text-sm text-slate-600">Completed Courses</div>
                <div className="text-3xl font-bold text-slate-900 mt-1">{completedCourses}</div>
              </GradientCard>
              <GradientCard>
                <div className="text-sm text-slate-600">Learning Time (est.)</div>
                <div className="text-3xl font-bold text-slate-900 mt-1">{totalStudyTime} min</div>
              </GradientCard>
            </div>
          </TabsContent>

          <TabsContent value="studies" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(studyProgress as any[]).map((p: any) => {
                const s = studyMap[p.study_id];
                if (!s) return null;
                return <StudyCard key={p.id ?? `${p.study_id}-${p.updated_date ?? ""}`} study={s} progress={p} />;
              })}
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(enrollments as any[]).map((e: any) => {
                const c = courseMap[e.course_id];
                if (!c) return null;
                return <CourseCard key={e.id ?? `${e.course_id}-${e.updated_date ?? ""}`} course={c} enrollment={e} />;
              })}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="space-y-3">
              {(myActivity as any[]).map((a: any) => (
                <ActivityItem key={a.id ?? `${a.created_date ?? ""}-${a.type ?? ""}`} activity={a} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
