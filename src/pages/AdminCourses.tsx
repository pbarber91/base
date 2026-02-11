import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import EmptyState from "@/components/shared/EmptyState";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  Loader2,
  Users,
  Settings,
  BookOpen,
  Shield,
  Crown,
  User,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  is_published: boolean;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  role: string;
  church_id: string | null;
};

type ChurchMemberRow = {
  church_id: string;
  role: string; // enum in DB, but we only check "admin"
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  role: "participant" | "leader" | string;
  created_at: string;
  profiles?: {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type CourseFormPayload = {
  title: string;
  description: string;
  cover_image_url: string;
  tags: string[];
  is_published: boolean;
  is_public: boolean;
  church_id: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminCourses() {
  const { user, supabase, loading } = useAuth();
  const queryClient = useQueryClient();

  const [editCourse, setEditCourse] = useState<CourseRow | null>(null);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);

  const [rosterCourse, setRosterCourse] = useState<CourseRow | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const canUse = !!user?.id && !loading;

  const profileQ = useQuery({
    queryKey: ["admincourses-profile", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,church_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 30_000,
  });

  const churchAdminMembershipsQ = useQuery({
    queryKey: ["admincourses-church-admin-memberships", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<ChurchMemberRow[]> => {
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id,role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  const isGlobalAdmin = (profileQ.data?.role || "").toLowerCase() === "admin";
  const adminChurchIds = useMemo(() => {
    const rows = churchAdminMembershipsQ.data ?? [];
    return rows.filter((r) => (r.role || "").toLowerCase() === "admin").map((r) => r.church_id);
  }, [churchAdminMembershipsQ.data]);

  const canAdminAnything = isGlobalAdmin || adminChurchIds.length > 0;

  const myCoursesQ = useQuery({
    queryKey: ["admincourses-courses", user?.id, isGlobalAdmin, adminChurchIds.join(",")],
    enabled: canUse && canAdminAnything,
    queryFn: async (): Promise<CourseRow[]> => {
      // Global admin: see all courses
      if (isGlobalAdmin) {
        const { data, error } = await supabase
          .from("courses")
          .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by,created_at,updated_at")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as any[];
      }

      // Church admins: see courses for churches you admin
      if (adminChurchIds.length === 0) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by,created_at,updated_at")
        .in("church_id", adminChurchIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 10_000,
  });

  const openCourseDialog = (course: CourseRow | null = null) => {
    setEditCourse(course);
    setIsCourseDialogOpen(true);
  };

  const openRoster = (course: CourseRow) => {
    setRosterCourse(course);
    setIsRosterOpen(true);
  };

  const saveCourseMutation = useMutation({
    mutationFn: async (payload: CourseFormPayload) => {
      if (!user) throw new Error("Not authenticated");

      if (editCourse?.id) {
        const { data, error } = await supabase
          .from("courses")
          .update({
            title: payload.title,
            description: payload.description,
            cover_image_url: payload.cover_image_url || null,
            tags: payload.tags ?? [],
            is_published: payload.is_published,
            is_public: payload.is_public,
          })
          .eq("id", editCourse.id)
          .select("id")
          .single();

        if (error) throw error;
        return data;
      }

      // Create new course: must belong to a church the user admins (unless global admin)
      const churchIdToUse =
        payload.church_id ||
        (adminChurchIds.length === 1 ? adminChurchIds[0] : null) ||
        null;

      if (!isGlobalAdmin && !churchIdToUse) {
        throw new Error("No church selected. You must create courses under a church you admin.");
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          church_id: churchIdToUse,
          title: payload.title,
          description: payload.description || null,
          tags: payload.tags ?? [],
          cover_image_url: payload.cover_image_url || null,
          is_published: payload.is_published ?? false,
          is_public: payload.is_public ?? false,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admincourses-courses"] });
      setIsCourseDialogOpen(false);
      setEditCourse(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admincourses-courses"] }),
  });

  const togglePublishedMutation = useMutation({
    mutationFn: async (course: CourseRow) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !course.is_published })
        .eq("id", course.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admincourses-courses"] }),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (course: CourseRow) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_public: !course.is_public })
        .eq("id", course.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admincourses-courses"] }),
  });

  const rosterQ = useQuery({
    queryKey: ["admincourses-roster", rosterCourse?.id],
    enabled: canUse && !!rosterCourse?.id && isRosterOpen,
    queryFn: async (): Promise<EnrollmentRow[]> => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(
          "id,course_id,user_id,role,created_at,profiles:profiles(id,email,display_name,avatar_url)"
        )
        .eq("course_id", rosterCourse!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 5_000,
  });

  const promoteMutation = useMutation({
    mutationFn: async (row: EnrollmentRow) => {
      const nextRole = row.role === "leader" ? "participant" : "leader";
      const { error } = await supabase
        .from("course_enrollments")
        .update({ role: nextRole })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admincourses-roster"] }),
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (row: EnrollmentRow) => {
      const { error } = await supabase.from("course_enrollments").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admincourses-roster"] }),
  });

  const courses = myCoursesQ.data ?? [];

  const isBusy =
    loading ||
    profileQ.isLoading ||
    churchAdminMembershipsQ.isLoading ||
    myCoursesQ.isLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-lg w-full text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in required</h2>
          <p className="text-sm text-slate-600 mb-6">You must be signed in to manage courses.</p>
          <Link to="/auth">
            <Button className="bg-amber-600 hover:bg-amber-700">Sign In</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

  if (!canAdminAnything) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Shield className="h-5 w-5 text-slate-700" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Not authorized</div>
              <div className="text-sm text-slate-600 mt-1">
                This page is only for Church Admins or Global Admins.
              </div>
            </div>
          </div>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Settings className="h-6 w-6" />
                </div>
                <span className="text-violet-100 font-medium">Course Management</span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">Courses</h1>
              <p className="text-violet-100">
                Build courses, publish when ready, and control visibility (Public vs Church-only).
              </p>
            </div>
            <Button
              onClick={() => openCourseDialog()}
              size="lg"
              className="bg-white text-violet-700 hover:bg-violet-50 gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Course
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {isBusy ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: CourseRow, i: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GradientCard variant="cool" className="overflow-hidden">
                  {course.cover_image_url ? (
                    <div className="h-32 overflow-hidden">
                      <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">{course.description || "—"}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCourseDialog(course)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("CourseBuilder") + `?id=${course.id}`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Sessions
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openRoster(course)}>
                            <Users className="h-4 w-4 mr-2" />
                            Roster & Leaders
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => togglePublishedMutation.mutate(course)}>
                            {course.is_published ? (
                              <EyeOff className="h-4 w-4 mr-2" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            {course.is_published ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => toggleVisibilityMutation.mutate(course)}>
                            {course.is_public ? (
                              <ToggleRight className="h-4 w-4 mr-2" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 mr-2" />
                            )}
                            Visibility: {course.is_public ? "Public" : "Church-only"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => deleteCourseMutation.mutate(course.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>

                      <Badge variant={course.is_public ? "default" : "outline"}>
                        {course.is_public ? "Public" : "Church-only"}
                      </Badge>

                      {isGlobalAdmin ? (
                        <Badge variant="outline" className="inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Global Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="inline-flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Church Admin
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <Link to={createPageUrl("CourseBuilder") + `?id=${course.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Edit Sessions
                        </Button>
                      </Link>
                      <Link to={createPageUrl("CourseDetail") + `?id=${course.id}`}>
                        <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                          View Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course for your church."
            action={() => openCourseDialog()}
            actionLabel="Create Course"
          />
        )}

        {(myCoursesQ.isError ||
          profileQ.isError ||
          churchAdminMembershipsQ.isError ||
          saveCourseMutation.isError ||
          deleteCourseMutation.isError ||
          togglePublishedMutation.isError ||
          toggleVisibilityMutation.isError) && (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(myCoursesQ.error as any)?.message ||
              (profileQ.error as any)?.message ||
              (churchAdminMembershipsQ.error as any)?.message ||
              (saveCourseMutation.error as any)?.message ||
              (deleteCourseMutation.error as any)?.message ||
              (togglePublishedMutation.error as any)?.message ||
              (toggleVisibilityMutation.error as any)?.message ||
              "Something went wrong."}
          </div>
        )}
      </div>

      {/* Create/Edit Course Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const getStr = (k: string) => (formData.get(k)?.toString() ?? "").trim();

              const tags = getStr("tags")
                ? getStr("tags")
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [];

              const isPublic = (formData.get("is_public")?.toString() ?? "false") === "true";
              const isPublished = (formData.get("is_published")?.toString() ?? "false") === "true";
              const churchId = getStr("church_id") || "";

              saveCourseMutation.mutate({
                title: getStr("title"),
                description: getStr("description"),
                cover_image_url: getStr("cover_image_url"),
                tags,
                is_public: isPublic,
                is_published: isPublished,
                church_id: churchId ? churchId : (editCourse?.church_id ?? null),
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Course Title</Label>
              <Input name="title" defaultValue={editCourse?.title ?? ""} required placeholder="e.g., Foundations of Faith" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editCourse?.description ?? ""} placeholder="Brief overview" />
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input name="tags" defaultValue={(editCourse?.tags ?? []).join(", ")} placeholder="discipleship, gospel, prayer" />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input name="cover_image_url" defaultValue={editCourse?.cover_image_url ?? ""} placeholder="https://..." />
            </div>

            {!editCourse && !isGlobalAdmin && adminChurchIds.length > 1 ? (
              <div>
                <Label>Church</Label>
                <select
                  name="church_id"
                  className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select church…
                  </option>
                  {adminChurchIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  (You can swap this to show church names if you want; keeping minimal for now.)
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Publish</Label>
                <select
                  name="is_published"
                  defaultValue={String(editCourse?.is_published ?? false)}
                  className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="false">Draft</option>
                  <option value="true">Published</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Publish when the course is ready for learners.</p>
              </div>

              <div>
                <Label>Visibility</Label>
                <select
                  name="is_public"
                  defaultValue={String(editCourse?.is_public ?? false)}
                  className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="false">Church-only</option>
                  <option value="true">Public</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Who can view the course once published.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveCourseMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {saveCourseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                {editCourse ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Roster Dialog */}
      <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Roster & Leaders</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-slate-600 mb-4">
            Course: <span className="font-medium text-slate-900">{rosterCourse?.title ?? "—"}</span>
          </div>

          {rosterQ.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : rosterQ.data && rosterQ.data.length > 0 ? (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {rosterQ.data.map((row) => {
                const name = row.profiles?.display_name || row.profiles?.email || row.user_id;
                const isLeader = row.role === "leader";

                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <div className="font-medium text-slate-900 truncate">{name}</div>
                        {isLeader ? (
                          <Badge className="bg-violet-600 text-white inline-flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Leader
                          </Badge>
                        ) : (
                          <Badge variant="outline">Participant</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {row.profiles?.email ?? ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isLeader ? "outline" : "default"}
                        className={cx(!isLeader && "bg-violet-600 hover:bg-violet-700")}
                        size="sm"
                        onClick={() => promoteMutation.mutate(row)}
                        disabled={promoteMutation.isPending}
                      >
                        {isLeader ? (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Demote
                          </>
                        ) : (
                          <>
                            <Crown className="h-4 w-4 mr-2" />
                            Promote
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeEnrollmentMutation.mutate(row)}
                        disabled={removeEnrollmentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <GradientCard className="p-6">
              <div className="font-semibold text-slate-900 mb-1">No enrollments yet</div>
              <div className="text-sm text-slate-600">
                Once people enroll, they will show up here. You can promote someone to “Leader”.
              </div>
            </GradientCard>
          )}

          {(rosterQ.isError || promoteMutation.isError || removeEnrollmentMutation.isError) ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {(rosterQ.error as any)?.message ||
                (promoteMutation.error as any)?.message ||
                (removeEnrollmentMutation.error as any)?.message ||
                "Failed to load roster."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
