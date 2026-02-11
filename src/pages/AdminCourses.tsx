// src/pages/AdminCourses.tsx
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
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  Loader2,
  Settings,
  BookOpen,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

type ChurchMemberRow = {
  church_id: string;
  user_id: string;
  role: string;
};

type ChurchRow = {
  id: string;
  name: string;
};

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  is_public: boolean; // NEW COLUMN
  created_by: string;
  created_at: string;
  updated_at: string;
};

type CourseFormPayload = {
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  is_public: boolean;
  is_published: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseTags(raw: string) {
  const v = (raw || "").trim();
  if (!v) return [];
  return v
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function AdminCourses() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editCourse, setEditCourse] = useState<CourseRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Controls
  const [selectedChurchId, setSelectedChurchId] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "church">("church"); // maps to is_public
  const [publishState, setPublishState] = useState<"draft" | "published">("draft"); // maps to is_published

  const canUse = !!user?.id && !loading;

  // Which churches can I administer (admin or leader)?
  const myChurchMembershipsQ = useQuery({
    queryKey: ["my-church-memberships-for-courses", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<ChurchMemberRow[]> => {
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id,user_id,role")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []) as ChurchMemberRow[];
    },
    staleTime: 30_000,
  });

  const myAdminChurchIds = useMemo(() => {
    const rows = myChurchMembershipsQ.data ?? [];
    return rows
      .filter((r) => {
        const role = (r.role || "").toLowerCase();
        return role === "admin" || role === "leader";
      })
      .map((r) => r.church_id)
      .filter(Boolean);
  }, [myChurchMembershipsQ.data]);

  const churchesQ = useQuery({
    queryKey: ["churches-for-admin-courses", myAdminChurchIds],
    enabled: canUse && myAdminChurchIds.length > 0,
    queryFn: async (): Promise<ChurchRow[]> => {
      const { data, error } = await supabase.from("churches").select("id,name").in("id", myAdminChurchIds).order("name");
      if (error) throw error;
      return (data ?? []) as ChurchRow[];
    },
    staleTime: 30_000,
  });

  // default church selection
  useEffect(() => {
    if (selectedChurchId) return;
    const list = churchesQ.data ?? [];
    if (list.length > 0) setSelectedChurchId(list[0].id);
  }, [churchesQ.data, selectedChurchId]);

  // Courses I can manage (courses owned by churches where I’m admin/leader)
  const myCoursesQ = useQuery({
    queryKey: ["admin-courses", user?.id, myAdminChurchIds],
    enabled: canUse && myAdminChurchIds.length > 0,
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by,created_at,updated_at")
        .in("church_id", myAdminChurchIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 15_000,
  });

  const openCreate = () => {
    setEditCourse(null);
    setVisibility("church");
    setPublishState("draft");
    setIsDialogOpen(true);
  };

  const openEdit = (c: CourseRow) => {
    setEditCourse(c);
    setSelectedChurchId(c.church_id || selectedChurchId || "");
    setVisibility(c.is_public ? "public" : "church");
    setPublishState(c.is_published ? "published" : "draft");
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CourseFormPayload) => {
      if (!user) throw new Error("Not authenticated.");

      if (editCourse?.id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editCourse.id);
        if (error) throw error;
        return { id: editCourse.id };
      }

      const insertPayload: CourseFormPayload & { created_by: string } = {
        ...payload,
        created_by: user.id,
      };

      const { data, error } = await supabase.from("courses").insert(insertPayload).select("id").single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setIsDialogOpen(false);
      setEditCourse(null);

      // After creating, send to builder
      if (row?.id) {
        navigate(createPageUrl("CourseBuilder") + `?id=${encodeURIComponent(row.id)}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (course: CourseRow) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !course.is_published })
        .eq("id", course.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  const isBusy = loading || myChurchMembershipsQ.isLoading || churchesQ.isLoading || myCoursesQ.isLoading;

  // Guard: must be signed in and be a church admin/leader somewhere
  if (!loading && !user) {
    navigate("/get-started", { replace: true });
    return null;
  }

  const hasAdminAccess = myAdminChurchIds.length > 0;

  if (!loading && user && !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">No admin access</h2>
          <p className="text-sm text-slate-600 mb-6">
            You don’t currently have a Church Admin or Leader role in any church. Ask a church admin to promote you.
          </p>
          <div className="flex justify-end">
            <Link to={createPageUrl("Courses")}>
              <Button variant="outline">Back to Courses</Button>
            </Link>
          </div>
        </GradientCard>
      </div>
    );
  }

  const courses = myCoursesQ.data ?? [];

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
              <h1 className="text-3xl font-serif font-bold mb-2">Admin Courses</h1>
              <p className="text-violet-100">
                Publish controls “ready to take.” Visibility controls “who can see it” (Public vs Church-only).
              </p>
            </div>

            <Button onClick={openCreate} size="lg" className="bg-white text-violet-700 hover:bg-violet-50 gap-2">
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
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course, then add sessions in the builder."
            action={openCreate}
            actionLabel="Create Course"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: CourseRow, i: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 18 }}
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
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{course.title}</div>
                        <div className="text-sm text-slate-600 line-clamp-2">{course.description || ""}</div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(course)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("CourseBuilder") + `?id=${encodeURIComponent(course.id)}`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Sessions
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => togglePublishMutation.mutate(course)}>
                            {course.is_published ? (
                              <EyeOff className="h-4 w-4 mr-2" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            {course.is_published ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => deleteMutation.mutate(course.id)} className="text-red-600">
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

                      <Badge
                        variant="outline"
                        className={cx(
                          "gap-1",
                          course.is_public ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-700"
                        )}
                      >
                        {course.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {course.is_public ? "Public" : "Church-only"}
                      </Badge>
                    </div>

                    {course.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {course.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {t}
                          </span>
                        ))}
                        {course.tags.length > 4 ? (
                          <span className="text-xs text-slate-500">+{course.tags.length - 4}</span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <Link className="flex-1" to={createPageUrl("CourseBuilder") + `?id=${encodeURIComponent(course.id)}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Edit Sessions
                          </Button>
                        </Link>
                        <Link className="flex-1" to={createPageUrl("CourseDetail") + `?id=${encodeURIComponent(course.id)}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </div>
        )}

        {(myCoursesQ.isError || churchesQ.isError || myChurchMembershipsQ.isError) ? (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(myCoursesQ.error as any)?.message ||
              (churchesQ.error as any)?.message ||
              (myChurchMembershipsQ.error as any)?.message ||
              "Failed to load admin courses."}
          </div>
        ) : null}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCourse ? "Edit Course" : "Create Course"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);

              const title = (form.get("title")?.toString() ?? "").trim();
              if (!title) return;

              const description = (form.get("description")?.toString() ?? "").trim() || null;
              const cover = (form.get("cover_image_url")?.toString() ?? "").trim() || null;
              const tags = parseTags(form.get("tags")?.toString() ?? "");

              const payload: CourseFormPayload = {
                church_id: selectedChurchId ? selectedChurchId : null,
                title,
                description,
                tags,
                cover_image_url: cover,
                is_public: visibility === "public",
                is_published: publishState === "published",
              };

              saveMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            <div>
              <Label>Church</Label>
              <select
                value={selectedChurchId}
                onChange={(e) => setSelectedChurchId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                {(churchesQ.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Courses are owned by a church (admins/leaders manage them).</p>
            </div>

            <div>
              <Label>Title</Label>
              <Input name="title" defaultValue={editCourse?.title ?? ""} required placeholder="e.g., Foundations of Faith" className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editCourse?.description ?? ""} placeholder="What will people learn?" className="mt-1 min-h-[90px]" />
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input name="tags" defaultValue={(editCourse?.tags ?? []).join(", ")} placeholder="discipleship, prayer, bible" className="mt-1" />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input name="cover_image_url" defaultValue={editCourse?.cover_image_url ?? ""} placeholder="https://..." className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Visibility</Label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="church">Church-only</option>
                  <option value="public">Public</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Public = anyone can view (if published). Church-only = only members of this church can view (if published).
                </p>
              </div>

              <div>
                <Label>Publish State</Label>
                <select
                  value={publishState}
                  onChange={(e) => setPublishState(e.target.value as any)}
                  className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Draft won’t show on the Courses page (even if visibility is Public).</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editCourse ? "Save" : "Create"}
              </Button>
            </div>

            {saveMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveMutation.error as any)?.message ?? "Failed to save course."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
