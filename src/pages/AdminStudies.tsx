// src/pages/AdminStudies.tsx
import { useMemo, useState } from "react";
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
  created_by: string; // profiles.id (uuid)
  created_at: string;
  updated_at: string;
};

type StudyFormPayload = {
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: Difficulty;
  estimated_minutes: number | null;
  cover_image_url: string | null;
  tags: string[];
};

export default function AdminStudies() {
  const { user, supabase, loading, profile } = useAuth() as any;
  const navigate = useNavigate();

  const [editStudy, setEditStudy] = useState<StudyRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const canUse = !loading && !!user?.id;

  // "Active church" in your current app: profiles.church_id (from SetupProfile)
  const activeChurchId: string | null = useMemo(() => {
    const v = (profile as any)?.church_id;
    return v ? String(v) : null;
  }, [profile]);

  // For "created by a church": list studies for the active church when set; otherwise, fallback to user-created.
  const listMode: "church" | "mine" = activeChurchId ? "church" : "mine";

  const { data: myStudies = [], isLoading } = useQuery<StudyRow[]>({
    queryKey: ["admin-studies", listMode, activeChurchId ?? "none", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      let q = supabase.from("studies").select("*").order("created_at", { ascending: false });

      if (listMode === "church" && activeChurchId) {
        q = q.eq("church_id", activeChurchId);
      } else {
        q = q.eq("created_by", user.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as StudyRow[];
    },
  });

  const saveMutation = useMutation<StudyRow, unknown, StudyFormPayload>({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error("Not authenticated");

      const base = {
        ...payload,
        // Wire to new DB structure:
        created_by: user.id,
        church_id: activeChurchId ?? null,
      };

      if (editStudy?.id) {
        const { data, error } = await supabase
          .from("studies")
          .update(base)
          .eq("id", editStudy.id)
          .select("*")
          .single();
        if (error) throw error;
        return data as any as StudyRow;
      }

      const { data, error } = await supabase.from("studies").insert(base).select("*").single();
      if (error) throw error;
      return data as any as StudyRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-studies"] });
      setIsDialogOpen(false);
      setEditStudy(null);
    },
  });

  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("studies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-studies"] }),
  });

  const togglePublishMutation = useMutation<StudyRow, unknown, StudyRow>({
    mutationFn: async (study) => {
      const { data, error } = await supabase
        .from("studies")
        .update({ is_published: !study.is_published })
        .eq("id", study.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as any as StudyRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-studies"] }),
  });

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

    const difficulty = (getStr("difficulty") as Difficulty) || "beginner";
    const estimatedRaw = getStr("estimated_minutes");
    const estimatedMinutes = estimatedRaw ? Number.parseInt(estimatedRaw, 10) : NaN;

    saveMutation.mutate({
      title: getStr("title"),
      description: getStr("description") || null,
      scripture_reference: getStr("scripture_reference") || null,
      book: getStr("book") || null,
      difficulty,
      estimated_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : null,
      cover_image_url: getStr("cover_image_url") || null,
      tags,
    });
  };

  const openEditDialog = (study: StudyRow | null = null) => {
    setEditStudy(study);
    setIsDialogOpen(true);
  };

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    // Not logged in: send to auth page
    navigate("/auth", { replace: true });
    return null;
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
                <span className="text-amber-100 font-medium">
                  {listMode === "church" ? "Church Study Management" : "Study Management"}
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">
                {listMode === "church" ? "Church Scripture Studies" : "My Scripture Studies"}
              </h1>
              <p className="text-amber-100">Create guided studies to help others explore God&apos;s Word</p>
              {listMode === "church" ? (
                <p className="text-amber-100/90 text-sm mt-2">
                  Using active church from your profile setup.
                </p>
              ) : null}
            </div>

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
        ) : myStudies.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myStudies.map((study: StudyRow, i: number) => (
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
                        <p className="text-sm text-amber-700">{study.scripture_reference ?? "—"}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(study)}>
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

                          <DropdownMenuItem onClick={() => deleteMutation.mutate(study.id)} className="text-red-600">
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
                      {study.estimated_minutes ? (
                        <Badge variant="outline">{study.estimated_minutes} min</Badge>
                      ) : null}
                    </div>

                    {Array.isArray(study.tags) && study.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {study.tags.slice(0, 5).map((t) => (
                          <Badge key={t} variant="outline" className="text-slate-700">
                            {t}
                          </Badge>
                        ))}
                        {study.tags.length > 5 ? (
                          <Badge variant="outline" className="text-slate-500">
                            +{study.tags.length - 5}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}

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
            action={() => openEditDialog()}
            actionLabel="Create Study"
          />
        )}
      </div>

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
              <Input
                name="tags"
                defaultValue={(editStudy?.tags ?? []).join(", ")}
                placeholder="grace, faith, salvation"
              />
            </div>

            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input
                name="cover_image_url"
                defaultValue={editStudy?.cover_image_url ?? ""}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editStudy ? "Save Changes" : "Create Study"}
              </Button>
            </div>

            {saveMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveMutation.error as any)?.message ?? "Failed to save study."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
