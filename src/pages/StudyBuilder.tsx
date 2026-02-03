// src/pages/StudyBuilder.tsx
// Repurposed as Session Manager (kept filename + route name to match your existing navigation).
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, Loader2, Save, Users, MessageCircle, StickyNote, Lock } from "lucide-react";
import GradientCard from "@/components/ui/GradientCard";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import { useAuth } from "@/auth/AuthProvider";

type StudyRow = {
  id: string;
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  cover_image_url: string | null;
  is_published: boolean;
  sections: any[];
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

type SessionResponseRow = {
  id: string;
  session_id: string;
  user_id: string;
  responses: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function StudyBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("id");

  const { user, supabase, loading, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPray, setEditPray] = useState("");
  const [editScriptureText, setEditScriptureText] = useState("");
  const [editStatus, setEditStatus] = useState<"in_progress" | "completed">("in_progress");

  const canUse = !!user?.id && !!sessionId;

  const { data: session, isLoading: loadingSession } = useQuery<StudySessionRow | null>({
    queryKey: ["study-session", sessionId],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "id,created_by,church_id,group_id,study_id,title,scripture_reference,book,difficulty,status,started_at,completed_at,created_at,updated_at,reference,track,pray,scripture_text"
        )
        .eq("id", sessionId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: study, isLoading: loadingStudy } = useQuery<StudyRow | null>({
    queryKey: ["study-template", session?.study_id ?? "none"],
    enabled: !!session?.study_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studies")
        .select("id,title,description,scripture_reference,book,difficulty,cover_image_url,is_published,sections")
        .eq("id", session!.study_id!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // All responses for this session (simple “social” visibility)
  const { data: responses = [], isLoading: loadingResponses } = useQuery<SessionResponseRow[]>({
    queryKey: ["session-responses", sessionId],
    enabled: canUse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_session_responses")
        .select("id,session_id,user_id,responses,notes,created_at,updated_at")
        .eq("session_id", sessionId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) ?? []) as SessionResponseRow[];
    },
  });

  const myResponse = useMemo(() => {
    if (!user?.id) return null;
    return responses.find((r) => r.user_id === user.id) ?? null;
  }, [responses, user?.id]);

  const upsertMyNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!user || !sessionId) throw new Error("Not authenticated");

      const payload = {
        session_id: sessionId,
        user_id: user.id,
        notes: notes.trim() ? notes.trim() : null,
        // Keep JSONB in place for future prompt-keyed responses.
        responses: myResponse?.responses ?? {},
      };

      const { data, error } = await supabase
        .from("study_session_responses")
        .upsert(payload, { onConflict: "session_id,user_id" })
        .select("id,session_id,user_id,responses,notes,created_at,updated_at")
        .single();

      if (error) throw error;
      return data as any as SessionResponseRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session-responses", sessionId] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("Missing session id");

      const payload: Partial<StudySessionRow> = {
        title: editTitle.trim() || null,
        pray: editPray.trim() || null,
        scripture_text: editScriptureText.trim() || null,
        status: editStatus,
        completed_at: editStatus === "completed" ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("study_sessions")
        .update(payload)
        .eq("id", sessionId)
        .select("*")
        .single();

      if (error) throw error;
      return data as any as StudySessionRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["study-session", sessionId] });
      setIsEditOpen(false);
    },
  });

  const openEdit = () => {
    if (!session) return;
    setEditTitle(session.title ?? "");
    setEditPray(session.pray ?? "");
    setEditScriptureText(session.scripture_text ?? "");
    setEditStatus((session.status as any) === "completed" ? "completed" : "in_progress");
    setIsEditOpen(true);
  };

  if (loading || loadingSession) {
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

  if (!sessionId || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Session not found</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Sessions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isChurchSession = !!session.church_id;
  const cover = study?.cover_image_url ?? null;
  const headerTitle = session.title || study?.title || "Session";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link to={createPageUrl("AdminStudies")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-semibold text-slate-800 line-clamp-1">{headerTitle}</h1>
                  <Badge variant={isChurchSession ? "default" : "secondary"}>{isChurchSession ? "Church" : "Personal"}</Badge>
                  <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                    {session.status === "completed" ? "Completed" : "In Progress"}
                  </Badge>
                  <DifficultyBadge difficulty={session.difficulty} />
                </div>
                <p className="text-sm text-slate-500 line-clamp-1">
                  {session.scripture_reference || study?.scripture_reference || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openEdit} className="gap-2">
                <Save className="h-4 w-4" />
                Edit Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {cover ? (
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <div className="h-44 overflow-hidden">
              <img src={cover} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600">
                This session is based on a study template.{" "}
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Lock className="h-4 w-4" />
                  Study content stays locked; sessions add “togetherness.”
                </span>
              </p>
            </div>
          </div>
        ) : (
          <GradientCard variant="warm" className="p-5">
            <p className="text-sm text-slate-600">
              This session is based on a study template.{" "}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Lock className="h-4 w-4" />
                Study content stays locked; sessions add “togetherness.”
              </span>
            </p>
          </GradientCard>
        )}

        {/* “Social” surface: responses feed (notes for now) */}
        <div className="grid md:grid-cols-2 gap-6">
          <GradientCard variant="warm" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-slate-800">My Notes</h2>
              </div>
              <Badge variant="secondary">Private to you unless shared</Badge>
            </div>

            <Label htmlFor="my_notes" className="sr-only">
              My Notes
            </Label>
            <Textarea
              id="my_notes"
              defaultValue={myResponse?.notes ?? ""}
              placeholder="Write what you're learning, questions you have, prayer requests, etc."
              className="min-h-[180px]"
              onBlur={(e) => {
                const next = e.target.value ?? "";
                // save on blur to keep it simple + reliable
                void upsertMyNotesMutation.mutateAsync(next);
              }}
            />

            {upsertMyNotesMutation.isPending ? (
              <div className="mt-2 text-xs text-slate-500 inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </div>
            ) : null}

            {upsertMyNotesMutation.isError ? (
              <div className="mt-2 text-xs text-red-600">
                {(upsertMyNotesMutation.error as any)?.message ?? "Failed to save notes."}
              </div>
            ) : null}
          </GradientCard>

          <GradientCard variant="warm" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-slate-800">Group Activity</h2>
              </div>
              <Badge variant="secondary">{responses.length} participant{responses.length === 1 ? "" : "s"}</Badge>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              This is the “together” part: everyone in the session has a place to contribute notes/reflections.
              (We can later add threaded comments or prompt-level replies using the JSONB.)
            </p>

            {loadingResponses ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : responses.length === 0 ? (
              <div className="text-sm text-slate-500">
                No one has posted notes yet. Once someone adds notes, you’ll see them here.
              </div>
            ) : (
              <div className="space-y-3">
                {responses.slice(0, 8).map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {r.user_id === user.id ? "You" : `User ${r.user_id.slice(0, 6)}…`}
                        </span>
                        <span className="mx-2">•</span>
                        <span>Updated {new Date(r.updated_at).toLocaleString()}</span>
                      </div>
                      <MessageCircle className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {r.notes?.trim() ? r.notes : <span className="text-slate-400">No notes yet</span>}
                    </div>
                  </div>
                ))}
                {responses.length > 8 ? (
                  <div className="text-xs text-slate-500">Showing latest 8. (We can add paging later.)</div>
                ) : null}
              </div>
            )}
          </GradientCard>
        </div>
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSessionMutation.mutate();
            }}
            className="space-y-5"
          >
            <div>
              <Label>Session Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Optional (defaults to study title)"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Status</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <Label>Prayer Focus (optional)</Label>
              <Textarea
                value={editPray}
                onChange={(e) => setEditPray(e.target.value)}
                placeholder="Optional prayer focus for the group"
                className="mt-1 min-h-[90px]"
              />
            </div>

            <div>
              <Label>Scripture Text (optional)</Label>
              <Textarea
                value={editScriptureText}
                onChange={(e) => setEditScriptureText(e.target.value)}
                placeholder="Optional: paste the scripture text here for convenience"
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSessionMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {updateSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>

            {updateSessionMutation.isError ? (
              <div className="text-sm text-red-600">
                {(updateSessionMutation.error as any)?.message ?? "Failed to update session."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
