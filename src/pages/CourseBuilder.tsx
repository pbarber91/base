import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GradientCard from "@/components/ui/GradientCard";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ChevronLeft,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Video,
  FileText,
  BookOpen,
  Link as LinkIcon,
} from "lucide-react";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  is_published: boolean;
  is_public: boolean;
};

type SessionRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type BlockRow = {
  id: string;
  session_id: string;
  type: string; // 'video' | 'text' | 'resource' | 'scripture' etc
  title: string | null;
  content: string | null;
  url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const BLOCK_TYPES = [
  { type: "video", label: "Video", icon: Video },
  { type: "text", label: "Text", icon: FileText },
  { type: "scripture", label: "Scripture", icon: BookOpen },
  { type: "resource", label: "Resource Link", icon: LinkIcon },
];

export default function CourseBuilder() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("id") || "";

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [editSession, setEditSession] = useState<SessionRow | null>(null);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);

  const [editBlock, setEditBlock] = useState<BlockRow | null>(null);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const canUse = !!user?.id && !loading && !!courseId;

  const courseQ = useQuery({
    queryKey: ["coursebuilder-course", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseRow | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,is_published,is_public")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const sessionsQ = useQuery({
    queryKey: ["coursebuilder-sessions", courseId],
    enabled: canUse,
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index,created_at,updated_at")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 5_000,
  });

  const blocksQ = useQuery({
    queryKey: ["coursebuilder-blocks", activeSessionId],
    enabled: canUse && !!activeSessionId,
    queryFn: async (): Promise<BlockRow[]> => {
      const { data, error } = await supabase
        .from("course_session_blocks")
        .select("id,session_id,type,title,content,url,order_index,created_at,updated_at")
        .eq("session_id", activeSessionId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 2_000,
  });

  const sessions = sessionsQ.data ?? [];
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );
  const blocks = blocksQ.data ?? [];

  // Default active session
  React.useEffect(() => {
    if (!activeSessionId && sessions.length > 0) setActiveSessionId(sessions[0].id);
  }, [sessions, activeSessionId]);

  const openSessionDialog = (s: SessionRow | null = null) => {
    setEditSession(s);
    setIsSessionDialogOpen(true);
  };

  const openBlockDialog = (b: BlockRow | null = null) => {
    setEditBlock(b);
    setIsBlockDialogOpen(true);
  };

  const saveSessionMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string | null }) => {
      if (!courseId) throw new Error("Missing course id");

      if (editSession?.id) {
        const { error } = await supabase
          .from("course_sessions")
          .update({ title: payload.title, description: payload.description })
          .eq("id", editSession.id);
        if (error) throw error;
        return;
      }

      const nextIndex = sessions.length > 0 ? Math.max(...sessions.map((s) => s.order_index ?? 0)) + 1 : 1;
      const { data, error } = await supabase
        .from("course_sessions")
        .insert({
          course_id: courseId,
          title: payload.title,
          description: payload.description,
          order_index: nextIndex,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (data?.id) setActiveSessionId(data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursebuilder-sessions"] });
      setIsSessionDialogOpen(false);
      setEditSession(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("course_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursebuilder-sessions"] });
      setActiveSessionId(null);
    },
  });

  const reorderSessionsMutation = useMutation({
    mutationFn: async (ordered: SessionRow[]) => {
      // Update in a batch
      const updates = ordered.map((s, idx) => ({ id: s.id, order_index: idx + 1 }));
      for (const u of updates) {
        const { error } = await supabase.from("course_sessions").update({ order_index: u.order_index }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coursebuilder-sessions"] }),
  });

  const saveBlockMutation = useMutation({
    mutationFn: async (payload: { type: string; title: string | null; content: string | null; url: string | null }) => {
      if (!activeSessionId) throw new Error("No active session selected");

      if (editBlock?.id) {
        const { error } = await supabase
          .from("course_session_blocks")
          .update({
            type: payload.type,
            title: payload.title,
            content: payload.content,
            url: payload.url,
          })
          .eq("id", editBlock.id);
        if (error) throw error;
        return;
      }

      const nextIndex = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order_index ?? 0)) + 1 : 1;
      const { error } = await supabase.from("course_session_blocks").insert({
        session_id: activeSessionId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        url: payload.url,
        order_index: nextIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursebuilder-blocks"] });
      setIsBlockDialogOpen(false);
      setEditBlock(null);
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase.from("course_session_blocks").delete().eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coursebuilder-blocks"] }),
  });

  const reorderBlocksMutation = useMutation({
    mutationFn: async (ordered: BlockRow[]) => {
      const updates = ordered.map((b, idx) => ({ id: b.id, order_index: idx + 1 }));
      for (const u of updates) {
        const { error } = await supabase.from("course_session_blocks").update({ order_index: u.order_index }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coursebuilder-blocks"] }),
  });

  if (loading || courseQ.isLoading || sessionsQ.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/get-started", { replace: true });
    return null;
  }

  if (!courseQ.data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Course not found</h2>
          <Link to={createPageUrl("AdminCourses")}>
            <Button>Back to Admin</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

  const course = courseQ.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminCourses")}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="font-semibold text-slate-900">{course.title}</div>
              <div className="text-sm text-slate-500">Course Builder • Sessions & Blocks</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openSessionDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
            <Link to={createPageUrl("CourseDetail") + `?id=${course.id}`}>
              <Button className="bg-violet-600 hover:bg-violet-700">View</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[360px,1fr] gap-6">
        {/* Sessions column */}
        <div>
          <GradientCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-900">Sessions</div>
              <Button size="sm" variant="outline" onClick={() => openSessionDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-sm text-slate-600">
                No sessions yet. Add one to start building.
              </div>
            ) : (
              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination) return;
                  const items = Array.from(sessions);
                  const [moved] = items.splice(result.source.index, 1);
                  items.splice(result.destination.index, 0, moved);
                  reorderSessionsMutation.mutate(items);
                }}
              >
                <Droppable droppableId="sessions">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {sessions.map((s, idx) => (
                        <Draggable key={s.id} draggableId={s.id} index={idx}>
                          {(provided, snapshot) => (
                            <button
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cx(
                                "w-full text-left rounded-xl border p-3 transition",
                                activeSessionId === s.id ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50",
                                snapshot.isDragging && "shadow-lg"
                              )}
                              onClick={() => setActiveSessionId(s.id)}
                              type="button"
                            >
                              <div className="flex items-start gap-2">
                                <div {...provided.dragHandleProps} className="pt-1 text-slate-400">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-900 truncate">{s.title}</div>
                                  {s.description ? (
                                    <div className="text-xs text-slate-500 line-clamp-2 mt-1">{s.description}</div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openSessionDialog(s);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteSessionMutation.mutate(s.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </button>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </GradientCard>
        </div>

        {/* Blocks column */}
        <div>
          <GradientCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-slate-900">Blocks</div>
                <div className="text-sm text-slate-500">
                  {activeSession ? `Session: ${activeSession.title}` : "Select a session"}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => openBlockDialog()}
                disabled={!activeSessionId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
            </div>

            {!activeSessionId ? (
              <div className="text-sm text-slate-600">Select a session on the left.</div>
            ) : blocksQ.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : blocks.length === 0 ? (
              <div className="text-sm text-slate-600">No blocks yet. Add one.</div>
            ) : (
              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination) return;
                  const items = Array.from(blocks);
                  const [moved] = items.splice(result.source.index, 1);
                  items.splice(result.destination.index, 0, moved);
                  reorderBlocksMutation.mutate(items);
                }}
              >
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {blocks.map((b, idx) => {
                        const cfg = BLOCK_TYPES.find((x) => x.type === b.type) || BLOCK_TYPES[1];
                        const Icon = cfg.icon;
                        return (
                          <Draggable key={b.id} draggableId={b.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cx(
                                  "rounded-xl border border-slate-200 bg-white p-4",
                                  snapshot.isDragging && "shadow-lg"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div {...provided.dragHandleProps} className="pt-1 text-slate-400">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-slate-700" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-500">{cfg.label}</div>
                                    <div className="font-medium text-slate-900 truncate">
                                      {b.title || "(Untitled)"}
                                    </div>
                                    {b.content ? (
                                      <div className="text-sm text-slate-600 line-clamp-2 mt-1">{b.content}</div>
                                    ) : b.url ? (
                                      <div className="text-sm text-slate-600 truncate mt-1">{b.url}</div>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBlockDialog(b)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600"
                                      onClick={() => deleteBlockMutation.mutate(b.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </GradientCard>
        </div>
      </div>

      {/* Session Dialog */}
      <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSession ? "Edit Session" : "Add Session"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const title = (fd.get("title")?.toString() ?? "").trim();
              const description = (fd.get("description")?.toString() ?? "").trim();
              saveSessionMutation.mutate({ title, description: description ? description : null });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Title</Label>
              <Input name="title" defaultValue={editSession?.title ?? ""} required placeholder="e.g., Week 1 — The Gospel" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editSession?.description ?? ""} placeholder="Optional notes for this session" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSessionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSessionMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBlock ? "Edit Block" : "Add Block"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const type = (fd.get("type")?.toString() ?? "text").trim();
              const title = (fd.get("title")?.toString() ?? "").trim();
              const content = (fd.get("content")?.toString() ?? "").trim();
              const url = (fd.get("url")?.toString() ?? "").trim();

              saveBlockMutation.mutate({
                type,
                title: title ? title : null,
                content: content ? content : null,
                url: url ? url : null,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Type</Label>
              <select
                name="type"
                defaultValue={editBlock?.type ?? "text"}
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Title (optional)</Label>
              <Input name="title" defaultValue={editBlock?.title ?? ""} placeholder="e.g., Watch this teaching" />
            </div>

            <div>
              <Label>Content (optional)</Label>
              <Textarea
                name="content"
                defaultValue={editBlock?.content ?? ""}
                placeholder="Text, instructions, scripture excerpt, etc."
                className="min-h-[120px]"
              />
            </div>

            <div>
              <Label>URL (optional)</Label>
              <Input name="url" defaultValue={editBlock?.url ?? ""} placeholder="https://youtube.com/... or https://..." />
              <p className="text-xs text-slate-500 mt-1">
                For video blocks: paste a YouTube/Vimeo URL to auto-embed in CourseDetail.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveBlockMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveBlockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>

            {(saveBlockMutation.isError || deleteBlockMutation.isError) ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {(saveBlockMutation.error as any)?.message ||
                  (deleteBlockMutation.error as any)?.message ||
                  "Failed to save block."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
