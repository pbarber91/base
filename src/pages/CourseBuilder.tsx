// src/pages/CourseBuilder.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronLeft,
  Loader2,
  Save,
  Trash2,
  GripVertical,
  Video,
  FileText,
  Quote,
  MessageSquare,
  BookOpen,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

type BlockType = "text" | "video" | "link" | "scripture" | "quote" | "discussion_question";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  created_by: string;
  is_published: boolean;
};

type CourseSessionRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_minutes: number | null;
  blocks: any[]; // jsonb
  created_at?: string;
  updated_at?: string;
};

type Block = {
  type: BlockType;
  content?: string;
  url?: string;
  title?: string;
  scripture_ref?: string;
  attribution?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clampInt(v: string, fallback: number) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const BLOCK_TYPE_META: Array<{ type: BlockType; label: string; icon: any }> = [
  { type: "text", label: "Text", icon: FileText },
  { type: "video", label: "Video", icon: Video },
  { type: "link", label: "Link", icon: LinkIcon },
  { type: "scripture", label: "Scripture", icon: BookOpen },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "discussion_question", label: "Discussion Question", icon: MessageSquare },
];

export default function CourseBuilder() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id") || "";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CourseSessionRow | null>(null);

  // draft fields
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftEstimatedMinutes, setDraftEstimatedMinutes] = useState<number>(15);
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);

  const canUse = !!user?.id && !!courseId && !loading;

  const courseQ = useQuery({
    queryKey: ["course", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseRow> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,created_by,is_published")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data as CourseRow;
    },
    staleTime: 15_000,
  });

  const sessionsQ = useQuery({
    queryKey: ["course-sessions", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseSessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index,estimated_minutes,blocks,created_at,updated_at")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as any[];
      return rows.map((r) => ({
        ...r,
        blocks: Array.isArray(r.blocks) ? r.blocks : [],
      })) as CourseSessionRow[];
    },
    staleTime: 10_000,
  });

  // Basic editor permission:
  // - course creator always can
  // - church admin can (if course has church_id and user is admin in church_members)
  const canEditQ = useQuery({
    queryKey: ["course-can-edit", courseId, courseQ.data?.church_id, user?.id],
    enabled: canUse && !!courseQ.data,
    queryFn: async (): Promise<boolean> => {
      const c = courseQ.data!;
      if (c.created_by === user!.id) return true;

      if (!c.church_id) return false;

      const { data, error } = await supabase
        .from("church_members")
        .select("role")
        .eq("church_id", c.church_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      // IMPORTANT: your enum did NOT include 'leader' (per earlier error). Only check 'admin'.
      return (data?.role ?? "").toString() === "admin";
    },
    staleTime: 15_000,
  });

  const canEdit = !!canEditQ.data;

  const openCreate = () => {
    setEditingSession(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftEstimatedMinutes(15);
    setDraftBlocks([{ type: "text", content: "" }]);
    setIsDialogOpen(true);
  };

  const openEdit = (s: CourseSessionRow) => {
    setEditingSession(s);
    setDraftTitle(s.title ?? "");
    setDraftDescription(s.description ?? "");
    setDraftEstimatedMinutes(s.estimated_minutes ?? 15);
    setDraftBlocks((Array.isArray(s.blocks) ? s.blocks : []) as any);
    if ((Array.isArray(s.blocks) ? s.blocks : []).length === 0) {
      setDraftBlocks([{ type: "text", content: "" }]);
    }
    setIsDialogOpen(true);
  };

  const addBlock = (type: BlockType) => {
    const base: Block = { type };
    if (type === "video") base.url = "";
    if (type === "link") {
      base.url = "";
      base.title = "";
    }
    if (type === "scripture") {
      base.scripture_ref = "";
      base.content = "";
    }
    if (type === "quote") {
      base.content = "";
      base.attribution = "";
    }
    if (type === "discussion_question") base.content = "";
    if (type === "text") base.content = "";
    setDraftBlocks((prev) => [...prev, base]);
  };

  const updateBlock = (idx: number, patch: Partial<Block>) => {
    setDraftBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const removeBlock = (idx: number) => setDraftBlocks((prev) => prev.filter((_, i) => i !== idx));

  const saveSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!courseId) throw new Error("Missing course id");
      if (!canEdit) throw new Error("You do not have permission to edit this course.");

      const blocks = (draftBlocks ?? []).filter((b) => {
        if (!b?.type) return false;
        if (b.type === "video") return !!(b.url || "").trim();
        if (b.type === "link") return !!(b.url || "").trim();
        if (b.type === "scripture") return !!(b.scripture_ref || "").trim() || !!(b.content || "").trim();
        return !!(b.content || "").trim() || !!(b.attribution || "").trim();
      });

      const title = draftTitle.trim();
      if (!title) throw new Error("Session title is required.");

      // Determine order_index for create
      let orderIndex = editingSession?.order_index ?? 1;
      if (!editingSession) {
        const current = sessionsQ.data ?? [];
        orderIndex = current.length + 1;
      }

      const payload: any = {
        course_id: courseId,
        title,
        description: draftDescription.trim() || null,
        order_index: orderIndex,
        estimated_minutes: Number.isFinite(draftEstimatedMinutes) ? draftEstimatedMinutes : null,
        blocks,
      };

      if (editingSession?.id) {
        const { error } = await supabase.from("course_sessions").update(payload).eq("id", editingSession.id);
        if (error) throw error;
        return { id: editingSession.id };
      } else {
        const { data, error } = await supabase.from("course_sessions").insert(payload).select("id").single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["course-sessions", courseId] });
      setIsDialogOpen(false);
      setEditingSession(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!canEdit) throw new Error("You do not have permission to edit this course.");
      const { error } = await supabase.from("course_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["course-sessions", courseId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: CourseSessionRow[]) => {
      if (!canEdit) throw new Error("You do not have permission to edit this course.");

      // Batch update order_index
      for (let i = 0; i < next.length; i++) {
        const s = next[i];
        const { error } = await supabase.from("course_sessions").update({ order_index: i + 1 }).eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["course-sessions", courseId] });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result?.destination) return;
    const list = [...(sessionsQ.data ?? [])];
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);

    // optimistic reorder in UI
    qc.setQueryData(["course-sessions", courseId], list.map((s, i) => ({ ...s, order_index: i + 1 })));
    reorderMutation.mutate(list);
  };

  const isBusy = loading || courseQ.isLoading || sessionsQ.isLoading || canEditQ.isLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Missing course id</h2>
          <p className="text-sm text-slate-600 mb-6">Open this page from the course admin list.</p>
          <div className="flex justify-end">
            <Link to={createPageUrl("AdminCourses")}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </GradientCard>
      </div>
    );
  }

  const course = courseQ.data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("AdminCourses")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-slate-900">{course?.title ?? "Course"}</h1>
                  {course?.is_published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                </div>
                <p className="text-sm text-slate-500">Course Builder • Sessions</p>
              </div>
            </div>

            <Button
              onClick={openCreate}
              disabled={!canEdit || isBusy}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Session
            </Button>
          </div>

          {!canEditQ.isLoading && !canEdit && (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              You don’t have permission to edit this course.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isBusy ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : sessionsQ.data && sessionsQ.data.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="course-sessions">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {sessionsQ.data!.map((s, idx) => (
                    <Draggable key={s.id} draggableId={s.id} index={idx} isDragDisabled={!canEdit}>
                      {(p, snap) => (
                        <div ref={p.innerRef} {...p.draggableProps} className={cx(snap.isDragging && "shadow-lg")}>
                          <GradientCard className="p-5">
                            <div className="flex items-start gap-4">
                              <div
                                {...p.dragHandleProps}
                                className={cx("pt-1", canEdit ? "cursor-grab" : "cursor-not-allowed opacity-40")}
                                aria-label="Reorder session"
                              >
                                <GripVertical className="h-5 w-5 text-slate-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Session {idx + 1}</Badge>
                                  {s.estimated_minutes ? (
                                    <span className="text-xs text-slate-500">{s.estimated_minutes} min</span>
                                  ) : null}
                                </div>
                                <div className="font-semibold text-slate-900 mt-1 truncate">{s.title}</div>
                                {s.description ? (
                                  <div className="text-sm text-slate-600 line-clamp-1 mt-1">{s.description}</div>
                                ) : null}
                                <div className="text-xs text-slate-500 mt-2">
                                  {Array.isArray(s.blocks) ? s.blocks.length : 0} blocks
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEdit(s)} disabled={!canEdit}>
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-600 hover:text-rose-700"
                                  onClick={() => deleteSessionMutation.mutate(s.id)}
                                  disabled={!canEdit || deleteSessionMutation.isPending}
                                  aria-label="Delete session"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </GradientCard>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <GradientCard className="p-7">
            <div className="text-slate-900 font-semibold mb-1">No sessions yet</div>
            <div className="text-sm text-slate-600 mb-4">Add your first session to start building this course.</div>
            <Button onClick={openCreate} disabled={!canEdit} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </GradientCard>
        )}

        {(courseQ.isError || sessionsQ.isError || canEditQ.isError) && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(courseQ.error as any)?.message ||
              (sessionsQ.error as any)?.message ||
              (canEditQ.error as any)?.message ||
              "Failed to load builder."}
          </div>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Add Session"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Session title" />
              </div>
              <div>
                <Label>Estimated Minutes</Label>
                <Input
                  type="number"
                  min={1}
                  value={draftEstimatedMinutes}
                  onChange={(e) => setDraftEstimatedMinutes(clampInt(e.target.value, 15))}
                />
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Short description for this session"
                className="min-h-[90px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <Label>Blocks</Label>
                <div className="flex flex-wrap gap-2">
                  {BLOCK_TYPE_META.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Button key={m.type} type="button" variant="outline" size="sm" onClick={() => addBlock(m.type)}>
                        <Icon className="h-4 w-4 mr-2" />
                        {m.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {draftBlocks.length === 0 ? (
                  <div className="text-sm text-slate-600">Add a block to start building the session content.</div>
                ) : (
                  draftBlocks.map((b, idx) => {
                    const meta = BLOCK_TYPE_META.find((m) => m.type === b.type);
                    const Icon = meta?.icon ?? FileText;

                    return (
                      <GradientCard key={idx} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-100">
                              <Icon className="h-4 w-4 text-slate-700" />
                            </div>
                            <div className="font-semibold text-slate-900">{meta?.label ?? b.type}</div>
                          </div>

                          <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(idx)} aria-label="Remove block">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 space-y-3">
                          {b.type === "video" ? (
                            <div>
                              <Label className="text-xs">Video URL</Label>
                              <Input
                                value={b.url ?? ""}
                                onChange={(e) => updateBlock(idx, { url: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                              />
                              <p className="text-xs text-slate-500 mt-1">We’ll embed YouTube/Vimeo on the participant page.</p>
                            </div>
                          ) : null}

                          {b.type === "link" ? (
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Link Title</Label>
                                <Input
                                  value={b.title ?? ""}
                                  onChange={(e) => updateBlock(idx, { title: e.target.value })}
                                  placeholder="Optional label"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">URL</Label>
                                <Input
                                  value={b.url ?? ""}
                                  onChange={(e) => updateBlock(idx, { url: e.target.value })}
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          ) : null}

                          {b.type === "scripture" ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Scripture Reference</Label>
                                <Input
                                  value={b.scripture_ref ?? ""}
                                  onChange={(e) => updateBlock(idx, { scripture_ref: e.target.value })}
                                  placeholder="e.g., John 3:16–17"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Text</Label>
                                <Textarea
                                  value={b.content ?? ""}
                                  onChange={(e) => updateBlock(idx, { content: e.target.value })}
                                  placeholder="Paste the passage (optional)"
                                  className="min-h-[90px]"
                                />
                              </div>
                            </div>
                          ) : null}

                          {b.type === "quote" ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Quote</Label>
                                <Textarea
                                  value={b.content ?? ""}
                                  onChange={(e) => updateBlock(idx, { content: e.target.value })}
                                  placeholder="Quote text…"
                                  className="min-h-[90px]"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Attribution (optional)</Label>
                                <Input
                                  value={b.attribution ?? ""}
                                  onChange={(e) => updateBlock(idx, { attribution: e.target.value })}
                                  placeholder="— Author / Source"
                                />
                              </div>
                            </div>
                          ) : null}

                          {b.type === "discussion_question" ? (
                            <div>
                              <Label className="text-xs">Question</Label>
                              <Textarea
                                value={b.content ?? ""}
                                onChange={(e) => updateBlock(idx, { content: e.target.value })}
                                placeholder="Ask a question for participants to discuss…"
                                className="min-h-[90px]"
                              />
                            </div>
                          ) : null}

                          {b.type === "text" ? (
                            <div>
                              <Label className="text-xs">Text</Label>
                              <Textarea
                                value={b.content ?? ""}
                                onChange={(e) => updateBlock(idx, { content: e.target.value })}
                                placeholder="Write the teaching / instructions…"
                                className="min-h-[90px]"
                              />
                            </div>
                          ) : null}
                        </div>
                      </GradientCard>
                    );
                  })
                )}
              </div>
            </div>

            {saveSessionMutation.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {(saveSessionMutation.error as any)?.message ?? "Failed to save session."}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => saveSessionMutation.mutate()}
                disabled={saveSessionMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {saveSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
