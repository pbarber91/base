// src/pages/AdminStudies.tsx
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
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";

type Difficulty = "beginner" | "intermediate" | "advanced";

type StudyRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: Difficulty;
  estimated_minutes: number | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  sections: any[];
  participants_count: number;
};

type ProfileRow = {
  id: string;
  church_id: string | null;
};

type ChurchRow = {
  id: string;
  name: string;
};

type StudyFormState = {
  owner: "personal" | "church";
  title: string;
  description: string;
  scripture_reference: string;
  book: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  cover_image_url: string;
  tagsRaw: string; // comma-separated for UI
};

const DEFAULT_FORM: StudyFormState = {
  owner: "personal",
  title: "",
  description: "",
  scripture_reference: "",
  book: "",
  difficulty: "beginner",
  estimated_minutes: 20,
  cover_image_url: "",
  tagsRaw: "",
};

export default function AdminStudies() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editStudy, setEditStudy] = useState<StudyRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<StudyFormState>(DEFAULT_FORM);

  const canUse = !!user?.id;

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["profile-for-admin-studies", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,church_id").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const activeChurchId = profile?.church_id ?? null;

  const { data: activeChurch, isLoading: loadingChurch } = useQuery<ChurchRow | null>({
    queryKey: ["church-for-admin-studies", activeChurchId ?? "none"],
    enabled: !!activeChurchId && canUse,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").eq("id", activeChurchId).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: studies = [], isLoading: loadingStudies } = useQuery<StudyRow[]>({
    queryKey: ["studies-admin", user?.id ?? "anon", activeChurchId ?? "none"],
    enabled: canUse && !loadingProfile,
    queryFn: async () => {
      // Show:
      // - anything I created, plus
      // - anything tied to my active church (so church studies and personal studies are still the same underlying thing)
      const or = activeChurchId
        ? `created_by.eq.${user!.id},church_id.eq.${activeChurchId}`
        : `created_by.eq.${user!.id}`;

      const { data, error } = await supabase
        .from("studies")
        .select("*")
        .or(or)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = ((data as any[]) ?? []).map((r) => ({
        ...r,
        tags: Array.isArray(r.tags) ? r.tags : [],
        sections: Array.isArray(r.sections) ? r.sections : [],
      }));

      return rows as StudyRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const tags = form.tagsRaw
        ? form.tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scripture_reference: form.scripture_reference.trim() || null,
        book: form.book.trim() || null,
        difficulty: form.difficulty,
        estimated_minutes: Number.isFinite(form.estimated_minutes) ? form.estimated_minutes : 20,
        cover_image_url: form.cover_image_url.trim() || null,
        tags,
        // key part: "church study" is the SAME thing, just with church_id set.
        church_id: form.owner === "church" ? activeChurchId : null,
      };

      if (!payload.title) throw new Error("Title is required.");

      if (editStudy?.id) {
        const { data, error } = await supabase.from("studies").update(payload).eq("id", editStudy.id).select("*").single();
        if (error) throw error;
        return data as any;
      }

      const insertPayload = {
        ...payload,
        created_by: user.id,
        sections: [],
        participants_count: 0,
        is_published: false,
      };

      const { data, error } = await supabase.from("studies").insert(insertPayload).select("*").single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: async (created: any) => {
      await queryClient.invalidateQueries({ queryKey: ["studies-admin"] });
      setIsDialogOpen(false);
      setEditStudy(null);
      setForm(DEFAULT_FORM);

      // Optional: jump straight into builder after creating
      if (created?.id && !editStudy?.id) {
        navigate(createPageUrl("StudyBuilder") + `?id=${created.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("studies").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["studies-admin"] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (study: StudyRow) => {
      const { data, error } = await supabase
        .from("studies")
        .update({ is_published: !study.is_published })
        .eq("id", study.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["studies-admin"] });
    },
  });

  const openCreate = () => {
    setEditStudy(null);
    setForm({
      ...DEFAULT_FORM,
      owner: activeChurchId ? "church" : "personal",
    });
    setIsDialogOpen(true);
  };

  const openEdit = (study: StudyRow) => {
    setEditStudy(study);
    setForm({
      owner: study.church_id ? "church" : "personal",
      title: study.title ?? "",
      description: study.description ?? "",
      scripture_reference: study.scripture_reference ?? "",
      book: study.book ?? "",
      difficulty: (study.difficulty ?? "beginner") as Difficulty,
      estimated_minutes: study.estimated_minutes ?? 20,
      cover_image_url: study.cover_image_url ?? "",
      tagsRaw: Array.isArray(study.tags) ? study.tags.join(", ") : "",
    });
    setIsDialogOpen(true);
  };

  const isLoading = loading || loadingProfile || loadingStudies;

  // If not logged in, kick to auth (avoid blank white states)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  const headerSubtitle = useMemo(() => {
    if (!activeChurchId) return "Create guided studies for personal use or for your church.";
    if (loadingChurch) return "Create guided studies for personal use or for your church.";
    return activeChurch?.name
      ? `Create guided studies for personal use or for ${activeChurch.name}.`
      : "Create guided studies for personal use or for your church.";
  }, [activeChurchId, activeChurch?.name, loadingChurch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) return null;

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
              <p className="text-amber-100">{headerSubtitle}</p>
            </div>
            <Button onClick={openCreate} size="lg" className="bg-white text-amber-700 hover:bg-amber-50 gap-2">
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
        ) : studies.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study, i) => (
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
                          <DropdownMenuItem onClick={() => openEdit(study)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("StudyBuilder") + `?id=${study.id}`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Sections
                            </Link>
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
                      {study.church_id ? (
                        <Badge variant="outline">Church</Badge>
                      ) : (
                        <Badge variant="outline">Personal</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{Array.isArray(study.sections) ? study.sections.length : 0} sections</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {study.participants_count ?? 0}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Link to={createPageUrl("StudyBuilder") + `?id=${study.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Edit Sections
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
            title="No studies yet"
            description="Create your first scripture study to guide others through God&apos;s Word."
            action={openCreate}
            actionLabel="Create Study"
          />
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStudy ? "Edit Study" : "Create New Study"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Owner</Label>
              <Select
                value={form.owner}
                onValueChange={(v) => setForm((s) => ({ ...s, owner: v as "personal" | "church" }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="church" disabled={!activeChurchId}>
                    {activeChurch?.name ? `Church: ${activeChurch.name}` : "Church"}
                  </SelectItem>
                </SelectContent>
              </Select>
              {!activeChurchId ? (
                <p className="text-xs text-slate-500 mt-1">
                  Select a church in profile setup to create church-owned studies.
                </p>
              ) : null}
            </div>

            <div>
              <Label>Study Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                required
                placeholder="e.g., The Sermon on the Mount"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Brief overview of this study"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scripture Reference</Label>
                <Input
                  value={form.scripture_reference}
                  onChange={(e) => setForm((s) => ({ ...s, scripture_reference: e.target.value }))}
                  placeholder="e.g., Matthew 5-7"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Bible Book</Label>
                <Input
                  value={form.book}
                  onChange={(e) => setForm((s) => ({ ...s, book: e.target.value }))}
                  placeholder="e.g., Matthew"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm((s) => ({ ...s, difficulty: v as Difficulty }))}
                >
                  <SelectTrigger className="mt-1">
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
                  type="number"
                  value={form.estimated_minutes}
                  onChange={(e) => setForm((s) => ({ ...s, estimated_minutes: Number(e.target.value) }))}
                  min={5}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={form.tagsRaw}
                onChange={(e) => setForm((s) => ({ ...s, tagsRaw: e.target.value }))}
                placeholder="grace, faith, salvation"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input
                value={form.cover_image_url}
                onChange={(e) => setForm((s) => ({ ...s, cover_image_url: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            {saveMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveMutation.error as any)?.message ?? "Failed to save study."}
              </div>
            ) : null}

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
