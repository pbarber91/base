import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, Edit2, Trash2, ChevronLeft, GripVertical, Save,
  BookOpen, Lightbulb, MessageCircle, PenLine, ExternalLink, Loader2, X
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import GradientCard from "@/components/ui/GradientCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const SECTION_TYPES = [
  { type: 'scripture_read', label: 'Scripture Reading', icon: BookOpen, color: 'amber' },
  { type: 'reflection', label: 'Reflection', icon: Lightbulb, color: 'violet' },
  { type: 'question', label: 'Question', icon: MessageCircle, color: 'blue' },
  { type: 'journal', label: 'Journal Prompt', icon: PenLine, color: 'emerald' },
  { type: 'resource', label: 'Resources', icon: ExternalLink, color: 'slate' },
];

export default function StudyBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get('id');
  
  const [editSection, setEditSection] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [resources, setResources] = useState([]);
  const queryClient = useQueryClient();

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => base44.entities.ScriptureStudy.filter({ id: studyId }, null, 1).then(r => r[0]),
    enabled: !!studyId
  });

  const saveMutation = useMutation({
    mutationFn: (sections) => base44.entities.ScriptureStudy.update(studyId, { sections }),
    onSuccess: () => {
      queryClient.invalidateQueries(['study']);
      setIsDialogOpen(false);
      setEditSection(null);
      setEditIndex(null);
    }
  });

  const sections = study?.sections || [];

  const openEditDialog = (section = null, index = null) => {
    setEditSection(section);
    setEditIndex(index);
    setPrompts(section?.prompts || ['']);
    setResources(section?.resources || [{ title: '', type: '', url: '', description: '' }]);
    setIsDialogOpen(true);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    saveMutation.mutate(items);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const newSection = {
      id: editSection?.id || Date.now().toString(),
      type: formData.get('type'),
      title: formData.get('title'),
      content: formData.get('content'),
      scripture_text: formData.get('scripture_text'),
      prompts: prompts.filter(p => p.trim()),
      resources: resources.filter(r => r.title && r.url)
    };
    
    const newSections = [...sections];
    if (editIndex !== null) {
      newSections[editIndex] = newSection;
    } else {
      newSections.push(newSection);
    }
    
    saveMutation.mutate(newSections);
  };

  const deleteSection = (index) => {
    const newSections = sections.filter((_, i) => i !== index);
    saveMutation.mutate(newSections);
  };

  const addPrompt = () => setPrompts([...prompts, '']);
  const updatePrompt = (index, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };
  const removePrompt = (index) => setPrompts(prompts.filter((_, i) => i !== index));

  const addResource = () => setResources([...resources, { title: '', type: '', url: '', description: '' }]);
  const updateResource = (index, field, value) => {
    const newResources = [...resources];
    newResources[index] = { ...newResources[index], [field]: value };
    setResources(newResources);
  };
  const removeResource = (index) => setResources(resources.filter((_, i) => i !== index));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
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
                <p className="text-sm text-slate-500">{study.scripture_reference} • Section Builder</p>
              </div>
            </div>
            <Button onClick={() => openEditDialog()} className="bg-amber-600 hover:bg-amber-700 gap-2">
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
                    const typeConfig = SECTION_TYPES.find(t => t.type === section.type) || SECTION_TYPES[0];
                    const Icon = typeConfig.icon;
                    
                    return (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <GradientCard variant="warm" className="p-5">
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-5 w-5 text-slate-400" />
                                </div>
                                <div className={`w-10 h-10 rounded-xl bg-${typeConfig.color}-100 flex items-center justify-center`}>
                                  <Icon className={`h-5 w-5 text-${typeConfig.color}-600`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{typeConfig.label}</Badge>
                                  </div>
                                  <h3 className="font-semibold text-slate-800">{section.title}</h3>
                                  {section.content && (
                                    <p className="text-sm text-slate-500 line-clamp-1 mt-1">{section.content}</p>
                                  )}
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
            <Button onClick={() => openEditDialog()} className="bg-amber-600 hover:bg-amber-700 gap-2">
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
            <DialogTitle>{editSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section Type</Label>
                <Select name="type" defaultValue={editSection?.type || 'scripture_read'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map(t => (
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
                <Input name="title" defaultValue={editSection?.title} required placeholder="e.g., Read the Passage" />
              </div>
            </div>
            
            <div>
              <Label>Content / Instructions</Label>
              <Textarea 
                name="content" 
                defaultValue={editSection?.content} 
                placeholder="Instructions or content for this section..."
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <Label>Scripture Text (optional)</Label>
              <Textarea 
                name="scripture_text" 
                defaultValue={editSection?.scripture_text} 
                placeholder="Paste the scripture text here..."
                className="min-h-[100px]"
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeResource(index)} className="h-6 w-6">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={resource.title}
                        onChange={(e) => updateResource(index, 'title', e.target.value)}
                        placeholder="Resource title"
                      />
                      <Select value={resource.type} onValueChange={(v) => updateResource(index, 'type', v)}>
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
                      onChange={(e) => updateResource(index, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                    <Input
                      value={resource.description}
                      onChange={(e) => updateResource(index, 'description', e.target.value)}
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}