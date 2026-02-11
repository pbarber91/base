// src/pages/AdminCourses.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import EmptyState from "@/components/shared/EmptyState";
import {
  Plus,
  MoreVertical,
  Loader2,
  Settings,
  Trash2,
  Users,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // optional if you added it earlier
  visibility?: string | null; // "public" | "church" | etc
};

type ProfileRow = {
  id: string;
  role: string;
};

type RosterRow = {
  course_id: string;
  user_id: string;
  role: string; // "participant" | "leader"
  enrolled_at: string;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminCourses() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editCourse, setEditCourse] = useState<CourseRow | null>(null);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);

  const [rosterCourse, setRosterCourse] = useState<CourseRow | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const canUse = !!user?.id && !loading;

  // 1) Load my profile role (global admin)
  const myProfileQ = useQuery({
    queryKey: ["my-profile-role", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    staleTime: 30_000,
  });

  const isGlobalAdmin = (myProfileQ.data?.role || "") === "admin";

  // 2) Church admin memberships (your enum does NOT have 'leader', so we use admin only here)
  const myAdminChurchesQ = useQuery({
    queryKey: ["my-admin-church-ids", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id,role")
        .eq("user_id", user!.id);
      if (error) throw error;

      const rows = (data ?? []) as any[];
      return rows
        .filter((r) => r.role === "admin")
        .map((r) => r.church_id)
        .filter(Boolean);
    },
    staleTime: 30_000,
  });

  const adminChurchIds = myAdminChurchesQ.data ?? [];

  const canSeeAdmin = isGlobalAdmin || adminChurchIds.length > 0;

  // 3) Courses for admin’s churches (or all if global admin)
  const coursesQ = useQuery({
    queryKey: ["admin-courses", user?.id, isGlobalAdmin, adminChurchIds],
    enabled: canUse && canSeeAdmin,
    queryFn: async (): Promise<CourseRow[]> => {
      let q = supabase
        .from("courses")
        .select(
          "id,church_id,title,description,tags,cover_image_url,is_published,created_by,created_at,updated_at,visibility"
        )
        .order("updated_at", { ascending: false });

      if (!isGlobalAdmin) {
        // Only courses for churches you admin
        if (adminChurchIds.length === 0) return [];
        q = q.in("church_id", adminChurchIds);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 10_000,
  });

  // --- Create / Update course ---
  const saveCourseMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string | null;
      cover_image_url: string | null;
      tags: string[];
      church_id: string | null;
      is_published: boolean;
      visibility?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated.");

      if (editCourse?.id) {
        const { error } = await supabase
          .from("courses")
          .update({
            title: payload.title,
            description: payload.description,
            cover_image_url: payload.cover_image_url,
            tags: payload.tags,
            church_id: payload.church_id,
            is_published: payload.is_published,
            ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
          })
          .eq("id", editCourse.id);
        if (error) throw error;
        return { id: editCourse.id };
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: payload.title,
          description: payload.description,
          cover_image_url: payload.cover_image_url,
          tags: payload.tags,
          church_id: payload.church_id,
          is_published: payload.is_published,
          ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setIsCourseDialogOpen(false);
      const createdId = data?.id;
      setEditCourse(null);

      // Optional: after create, take them straight to builder
      if (createdId && !editCourse) {
        navigate(createPageUrl("CourseBuilder") + `?id=${createdId}`);
      }
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  // --- Roster ---
  const rosterQ = useQuery({
    queryKey: ["course-roster", rosterCourse?.id],
    enabled: canUse && isRosterOpen && !!rosterCourse?.id,
    queryFn: async (): Promise<RosterRow[]> => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id,user_id,role,enrolled_at,profiles:profiles(id,display_name,email,avatar_url)")
        .eq("course_id", rosterCourse!.id)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as RosterRow[];
    },
    staleTime: 5_000,
  });

  const promoteMutation = useMutation({
    mutationFn: async (row: RosterRow) => {
      const next = row.role === "leader" ? "participant" : "leader";
      const { error } = await supabase
        .from("course_enrollments")
        .update({ role: next })
        .eq("course_id", row.course_id)
        .eq("user_id", row.user_id);
      if (error) throw error;
      return next;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-roster", rosterCourse?.id] });
    },
  });

  const openCreateDialog = () => {
    setEditCourse(null);
    setIsCourseDialogOpen(true);
  };

  const openEditDialog = (c: CourseRow) => {
    setEditCourse(c);
    setIsCourseDialogOpen(true);
  };

  const openRoster = (c: CourseRow) => {
    setRosterCourse(c);
    setIsRosterOpen(true);
  };

  const handleCourseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = new FormData(e.currentTarget);
    const getStr = (k: string) => (form.get(k)?.toString() ?? "").trim();

    const tags = getStr("tags")
      ? getStr("tags")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // IMPORTANT:
    // church_id choice depends on how you want to scope courses. For now:
    // - If you're a church admin, default to your first admin church.
    // - Global admin can leave null or pick later (you can extend UI).
    const defaultChurchId =
      editCourse?.church_id ??
      (adminChurchIds.length > 0 ? adminChurchIds[0] : null);

    saveCourseMutation.mutate({
      title: getStr("title"),
      description: getStr("description") || null,
      cover_image_url: getStr("cover_image_url") || null,
      tags,
      church_id: defaultChurchId,
      is_published: editCourse?.is_published ?? false,
      // if you already added this column earlier, keep it. otherwise harmless.
      visibility: editCourse?.visibility ?? "church",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in required</h2>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!canSeeAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Admin access required</h2>
          </div>
          <p className="text-sm text-slate-600">
            You must be a church admin (or global admin) to manage courses.
          </p>
        </GradientCard>
      </div>
    );
  }

  const courses = coursesQ.data ?? [];
  const isBusy = coursesQ.isLoading;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-600 text-white">
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
              <p className="text-violet-100">Build courses and manage participants.</p>
            </div>

            <Button
              onClick={openCreateDialog}
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
        ) : courses.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="No courses yet"
            description="Create your first course to get started."
            action={openCreateDialog}
            actionLabel="Create Course"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c: CourseRow, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GradientCard variant="cool" className="overflow-hidden">
                  {c.cover_image_url && (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={c.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {c.title}
                        </h3>
                        {c.description ? (
                          <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                            {c.description}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500 mt-1">No description</p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(c)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("CourseBuilder") + `?id=${c.id}`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Content
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openRoster(c)}>
                            <Users className="h-4 w-4 mr-2" />
                            Roster
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => deleteCourseMutation.mutate(c.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={c.is_published ? "default" : "secondary"}>
                        {c.is_published ? "Published" : "Draft"}
                      </Badge>
                      {typeof c.visibility === "string" ? (
                        <Badge variant="outline">
                          {c.visibility === "public" ? "Public" : "Church-only"}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <Link to={createPageUrl("CourseBuilder") + `?id=${c.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Manage Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </div>
        )}

        {(coursesQ.isError || deleteCourseMutation.isError) && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(coursesQ.error as any)?.message ||
              (deleteCourseMutation.error as any)?.message ||
              "Failed to load courses."}
          </div>
        )}
      </div>

      {/* Course Create/Edit Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCourse ? "Edit Course" : "Create Course"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCourseSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                name="title"
                defaultValue={editCourse?.title ?? ""}
                required
                placeholder="e.g., Foundations of Faith"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                name="description"
                defaultValue={editCourse?.description ?? ""}
                placeholder="Brief overview of this course"
              />
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                name="tags"
                defaultValue={(editCourse?.tags ?? []).join(", ")}
                placeholder="discipleship, doctrine, prayer"
              />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input
                name="cover_image_url"
                defaultValue={editCourse?.cover_image_url ?? ""}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCourseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveCourseMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {saveCourseMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editCourse ? "Save Changes" : "Create Course"}
              </Button>
            </div>

            {saveCourseMutation.isError ? (
              <div className="text-sm text-rose-700">
                {(saveCourseMutation.error as any)?.message ?? "Failed to save."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>

      {/* Roster Dialog */}
      <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Roster{rosterCourse?.title ? ` — ${rosterCourse.title}` : ""}
            </DialogTitle>
          </DialogHeader>

          {rosterQ.isLoading ? (
            <div className="flex items-center gap-2 text-slate-600 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading roster…
            </div>
          ) : rosterQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {(rosterQ.error as any)?.message ?? "Failed to load roster."}
            </div>
          ) : (rosterQ.data ?? []).length === 0 ? (
            <div className="text-sm text-slate-600 py-6">
              No one has enrolled yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(rosterQ.data ?? []).map((r) => {
                const name =
                  r.profiles?.display_name ||
                  r.profiles?.email ||
                  r.user_id.slice(0, 8);

                const isLeader = r.role === "leader";

                return (
                  <div
                    key={`${r.course_id}:${r.user_id}`}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.profiles?.email ?? ""}{" "}
                        {r.enrolled_at ? `• Enrolled ${new Date(r.enrolled_at).toLocaleDateString()}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isLeader ? "default" : "secondary"}
                        className={cx(isLeader && "bg-violet-600")}
                      >
                        {isLeader ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Leader
                          </span>
                        ) : (
                          "Participant"
                        )}
                      </Badge>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={promoteMutation.isPending}
                        onClick={() => promoteMutation.mutate(r)}
                        className="gap-2"
                      >
                        {promoteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isLeader ? (
                          <>
                            <Shield className="h-4 w-4" />
                            Demote
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Promote
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {promoteMutation.isError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {(promoteMutation.error as any)?.message ?? "Failed to update role."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
