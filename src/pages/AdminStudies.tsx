// src/pages/AdminStudies.tsx
import React, { useMemo, useState } from "react";
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
  ChevronRight,
  BookOpen,
  MoreVertical,
  Loader2,
  Users,
  Settings,
  PlayCircle,
  Church,
  User as UserIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";

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
  sections: any[];
  participants_count: number;
  created_at: string;
  updated_at: string;
};

type StudySessionRow = {
  id: string;
  created_by: string;
  church_id: string | null;
  group_id: string | null;
  study_id: string | null;
  title: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  reference: string | null;
  track: "beginner" | "intermediate" | "advanced" | null;
  pray: string | null;
  scripture_text: string | null;
};

type CreateSessionPayload = {
  scope: "personal" | "church";
  study_id: string;
  title: string;
  status: "in_progress" | "completed";
};

export default function AdminStudies() {
  const { user, supabase, loading, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<StudySessionRow | null>(null);

  const [scope, setScope] = useState<"personal" | "church">("personal");
  const [selectedStudyId, setSelectedStudyId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [status, setStatus] = useState<"in_progress" | "completed">("in_progress");

  const canUse = !!user?.id && !!supabase;

  // Published studies that can be used as templates.
  // - Global studies: church_id is null
  // - Church studies: church_id matches profile.church_id (optional)
  const { data: availableStudies = [], isLoading: loadingStudies } = useQuery<StudyRow[]>({
    queryKey: ["available-studies", profile?.church_id ?? "no-church"],
    enabled: canUse,
    queryFn: async () => {
      let q = supabase
        .from("studies")
        .select(
          "id,church_id,title,description,scripture_reference,book,difficulty,estimated_minutes,tags,cover_image_url,is_published,created_by,sections,participants_count,created_at,updated_at"
        )
        .eq("is_published", true)
        .order("updated_at", { ascending: false });

      // Allow both global + church studies (if user has a church selected).
      if (profile?.church_id) {
        q = q.or(`church_id.is.null,church_id.eq.${profile.church_id}`);
      } else {
        q = q.is("church_id", null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as StudyRow[];
    },
  });

  // Sessions list
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySessionRow[]>({
    queryKey: ["study-sessions", scope, user?.id ?? "anon", profile?.church_id ?? "no-church"],
    enabled: canUse,
    queryFn: async () => {
      let q = supabase
        .from("study_sessions")
        .select(
          "id,created_by,church_id,group_id,study_id,title,scripture_reference,book,difficulty,status,started_at,completed_at,created_at,updated_at,reference,track,pray,scripture_text"
        )
        .order("created_at", { ascending: false });

      if (scope === "church") {
        if (!profile?.church_id) return [];
        q = q.eq("church_id", profile.church_id);
      } else {
        q = q.eq("created_by", user!.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as StudySessionRow[];
    },
  });

  const studyById = useMemo(() => {
    const map = new Map<string, StudyRow>();
    for (const s of availableStudies) map.set(s.id, s);
    return map;
  }, [availableStudies]);

  const openCreate = () => {
    setEditSession(null);
    setScope(profile?.church_id ? "church" : "personal");
    setSelectedStudyId(availableStudies[0]?.id ?? "");
    setCustomTitle("");
    setStatus("in_progress");
    setIsDialogOpen(true);
  };

  const openEdit = (s: StudySessionRow) => {
    setEditSession(s);
    setScope(s.church_id ? "church" : "personal");
    setSelectedStudyId(s.study_id ?? "");
    setCustomTitle(s.title ?? "");
    setStatus((s.status as any) === "completed" ? "completed" : "in_progress");
    setIsDialogOpen(true);
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async (payload: CreateSessionPayload) => {
      if (!user) throw new Error("Not authenticated");

      const baseStudy = studyById.get(payload.study_id);
      if (!baseStudy) throw new Error("Please select a study.");

      const isChurch = payload.scope === "church";
      const churchId = isChurch ? (profile?.church_id ?? null) : null;

      const sessionTitle = payload.title.trim() || baseStudy.title;

      const record: Partial<StudySessionRow> & { created_by: string } = {
        created_by: user.id,
        church_id: churchId,
        group_id: null,
        study_id: baseStudy.id,
        title: sessionTitle,
        scripture_reference: baseStudy.scripture_reference ?? null,
        book: baseStudy.book ?? null,
        difficulty: baseStudy.difficulty,
        track: baseStudy.difficulty,
        status: payload.status,
      };

      if (editSession?.id) {
        const { data, error } = await supabase
          .from("study_sessions")
          .update(record)
          .eq("id", editSession.id)
          .select("*")
          .single();
        if (error) throw error;
        return data as any as StudySessionRow;
      }

      const { data, error } = await supabase.from("study_sessions").insert(record).select("*").single();
      if (error) throw error;
      return data as any as StudySessionRow;
    },
    onSuccess: async (createdOrUpdated) => {
      await queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      setIsDialogOpen(false);
      setEditSession(null);

      if (createdOrUpdated?.id) {
        navigate(createPageUrl("StudyBuilder") + `?id=${createdOrUpdated.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_sessions").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
    },
  });

  const canShowChurch = !!profile?.church_id;

  if (loading) {
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
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const isLoading = loadingStudies || loadingSessions;
  const headerTitle = scope === "church" ? "Church Study Sessions" : "My Study Sessions";

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
                <span className="text-amber-100 font-medium">Session Management</span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">{headerTitle}</h1>
              <p className="text-amber-100">
                Sessions let people walk through the same study together—without changing the study content.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canShowChurch ? (
                <div className="flex items-center gap-2 bg-white/15 rounded-xl p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`text-white hover:bg-white/15 ${scope === "personal" ? "bg-white/15" : ""}`}
                    onClick={() => setScope("personal")}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Personal
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`text-white hover:bg-white/15 ${scope === "church" ? "bg-white/15" : ""}`}
                    onClick={() => setScope("church")}
                  >
                    <Church className="h-4 w-4 mr-2" />
                    Church
                  </Button>
                </div>
              ) : null}

              <Button onClick={openCreate} size="lg" className="bg-white text-amber-700 hover:bg-amber-50 gap-2">
                <Plus className="h-5 w-5" />
                New Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s, i) => {
              const baseStudy = s.study_id ? studyById.get(s.study_id) : undefined;
              const cover = baseStudy?.cover_image_url ?? null;

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GradientCard variant="warm" className="overflow-hidden">
                    {cover ? (
                      <div className="h-32 overflow-hidden">
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : null}

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 line-clamp-1">{s.title || baseStudy?.title || "Session"}</h3>
                          <p className="text-sm text-amber-700 line-clamp-1">
                            {s.scripture_reference || baseStudy?.scripture_reference || "—"}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Session
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("StudyBuilder") + `?id=${s.id}`}>
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Open Session
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(s.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant={s.church_id ? "default" : "secondary"}>{s.church_id ? "Church" : "Personal"}</Badge>
                        <Badge variant={s.status === "completed" ? "default" : "secondary"}>
                          {s.status === "completed" ? "Completed" : "In Progress"}
                        </Badge>
                        <DifficultyBadge difficulty={s.difficulty} />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <PlayCircle className="h-4 w-4" />
                          {new Date(s.started_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {/* We don’t have a members table here; participant count can be derived later. */}
                          —
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <Link to={createPageUrl("StudyBuilder") + `?id=${s.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Open Session
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            className=""
            icon={BookOpen}
            title="No sessions yet"
            description="Create a session to walk through a study together (without changing the study content)."
            action={openCreate}
            actionLabel="New Session"
          />
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSession ? "Edit Session" : "Create New Session"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedStudyId) return;

              createOrUpdateMutation.mutate({
                scope,
                study_id: selectedStudyId,
                title: customTitle,
                status,
              });
            }}
            className="space-y-4"
          >
            {canShowChurch ? (
              <div>
                <Label>Session Scope</Label>
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Scope only changes *who shares the session*, not the study content.
                </p>
              </div>
            ) : null}

            <div>
              <Label>Study Template</Label>
              <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingStudies ? "Loading…" : "Select a study"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStudies.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No published studies available
                    </SelectItem>
                  ) : (
                    availableStudies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Session Title (optional)</Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Leave blank to use the study title"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOrUpdateMutation.isPending || !selectedStudyId}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {createOrUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editSession ? "Save Changes" : "Create Session"}
              </Button>
            </div>

            {createOrUpdateMutation.isError ? (
              <div className="text-sm text-red-600">
                {(createOrUpdateMutation.error as any)?.message ?? "Failed to save session."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
