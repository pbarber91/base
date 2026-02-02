// src/pages/StudyBuilder.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ChevronLeft,
  GripVertical,
  Save,
  BookOpen,
  Lightbulb,
  MessageCircle,
  PenLine,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import GradientCard from "@/components/ui/GradientCard";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

type SectionType = "scripture_read" | "reflection" | "question" | "journal" | "resource";

type Resource = {
  title: string;
  type: "article" | "video" | "book" | "podcast" | "tool" | "";
  url: string;
  description?: string;
};

type StudySection = {
  id: string;
  type: SectionType;
  title: string;
  content?: string;
  scripture_text?: string;
  prompts?: string[];
  resources?: Resource[];
};

type StudyRow = {
  id: string;
  title: string;
  scripture_reference: string | null;
  sections: StudySection[];
};

const SECTION_TYPES: Array<{
  type: SectionType;
  label: string;
  icon: any;
  bgClass: string;
  iconClass: string;
}> = [
  { type: "scripture_read", label: "Scripture Reading", icon: BookOpen, bgClass: "bg-amber-100", iconClass: "text-amber-600" },
  { type: "reflection", label: "Reflection", icon: Lightbulb, bgClass: "bg-violet-100", iconClass: "text-violet-600" },
  { type: "question", label: "Question", icon: MessageCircle, bgClass: "bg-blue-100", iconClass: "text-blue-600" },
  { type: "journal", label: "Journal Prompt", icon: PenLine, bgClass: "bg-emerald-100", iconClass: "text-emerald-600" },
  { type: "resource", label: "Resources", icon: ExternalLink, bgClass: "bg-slate-100", iconClass: "text-slate-600" },
];

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function StudyBuilder() {
  const { supabase, user, loading } = useAuth();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get("id");

  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // dialog fields (controlled)
  const [sectionType, setSectionType] = useState<SectionType>("scripture_read");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContent, setSectionContent] = useState("");
  const [sectionScriptureText, setSectionScriptureText] = useState("");
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [resources, setResources] = useState<Resource[]>([{ title: "", type: "", url: "", description: "" }]);

  const canUse = !!studyId && !!user?.id;

  const { data: study, isLoading } = useQuery<StudyRow | null>({
    queryKey: ["study-builder", studyId ?? "none"],
    enabled: !!studyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studies")
        .select("id,title,scripture_reference,sections")
        .eq("id", studyId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const sections = Array.isArray((data as any).sections) ? (data as any).sections : [];
      return {
        id: (data as any).id,
        title: (data as any).title,
        scripture_reference: (data as any).scripture_reference ?? null,
        sections,
      } as StudyRow;
    },
  });

  const sections: StudySection[] = useMemo(() => {
    const s = (study?.sections ?? []) as any[];
    return s
      .map((x) => ({
        id: String(x?.id ?? newId()),
        type: (x?.type ?? "scripture_read") as SectionType,
        title: String(x?.title ?? ""),
        content: x?.content ?? "",
        scripture_text: x?.scripture_text ?? "",
        prompts: Array.isArray(x?.prompts) ? x.prompts : [],
        resources: Array.isArray(x?.resources) ? x.resources : [],
      }))
      .filter((x) => x.title || x.content || x.scripture_text || (x.prompts?.length ?? 0) > 0 || (x.resources?.length ?? 0) > 0);
  }, [study?.sections]);

  const saveMutation = useMutation({
    mutationFn: async (nextSections: StudySection[]) => {
      if (!studyId) throw new Error("Missing study id");
      const { error } = await supabase.from("studies").update({ sections: nextSections }).eq("id", studyId);
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["study-builder"] });
      setIsDialogOpen(false);
      setEditIndex(null);
    },
  });

  const openEditDialog = (section: StudySection | null = null, index: number | null = null) => {
    setEditIndex(index);

    setSectionType(section?.type ?? "scripture_read");
    setSectionTitle(section?.title ?? "");
    setSectionContent(section?.content ?? "");
    setSectionScriptureText(section?.scripture_text ?? "");
    setPrompts(section?.prompts?.length ? [...section.prompts] : [""]);
    setResources(section?.resources?.length ? [...(section.resources as Resource[])] : [{ title: "", type: "", url: "", description: "" }]);

    setIsDialogOpen(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    saveMutation.mutate(items);
  };

  const upsertSection = () => {
    const cleanedPrompts = prompts.map((p) => p.trim()).filter(Boolean);

    const cleanedResources = resources
      .map((r) => ({
        title: (r.title ?? "").trim(),
        type: (r.type ?? "") as Resource["type"],
        url: (r.url ?? "").trim(),
        description: (r.description ?? "").trim(),
      }))
      .filter((r) => r.title && r.url);

    const next: StudySection = {
      id: editIndex !== null ? sections[editIndex]?.id ?? newId() : newId(),
      type: sectionType,
      title: sectionTitle.trim(),
      content: sectionContent.trim(),
      scripture_text: sectionScriptureText.trim(),
      prompts: cleanedPrompts,
      resources: cleanedResources,
    };

    if (!next.title) {
      // Keep it simple; you can replace with toast
      alert("Section title is required.");
      return;
    }

    const nextSections = [...sections];
    if (editIndex !== null) nextSections[editIndex] = next;
    else nextSections.push(next);

    saveMutation.mutate(nextSections);
  };

  const deleteSection = (index: number) => {
    const nextSections = sections.filter((_, i) => i !== index);
    saveMutation.mutate(nextSections);
  };

  const addPrompt = () => setPrompts((p) => [...p, ""]);
  const updatePrompt = (index: number, value: string) =>
    setPrompts((p) => {
      const next = [...p];
      next[index] = value;
      return next;
    });
  const removePrompt = (index: number) => setPrompts((p) => p.filter((_, i) => i !== index));

  const addResource = () =>
    setResources((r) => [...r, { title: "", type: "", url: "", description: "" }]);

  const updateResource = (index: number, field: keyof Resource, value: string) =>
    setResources((r) => {
      const next = [...r];
      next[index] = { ...next[index], [field]: value } as Resource;
      return next;
    });

  const removeResource = (index: number) => setResources((r) => r.filter((_, i) => i !== index));

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!studyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Missing study id</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Study not found</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If not logged in, kick to auth (avoid blank states)
  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("AdminStudies")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-slate-800">{study.title}</h1>
                <p className="text-sm text-slate-500">
                  {study.scripture_reference ?? ""} • Section Builder
                </p>
              </div>
            </div>

            <Button onClick={() => openEditDialog(null, null)} className="bg-amber-600 hover:bg-amber-700 gap-2">
              <Plus className="h-4 w-4" />
              Add Section
            </Button>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {sections.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {sections.map((section, index) => {
                    const typeConfig = SECTION_TYPES.find((t) => t.type === section.type) ?? SECTION_TYPES[0];
                    const Icon = typeConfig.icon;

                    return (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className={snapshot.isDragging ? "shadow-lg" : ""}>
                            <GradientCard variant="warm" className="p-5">
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-5 w-5 text-slate-400" />
                                </div>

                                <div className={`w-10 h-10 rounded-xl ${typeConfig.bgClass} flex items-center justify-center`}>
                                  <Icon className={`h-5 w-5 ${typeConfig.iconClass}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{typeConfig.label}</Badge>
                                  </div>
                                  <h3 className="font-semibold text-slate-800">{section.title}</h3>
                                  {section.content ? (
                                    <p className="text-sm text-slate-500 line-clamp-1 mt-1">{section.content}</p>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(section, index)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteSection(index)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </GradientCard>
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
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No sections yet</h3>
            <p className="text-slate-500 mb-6">Start building your study by adding sections</p>
            <Button onClick={() => openEditDialog(null, null)} className="bg-amber-600 hover:bg-amber-700 gap-2">
              <Plus className="h-4 w-4" />
              Add First Section
            </Button>
          </div>
        )}
      </div>

      {/* Section Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Edit Section" : "Add New Section"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              upsertSection();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section Type</Label>
                <Select value={sectionType} onValueChange={(v) => setSectionType(v as SectionType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Section Title</Label>
                <Input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  required
                  placeholder="e.g., Read the Passage"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Content / Instructions</Label>
              <Textarea
                value={sectionContent}
                onChange={(e) => setSectionContent(e.target.value)}
                placeholder="Instructions or content for this section..."
                className="min-h-[100px] mt-1"
              />
            </div>

            <div>
              <Label>Scripture Text (optional)</Label>
              <Textarea
                value={sectionScriptureText}
                onChange={(e) => setSectionScriptureText(e.target.value)}
                placeholder="Paste the scripture text here..."
                className="min-h-[100px] mt-1"
              />
            </div>

            {/* Prompts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Reflection Prompts</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPrompt}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Prompt
                </Button>
              </div>

              <div className="space-y-2">
                {prompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => updatePrompt(index, e.target.value)}
                      placeholder="What stands out to you in this passage?"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePrompt(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>External Resources</Label>
                <Button type="button" variant="outline" size="sm" onClick={addResource}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Resource
                </Button>
              </div>

              <div className="space-y-4">
                {resources.map((resource, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Resource {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeResource(index)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={resource.title}
                        onChange={(e) => updateResource(index, "title", e.target.value)}
                        placeholder="Resource title"
                      />

                      <Select
                        value={resource.type}
                        onValueChange={(v) => updateResource(index, "type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="book">Book</SelectItem>
                          <SelectItem value="podcast">Podcast</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      value={resource.url}
                      onChange={(e) => updateResource(index, "url", e.target.value)}
                      placeholder="https://..."
                    />
                    <Input
                      value={resource.description ?? ""}
                      onChange={(e) => updateResource(index, "description", e.target.value)}
                      placeholder="Brief description (optional)"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>

              <Button type="submit" disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save Section
              </Button>
            </div>

            {saveMutation.isError ? (
              <div className="text-sm text-red-600">
                {(saveMutation.error as any)?.message ?? "Failed to save section."}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
