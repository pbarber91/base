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
  PlayCircle,
  Loader2,
  Users,
  Settings,
  Church,
  User,
} from "lucide-react";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import EmptyState from "@/components/shared/EmptyState";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
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
  sections: any[];
  participants_count: number;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  created_by: string;
  church_id: string | null;
  group_id: string | null;
  study_id: string | null;
  title: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: Difficulty;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  church_id: string | null;
};

type ChurchRow = { id: string; name: string };
type GroupRow = { id: string; name: string; church_id: string | null };

type StudyFormPayload = {
  title: string;
  description: string;
  scripture_reference: string;
  book: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  cover_image_url: string;
  tags: string[];
  is_published: boolean;
};

type StartMode = "solo" | "church" | "group";

export default function AdminStudies() {
  const { user, supabase, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editStudy, setEditStudy] = useState<StudyRow | null>(null);
  const [isStudyDialogOpen, setIsStudyDialogOpen] = useState(false);

  const [startForStudy, setStartForStudy] = useState<StudyRow | null>(null);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [startMode, setStartMode] = useState<StartMode>("church");
  const [startChurchId, setStartChurchId] = useState<string>("");
  const [startGroupId, setStartGroupId] = useState<string>("");

  const canUse = !!user?.id;

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["profile-lite", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,church_id")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: churches = [], isLoading: loadingChurches } = useQuery<ChurchRow[]>({
    queryKey: ["churches-list"],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery<GroupRow[]>({
    queryKey: ["groups-list-for-admin"],
    enabled: canUse,
    queryFn: async () => {
      // If you want to restrict to a user's church later, do it here.
      const { data, error } = await supabase.from("groups").select("id,name,church_id").order("name", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const activeChurchId = useMemo(() => profile?.church_id ?? "", [profile?.church_id]);

  // Keep default church selection sensible
  React.useEffect(() => {
    if (!isStartDialogOpen) return;

    if (startMode === "church") {
      const fallback = activeChurchId || (churches[0]?.id ?? "");
      if (!startChurchId && fallback) setStartChurchId(String(fallback));
    }

    if (startMode === "group") {
      // If user has an active church, prefer its groups
      const preferredGroup =
        (activeChurchId ? groups.find((g) => g.church_id === activeChurchId) : null) || groups[0] || null;
      if (!startGroupId && preferredGroup?.id) setStartGroupId(String(preferredGroup.id));
    }
  }, [isStartDialogOpen, startMode, activeChurchId, churches, groups, startChurchId, startGroupId]);

  const { data: myStudies = [], isLoading: loadingStudies } = useQuery<StudyRow[]>({
    queryKey: ["studies-templates", user?.id ?? "anon"],
    enabled: canUse,
    queryFn: async () => {
      // Templates can be created by any user (and optionally tied to a church_id).
      // We’ll show:
      //  - studies created by me
      //  - studies for my active church (if any)
      const uid = user!.id;

      const base = supabase.from("studies").select("*").order("updated_at", { ascending: false });

      if (activeChurchId) {
        const { data, error } = await base.or(`created_by.eq.${uid},church_id.eq.${activeChurchId}`);
        if (error) throw error;
        return (data as any[]) ?? [];
      }

      const { data, error } = await base.eq("created_by", uid);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: mySessions = [], isLoading: loadingSessions } = useQuery<SessionRow[]>({
    queryKey: ["study-sessions-admin", user?.id ?? "anon", activeChurchId || "none"],
    enabled: canUse,
    queryFn: async () => {
      // Show sessions:
      // - created by me
      // - OR sessions for my active church (if set)
      const uid = user!.id;
      const base = supabase.from("study_sessions").select("*").order("started_at", { ascending: false });

      if (activeChurchId) {
        const { data, error } = await base.or(`created_by.eq.${uid},church_id.eq.${activeChurchId}`);
        if (error) throw error;
        return (data as any[]) ?? [];
      }

      const { data, error } = await base.eq("created_by", uid);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const saveStudyMutation = useMutation<any, unknown, StudyFormPayload>({
    mutationFn: async (payload) => {
      if (!user) throw new Error("Not authenticated");

      const tags = Array.isArray(payload.tags) ? payload.tags : [];

      if (editStudy?.id) {
        const { error } = await supabase
          .from("studies")
          .update({
            title: payload.title,
            description: payload.description || null,
            scripture_reference: payload.scripture_reference || null,
            book: payload.book || null,
            difficulty: payload.difficulty,
            estimated_minutes: payload.estimated_minutes ?? null,
            cover_image_url: payload.cover_image_url || null,
            tags,
            is_published: !!payload.is_published,
          })
          .eq("id", editStudy.id);

        if (error) throw error;
        return true;
      }

      // For “church created study template”, simply set church_id.
      // IMPORTANT: This DOES NOT change study content/prompt logic—just scopes ownership/visibility.
      const churchIdToUse = activeChurchId || null;

      const { error } = await supabase.from("studies").insert({
        church_id: churchIdToUse,
        title: payload.title,
        description: payload.description || null,
        scripture_reference: payload.scripture_reference || null,
        book: payload.book || null,
        difficulty: payload.difficulty,
        estimated_minutes: payload.estimated_minutes ?? null,
        tags,
        cover_image_url: payload.cover_image_url || null,
        is_published: !!payload.is_published,
        created_by: user.id,
        // keep sections empty by default; the “study content” should remain code-driven, not admin-authored
        sections: [],
        participants_count: 0,
      });

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["studies-templates"] });
      setIsStudyDialogOpen(false);
      setEditStudy(null);
    },
  });

  const deleteStudyMutation = useMutation<any, unknown, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("studies").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["studies-templates"] });
    },
  });

  const startSessionMutation = useMutation<any, unknown, { study: StudyRow; mode: StartMode; churchId?: string; groupId?: string }>({
    mutationFn: async ({ study, mode, churchId, groupId }) => {
      if (!user) throw new Error("Not authenticated");

      const sessionChurchId = mode === "church" ? (churchId || null) : mode === "group" ? null : null;
      const sessionGroupId = mode === "group" ? (groupId || null) : null;

      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          created_by: user.id,
          church_id: sessionChurchId,
          group_id: sessionGroupId,
          study_id: study.id,
          title: study.title,
          scripture_reference: study.scripture_reference,
          book: study.book,
          difficulty: study.difficulty,
          status: "in_progress",
        })
        .select("*")
        .single();

      if (error) throw error;

      return data as SessionRow;
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ["study-sessions-admin"] });
      setIsStartDialogOpen(false);
      setStartForStudy(null);

      // Session Manager (repurposed StudyBuilder)
      navigate(createPageUrl("StudyBuilder") + `?sessionId=${session.id}`);
    },
  });

  const openStudyDialog = (study: StudyRow | null = null) => {
    setEditStudy(study);
    setIsStudyDialogOpen(true);
  };

  const openStartDialog = (study: StudyRow) => {
    setStartForStudy(study);
    setStartMode(activeChurchId ? "church" : "solo");
    setStartChurchId("");
    setStartGroupId("");
    setIsStartDialogOpen(true);
  };

  const handleStudySubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

    saveStudyMutation.mutate({
      title: getStr("title"),
      description: getStr("description"),
      scripture_reference: getStr("scripture_reference"),
      book: getStr("book"),
      difficulty,
      estimated_minutes: Number.parseInt(getStr("estimated_minutes") || "20", 10) || 20,
      cover_image_url: getStr("cover_image_url"),
      tags,
      is_published: getStr("is_published") === "true",
    });
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const showTopLoading = loadingStudies || loadingSessions;

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
                <span className="text-amber-100 font-medium">Study Sessions</span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">Studies</h1>
              <p className="text-amber-100">
                Studies stay the same. A “church study” is simply a <span className="font-semibold">shared session</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
                  <User className="h-3.5 w-3.5 mr-1" />
                  {profile?.display_name || user.email}
                </Badge>
                {activeChurchId ? (
                  <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
                    <Church className="h-3.5 w-3.5 mr-1" />
                    Active church linked
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
                    No active church
                  </Badge>
                )}
              </div>
            </div>

            <Button onClick={() => openStudyDialog()} size="lg" className="bg-white text-amber-700 hover:bg-amber-50 gap-2">
              <Plus className="h-5 w-5" />
              Create Study Template
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Active Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Active Sessions</h2>
            <span className="text-sm text-slate-500">{mySessions.length} total</span>
          </div>

          {loadingSessions ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : mySessions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySessions.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GradientCard variant="warm" className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 line-clamp-1">{s.title || "Untitled Session"}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1">{s.scripture_reference || ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <DifficultyBadge difficulty={s.difficulty} />
                          {s.church_id ? (
                            <Badge variant="outline" className="text-slate-700">
                              Church session
                            </Badge>
                          ) : s.group_id ? (
                            <Badge variant="outline" className="text-slate-700">
                              Group session
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-700">
                              Solo session
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Link to={createPageUrl("StudyBuilder") + `?sessionId=${s.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Users className="h-4 w-4" />
                          Open
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                      Started: {new Date(s.started_at).toLocaleString()}
                    </div>
                  </GradientCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No sessions yet"
              description="Start a session from a study template below to go through it together."
              actionLabel="Create a study template"
              action={() => openStudyDialog()}
            />
          )}
        </div>

        {/* Study Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Study Templates</h2>
            <span className="text-sm text-slate-500">{myStudies.length} total</span>
          </div>

          {loadingStudies ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : myStudies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myStudies.map((study, i) => (
                <motion.div key={study.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <GradientCard variant="warm" className="overflow-hidden">
                    {study.cover_image_url ? (
                      <div className="h-32 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={study.cover_image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : null}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 line-clamp-1">{study.title}</h3>
                          <p className="text-sm text-amber-700 line-clamp-1">{study.scripture_reference || ""}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openStudyDialog(study)} title="Edit template">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStudyMutation.mutate(study.id)}
                            className="text-red-500 hover:text-red-600"
                            title="Delete template"
                            disabled={deleteStudyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <DifficultyBadge difficulty={study.difficulty} />
                        <Badge variant={study.is_published ? "default" : "secondary"}>{study.is_published ? "Published" : "Draft"}</Badge>
                        {study.church_id ? <Badge variant="outline">Church-owned template</Badge> : <Badge variant="outline">Personal template</Badge>}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <PlayCircle className="h-4 w-4" /> Start session
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <Button
                          onClick={() => openStartDialog(study)}
                          className="w-full bg-amber-600 hover:bg-amber-700 gap-2"
                          disabled={showTopLoading}
                        >
                          <PlayCircle className="h-4 w-4" />
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
              icon={Plus}
              title="No study templates yet"
              description="Create a template, then start a session to do it together."
              action={() => openStudyDialog()}
              actionLabel="Create Study Template"
            />
          )}
        </div>
      </div>

      {/* Create/Edit Study Template Dialog */}
      <Dialog open={isStudyDialogOpen} onOpenChange={setIsStudyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStudy ? "Edit Study Template" : "Create Study Template"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleStudySubmit} className="space-y-4">
            <div>
              <Label>Study Title</Label>
              <Input name="title" defaultValue={editStudy?.title ?? ""} required placeholder="e.g., The Sermon on the Mount" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editStudy?.description ?? ""} placeholder="Brief overview (optional)" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scripture Reference</Label>
                <Input name="scripture_reference" defaultValue={editStudy?.scripture_reference ?? ""} placeholder="e.g., Matthew 5–7" />
              </div>
              <div>
                <Label>Bible Book</Label>
                <Input name="book" defaultValue={editStudy?.book ?? ""} placeholder="e.g., Matthew" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select name="difficulty" defaultValue={(editStudy?.difficulty as Difficulty) || "beginner"}>
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
                <Input name="estimated_minutes" type="number" defaultValue={editStudy?.estimated_minutes ?? 20} min={5} />
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

            <div>
              <Label>Publish</Label>
              <Select name="is_published" defaultValue={editStudy?.is_published ? "true" : "false"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Draft</SelectItem>
                  <SelectItem value="true">Published</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Publishing affects visibility, not the study’s prompts/resources (those stay code-driven).
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsStudyDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveStudyMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {saveStudyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editStudy ? "Save Changes" : "Create Template"}
              </Button>
            </div>

            {saveStudyMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveStudyMutation.error as any)?.message ?? "Failed to save study template."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>

      {/* Start Session Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Together</DialogTitle>
          </DialogHeader>

          {startForStudy ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border">
                <div className="font-semibold text-slate-800">{startForStudy.title}</div>
                <div className="text-sm text-slate-600">{startForStudy.scripture_reference || ""}</div>
              </div>

              <div>
                <Label>How do you want to start?</Label>
                <Select value={startMode} onValueChange={(v) => setStartMode(v as StartMode)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo (just me)</SelectItem>
                    <SelectItem value="church">As a church</SelectItem>
                    <SelectItem value="group">As a group</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  “As a church/group” creates a shared <span className="font-medium">session</span> other people can join.
                </p>
              </div>

              {startMode === "church" ? (
                <div>
                  <Label>Church</Label>
                  <Select value={startChurchId} onValueChange={setStartChurchId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingChurches ? "Loading…" : "Select church"} />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    This uses your profile’s church selection as the default. (You can tighten permissions later.)
                  </p>
                </div>
              ) : null}

              {startMode === "group" ? (
                <div>
                  <Label>Group</Label>
                  <Select value={startGroupId} onValueChange={setStartGroupId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingGroups ? "Loading…" : "Select group"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsStartDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    startSessionMutation.mutate({
                      study: startForStudy,
                      mode: startMode,
                      churchId: startChurchId || undefined,
                      groupId: startGroupId || undefined,
                    })
                  }
                  disabled={
                    startSessionMutation.isPending ||
                    (startMode === "church" && !startChurchId) ||
                    (startMode === "group" && !startGroupId)
                  }
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                >
                  {startSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Start Session
                </Button>
              </div>

              {startSessionMutation.isError ? (
                <div className="text-sm text-red-600">
                  {(startSessionMutation.error as any)?.message ?? "Failed to start session."}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
