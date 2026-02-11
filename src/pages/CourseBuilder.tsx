// src/pages/CourseBuilder.tsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GradientCard from "@/components/ui/GradientCard";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft,
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Save,
  Loader2,
  Video,
  FileText,
  Link2,
  BookOpen,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  is_published: boolean;
  is_public: boolean;
};

type CourseSessionRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_minutes: number | null;
  blocks: any[];
};

type Block =
  | { type: "text"; title?: string; body?: string }
  | { type: "video"; title?: string; url?: string }
  | { type: "link"; title?: string; url?: string; description?: string };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const BLOCK_TYPES = [
  { type: "text" as const, label: "Text", icon: FileText },
  { type: "video" as const, label: "Video", icon: Video },
  { type: "link" as const, label: "Link", icon: Link2 },
];

export default function CourseBuilder() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("id") || "";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<CourseSessionRow | null>(null);

  const [blocks, setBlocks] = useState<Block[]>([{ type: "text", title: "", body: "" }]);

  const canUse = !!user?.id && !loading && !!courseId;

  const courseQ = useQuery({
    queryKey: ["course", courseId],
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
    queryKey: ["course-sessions", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseSessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index,estimated_minutes,blocks")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, blocks: Array.isArray(r.blocks) ? r.blocks : [] })) as CourseSessionRow[];
    },
    staleTime: 10_000,
  });

  const openNew = () => {
    setEditSession(null);
    setBlocks([{ type: "text", title: "", body: "" }]);
    setIsDialogOpen(true);
  };

  const openEdit = (s: CourseSessionRow) => {
    setEditSession(s);
    setBlocks((Array.isArray(s.blocks) ? s.blocks : []) as any);
    setIsDialogOpen(true);
  };

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-sessions", courseId] });
    },
  });

  const saveSessionMutation = useMutation({
    mutationFn: async (payload: Omit<CourseSessionRow, "id"> & { id?: string }) => {
      if (!user) throw new Error("Not authenticated.");

      if (payload.id) {
        const { error } = await supabase
          .from("course_sessions")
          .update({
            title: payload.title,
            description: payload.description,
            estimated_minutes: payload.estimated_minutes,
            blocks: payload.blocks,
          })
          .eq("id", payload.id);
        if (error) throw error;
        return { id: payload.id };
      }

      // new session => order_index = end
      const existing = sessionsQ.data ?? [];
      const order_index = existing.length;

      const { data, error } = await supabase
        .from("course_sessions")
        .insert({
          course_id: courseId,
          title: payload.title,
          description: payload.description,
          order_index,
          estimated_minutes: payload.estimated_minutes,
          blocks: payload.blocks,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-sessions", courseId] });
      setIsDialogOpen(false);
      setEditSession(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered: CourseSessionRow[]) => {
      // update order_index in batch (simple loop)
      for (let i = 0; i < ordered.length; i++) {
        const s = ordered[i];
        const { error } = await supabase.from("course_sessions").update({ order_index: i }).eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-sessions", courseId] });
    },
  });

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const list = [...(sessionsQ.data ?? [])];
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    reorderMutation.mutate(list);
  };

  const addBlock = (type: Block["type"]) => {
    if (type === "text") setBlocks((prev) => [...prev, { type: "text", title: "", body: "" }]);
    if (type === "video") setBlocks((prev) => [...prev, { type: "video", title: "", url: "" }]);
    if (type === "link") setBlocks((prev) => [...prev, { type: "link", title: "", url: "", description: "" }]);
  };

  const updateBlock = (idx: number, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? ({ ...b, ...patch } as any) : b)));
  };

  const removeBlock = (idx: number) => setBlocks((prev) => prev.filter((_, i) => i !== idx));

  const isBusy = loading || courseQ.isLoading || sessionsQ.isLoading;

  if (loading) {
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

  const course = courseQ.data;
  if (!courseId || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Course not found</h2>
          <div className="flex justify-end">
            <Link to={createPageUrl("AdminCourses")}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </GradientCard>
      </div>
    );
  }

  const sessions = sessionsQ.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link to={createPageUrl("AdminCourses")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="font-semibold text-slate-900 truncate">{course.title}</h1>
                <p className="text-sm text-slate-500 truncate">Session Builder</p>
              </div>
            </div>

            <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="h-4 w-4" />
              Add Session
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isBusy ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-violet-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No sessions yet</h3>
            <p className="text-slate-500 mb-6">Add sessions to build the course structure.</p>
            <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="h-4 w-4" />
              Add First Session
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="course-sessions">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {sessions.map((s, index) => (
                    <Draggable key={s.id} draggableId={s.id} index={index}>
                      {(p, snapshot) => (
                        <motion.div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={cx(snapshot.isDragging && "shadow-lg")}
                        >
                          <GradientCard variant="cool" className="p-5">
                            <div className="flex items-center gap-4">
                              <div {...p.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-slate-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 truncate">
                                  {index + 1}. {s.title}
                                </div>
                                {s.description ? (
                                  <div className="text-sm text-slate-600 line-clamp-1">{s.description}</div>
                                ) : null}
                                <div className="text-xs text-slate-500 mt-1">
                                  {Array.isArray(s.blocks) ? s.blocks.length : 0} blocks
                                  {s.estimated_minutes ? ` • ${s.estimated_minutes} min` : ""}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => deleteSessionMutation.mutate(s.id)}
                                  disabled={deleteSessionMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </GradientCard>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {(sessionsQ.isError || courseQ.isError) ? (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(sessionsQ.error as any)?.message || (courseQ.error as any)?.message || "Failed to load course builder."}
          </div>
        ) : null}
      </div>

      {/* Session editor */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSession ? "Edit Session" : "Add Session"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const title = (form.get("title")?.toString() ?? "").trim();
              if (!title) return;

              const description = (form.get("description")?.toString() ?? "").trim() || null;
              const estimated_minutes = Number.parseInt((form.get("estimated_minutes")?.toString() ?? "0").trim(), 10) || null;

              saveSessionMutation.mutate({
                id: editSession?.id,
                course_id: courseId,
                title,
                description,
                order_index: editSession?.order_index ?? 0,
                estimated_minutes,
                blocks,
              });
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session Title</Label>
                <Input name="title" defaultValue={editSession?.title ?? ""} required placeholder="e.g., Week 1 — The Gospel" className="mt-1" />
              </div>
              <div>
                <Label>Estimated Minutes</Label>
                <Input name="estimated_minutes" type="number" min={0} defaultValue={editSession?.estimated_minutes ?? ""} placeholder="e.g., 30" className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea name="description" defaultValue={editSession?.description ?? ""} className="mt-1 min-h-[90px]" placeholder="What is this session about?" />
            </div>

            {/* Blocks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Content Blocks</Label>
                <div className="flex gap-2">
                  {BLOCK_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Button key={t.type} type="button" variant="outline" size="sm" onClick={() => addBlock(t.type)}>
                        <Icon className="h-4 w-4 mr-2" />
                        Add {t.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {blocks.map((b, idx) => (
                  <GradientCard key={idx} variant="warm" className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-800 capitalize">{b.type} block</div>
                      <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeBlock(idx)}>
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Input
                        value={(b as any).title ?? ""}
                        onChange={(e) => updateBlock(idx, { title: e.target.value } as any)}
                        placeholder="Block title (optional)"
                      />

                      {b.type === "video" || b.type === "link" ? (
                        <Input
                          value={(b as any).url ?? ""}
                          onChange={(e) => updateBlock(idx, { url: e.target.value } as any)}
                          placeholder="https://..."
                        />
                      ) : (
                        <div />
                      )}
                    </div>

                    {b.type === "text" ? (
                      <Textarea
                        value={(b as any).body ?? ""}
                        onChange={(e) => updateBlock(idx, { body: e.target.value } as any)}
                        placeholder="Write the teaching / notes / instructions…"
                        className="min-h-[110px]"
                      />
                    ) : b.type === "video" ? (
                      <div className="text-xs text-slate-600">
                        Store a YouTube/Vimeo URL (or direct video URL). It will embed on the participant page.
                      </div>
                    ) : (
                      <Input
                        value={(b as any).description ?? ""}
                        onChange={(e) => updateBlock(idx, { description: e.target.value } as any)}
                        placeholder="Brief description (optional)"
                      />
                    )}
                  </GradientCard>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSessionMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Session
              </Button>
            </div>

            {saveSessionMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveSessionMutation.error as any)?.message ?? "Failed to save session."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
