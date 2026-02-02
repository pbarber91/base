import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  MoreVertical,
  Loader2,
  Users,
  Settings,
  PlayCircle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import EmptyState from "@/components/shared/EmptyState";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";

type ProfileRow = {
  id: string;
  church_id: string | null;
};

type StudyRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string;
  participants_count: number;
  sections: any[];
  created_at: string;
};

type StudyFormPayload = {
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number | null;
  cover_image_url: string | null;
  tags: string[];
  is_published?: boolean;
  church_id?: string | null;
};

export default function AdminStudies() {
  const { user, supabase, loading } = useAuth();
  const queryClient = useQueryClient();

  const [editStudy, setEditStudy] = useState<StudyRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canUse = !!user?.id;

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["admin-studies-profile", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,church_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  /**
   * WHAT WE SHOW:
   * - Published studies (global + church-specific)
   * - Plus any studies created_by the current user (drafts included)
   *
   * If you want ONLY published studies for regular users and ONLY church-owned studies for church admins,
   * adjust this filter accordingly.
   */
  const { data: studies = [], isLoading } = useQuery<StudyRow[]>({
    queryKey: ["admin-studies", user?.id ?? "anon", profile?.church_id ?? "none"],
    enabled: canUse && !loadingProfile,
    queryFn: async () => {
      // Pull:
      // 1) published global (church_id null)
      // 2) published for my church (church_id = profile.church_id)
      // 3) any created_by me (so I can manage my drafts)
      const churchId = profile?.church_id ?? null;

      // Supabase OR logic:
      // is_published = true AND (church_id is null OR church_id = myChurch)
      // OR created_by = me
      const base = supabase
        .from("studies")
        .select(
          "id,church_id,title,description,scripture_reference,book,difficulty,estimated_minutes,tags,cover_image_url,is_published,created_by,participants_count,sections,created_at"
        )
        .order("created_at", { ascending: false });

      const orParts: string[] = [];
      // created_by = me
      orParts.push(`created_by.eq.${user!.id}`);

      // published global
      orParts.push(`and(is_published.eq.true,church_id.is.null)`);

      // published for my church
      if (churchId) {
        orParts.push(`and(is_published.eq.true,church_id.eq.${churchId})`);
      }

      const { data, error } = await base.or(orParts.join(","));
      if (error) throw error;

      return ((data as any[]) ?? []) as StudyRow[];
    },
  });

  const myChurchId = profile?.church_id ?? null;

  const saveMutation = useMutation<any, unknown, StudyFormPayload>({
    mutationFn: async (payload) => {
      if (!user) throw new Error("Not authenticated");

      // If you DO NOT want anyone creating studies here, you can delete this mutation entirely
      // and remove the UI that calls it.
      if (editStudy?.id) {
        const { data, error } = await supabase
          .from("studies")
          .update({
            ...payload,
            // keep existing sections/participants_count as-is
            updated_at: new Date().toISOString(),
          })
          .eq("id", editStudy.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("studies")
        .insert({
          ...payload,
          created_by: user.id,
          church_id: payload.church_id ?? null,
          sections: [], // still in schema, but NOT used as course builder
          participants_count: 0,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-studies"] });
      setIsDialogOpen(false);
      setEditStudy(null);
    },
  });

  const deleteMutation = useMutation<any, unknown, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("studies").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-studies"] }),
  });

  const togglePublishMutation = useMutation<any, unknown, StudyRow>({
    mutationFn: async (study) => {
      const { data, error } = await supabase
        .from("studies")
        .update({ is_published: !study.is_published, updated_at: new Date().toISOString() })
        .eq("id", study.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-studies"] }),
  });

  /**
   * THE IMPORTANT PART:
   * "Start Together" creates a study_sessions row that points at the study.
   * This is how church/group “walk through together” happens.
   */
  const startTogetherMutation = useMutation<any, unknown, StudyRow>({
    mutationFn: async (study) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          created_by: user.id,
          church_id: myChurchId, // null if user has no church selected
          group_id: null, // later: allow choosing a group
          study_id: study.id,
          title: study.title,
          scripture_reference: study.scripture_reference,
          book: study.book,
          difficulty: study.difficulty,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // We don't know your session detail route, so keep this safe.
      alert(`Study session started.\nSession ID: ${data?.id}`);
      queryClient.invalidateQueries({ queryKey: ["admin-studies"] });
    },
  });

  const openEditDialog = (study: StudyRow | null = null) => {
    setEditStudy(study);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const getStr = (key: string) => (formData.get(key)?.toString() ?? "").trim();

    const tags = getStr("tags")
      ? getStr("tags")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload: StudyFormPayload = {
      title: getStr("title"),
      description: getStr("description") || null,
      scripture_reference: getStr("scripture_reference") || null,
      book: getStr("book") || null,
      difficulty: (getStr("difficulty") as any) || "beginner",
      estimated_minutes: Number.parseInt(getStr("estimated_minutes") || "20", 10) || 20,
      cover_image_url: getStr("cover_image_url") || null,
      tags,
      // If you want studies created here to default to the user's church when they have one:
      church_id: myChurchId,
    };

    saveMutation.mutate(payload);
  };

  const visibleStudies = useMemo(() => studies, [studies]);

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in required</h2>
          <Button onClick={() => (window.location.href = "/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Settings className="h-6 w-6" />
                </div>
                <span className="text-amber-100 font-medium">Study Management</span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">Studies</h1>
              <p className="text-amber-100">
                Studies stay the same everywhere — start a session when you want to go through one together.
              </p>
            </div>

            {/* Optional: If you don't want admins creating studies, remove this button + dialog entirely */}
            <Button onClick={() => openEditDialog()} size="lg" className="bg-white text-amber-700 hover:bg-amber-50 gap-2">
              <Plus className="h-5 w-5" />
              Create Study
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          </div>
        ) : visibleStudies.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleStudies.map((study, i) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GradientCard variant="warm" className="overflow-hidden">
                  {study.cover_image_url ? (
                    <div className="h-32 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={study.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 line-clamp-1">{study.title}</h3>
                        <p className="text-sm text-amber-700">{study.scripture_reference ?? ""}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startTogetherMutation.mutate(study)}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Together
                          </DropdownMenuItem>

                          {/* Optional admin controls */}
                          <DropdownMenuItem onClick={() => openEditDialog(study)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => togglePublishMutation.mutate(study)}>
                            {study.is_published ? (
                              <EyeOff className="h-4 w-4 mr-2" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            {study.is_published ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(study.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={study.is_published ? "default" : "secondary"}>
                        {study.is_published ? "Published" : "Draft"}
                      </Badge>
                      <DifficultyBadge difficulty={study.difficulty} />
                      {study.church_id ? <Badge variant="outline">Church</Badge> : <Badge variant="outline">Personal</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        Study
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {study.participants_count || 0}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => startTogetherMutation.mutate(study)}
                        disabled={startTogetherMutation.isPending}
                      >
                        {startTogetherMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Start Together
                      </Button>
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No studies yet"
            description="Create a study or publish one for your church to start together."
            action={() => openEditDialog()}
            actionLabel="Create Study"
          />
        )}
      </div>

      {/* Optional: Create/Edit study details dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStudy ? "Edit Study" : "Create New Study"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Study Title</Label>
              <Input
                name="title"
                defaultValue={editStudy?.title ?? ""}
                required
                placeholder="e.g., The Sermon on the Mount"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                name="description"
                defaultValue={editStudy?.description ?? ""}
                placeholder="Brief overview of this study"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scripture Reference</Label>
                <Input
                  name="scripture_reference"
                  defaultValue={editStudy?.scripture_reference ?? ""}
                  placeholder="e.g., Matthew 5-7"
                />
              </div>
              <div>
                <Label>Bible Book</Label>
                <Input name="book" defaultValue={editStudy?.book ?? ""} placeholder="e.g., Matthew" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select name="difficulty" defaultValue={editStudy?.difficulty || "beginner"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Minutes</Label>
                <Input
                  name="estimated_minutes"
                  type="number"
                  defaultValue={editStudy?.estimated_minutes ?? 20}
                  min={5}
                />
              </div>
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input name="tags" defaultValue={(editStudy?.tags ?? []).join(", ")} placeholder="grace, faith, salvation" />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input name="cover_image_url" defaultValue={editStudy?.cover_image_url ?? ""} placeholder="https://..." />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editStudy ? "Save Changes" : "Create Study"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
