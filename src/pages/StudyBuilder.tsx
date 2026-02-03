import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import GradientCard from "@/components/ui/GradientCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, Users, Copy, Check, MessageCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

type Difficulty = "beginner" | "intermediate" | "advanced";

type StudyRow = {
  id: string;
  title: string;
  scripture_reference: string | null;
  book: string | null;
  difficulty: Difficulty;
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
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ResponseRow = {
  id: string;
  session_id: string;
  user_id: string;
  notes: string | null;
  updated_at: string;
  profiles?: ProfileRow | null;
};

export default function StudyBuilder() {
  const { user, supabase, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionId");

  const [copied, setCopied] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const canUse = !!user?.id && !!sessionId;

  const { data: session, isLoading: loadingSession } = useQuery<SessionRow | null>({
    queryKey: ["session", sessionId ?? "none"],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("study_sessions").select("*").eq("id", sessionId!).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: study, isLoading: loadingStudy } = useQuery<StudyRow | null>({
    queryKey: ["study-for-session", session?.study_id ?? "none"],
    enabled: !!session?.study_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("studies").select("id,title,scripture_reference,book,difficulty").eq("id", session!.study_id!).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: responses = [], isLoading: loadingResponses } = useQuery<ResponseRow[]>({
    queryKey: ["session-responses", sessionId ?? "none"],
    enabled: !!sessionId,
    queryFn: async () => {
      // Join profiles so we can show names
      const { data, error } = await supabase
        .from("study_session_responses")
        .select("id,session_id,user_id,notes,updated_at,profiles:profiles(id,display_name,avatar_url)")
        .eq("session_id", sessionId!)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const myResponse = useMemo(() => responses.find((r) => r.user_id === user?.id) ?? null, [responses, user?.id]);
  const [myNotes, setMyNotes] = useState<string>("");

  React.useEffect(() => {
    setMyNotes(myResponse?.notes ?? "");
  }, [myResponse?.notes]);

  const upsertMyNotesMutation = useMutation<any, unknown, { notes: string }>({
    mutationFn: async ({ notes }) => {
      if (!user || !sessionId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("study_session_responses")
        .upsert(
          {
            session_id: sessionId,
            user_id: user.id,
            notes: notes.trim() || null,
          },
          { onConflict: "session_id,user_id" }
        );

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session-responses"] });
    },
  });

  const shareUrl = useMemo(() => {
    if (!sessionId) return "";
    const base = window.location.origin;
    return `${base}${createPageUrl("StudyBuilder")}?sessionId=${sessionId}`;
  }, [sessionId]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: do nothing; user can manually copy
      setCopied(false);
    }
  };

  if (loading || loadingSession || loadingStudy) {
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

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Session not specified</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Session not found</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  const participantCount = responses.length;

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
                <h1 className="font-semibold text-slate-800 line-clamp-1">
                  {study?.title || session.title || "Study Session"}
                </h1>
                <p className="text-sm text-slate-500 line-clamp-1">
                  {study?.scripture_reference || session.scripture_reference || ""} • Session
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-slate-700">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {participantCount} participant{participantCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline" className="text-slate-700">
                    {session.church_id ? "Church session" : session.group_id ? "Group session" : "Solo session"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={() => setIsInviteOpen(true)} className="gap-2">
                <Users className="h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* How this is social */}
        <GradientCard variant="warm" className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-amber-700" />
                Session Discussion
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Everyone in this session can add notes. You’ll see updates from others here—this is the “together” layer.
              </p>
            </div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-5">
            {/* My notes */}
            <div className="space-y-2">
              <Label>My Notes</Label>
              <Textarea
                value={myNotes}
                onChange={(e) => setMyNotes(e.target.value)}
                className="min-h-[150px]"
                placeholder="Share insights, questions, prayer requests…"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => upsertMyNotesMutation.mutate({ notes: myNotes })}
                  disabled={upsertMyNotesMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                >
                  {upsertMyNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Notes
                </Button>
              </div>
              {upsertMyNotesMutation.isError ? (
                <div className="text-sm text-red-600">
                  {(upsertMyNotesMutation.error as any)?.message ?? "Failed to save notes."}
                </div>
              ) : null}
            </div>

            {/* Others */}
            <div className="space-y-2">
              <Label>Participant Notes</Label>

              {loadingResponses ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                </div>
              ) : responses.filter((r) => r.user_id !== user.id).length === 0 ? (
                <div className="p-4 rounded-lg bg-white border text-sm text-slate-600">
                  No one else has posted notes yet. Invite people to join this session.
                </div>
              ) : (
                <div className="space-y-3">
                  {responses
                    .filter((r) => r.user_id !== user.id)
                    .map((r) => (
                      <div key={r.id} className="p-4 rounded-lg bg-white border">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-800">
                            {r.profiles?.display_name || "Participant"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(r.updated_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                          {r.notes?.trim() ? r.notes : <span className="text-slate-400">No notes yet.</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </GradientCard>
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Others</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Share this link with your church/group. When they open it, they’ll join this session and their notes will appear here.
            </p>

            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button variant="outline" onClick={copyShareLink} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="text-xs text-slate-500">
              Tip: You can also post this link in a group chat, email, or church bulletin.
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsInviteOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
