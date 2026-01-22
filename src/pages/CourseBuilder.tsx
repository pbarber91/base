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
  Video, FileText, BookOpen, Quote, MessageSquare, Link2, Loader2, X
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import GradientCard from "@/components/ui/GradientCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: FileText, color: 'slate' },
  { type: 'video', label: 'Video', icon: Video, color: 'red' },
  { type: 'scripture', label: 'Scripture', icon: BookOpen, color: 'amber' },
  { type: 'quote', label: 'Quote', icon: Quote, color: 'violet' },
  { type: 'discussion_question', label: 'Discussion', icon: MessageSquare, color: 'blue' },
  { type: 'resource_link', label: 'Resource Link', icon: Link2, color: 'emerald' },
];

function ContentBlockEditor({ block, onChange, onRemove }) {
  const config = BLOCK_TYPES.find(b => b.type === block.type) || BLOCK_TYPES[0];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-${config.color}-100`}>
          <Icon className={`h-4 w-4 text-${config.color}-600`} />
        </div>
        <Badge variant="outline">{config.label}</Badge>
        <Button variant="ghost" size="icon" onClick={onRemove} className="ml-auto h-8 w-8 text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {(block.type === 'text' || block.type === 'discussion_question' || block.type === 'quote') && (
        <Textarea
          value={block.content || ''}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          placeholder={block.type === 'quote' ? 'Enter the quote...' : block.type === 'discussion_question' ? 'Enter your discussion question...' : 'Enter your content...'}
          className="min-h-[100px]"
        />
      )}
      
      {block.type === 'quote' && (
        <Input
          value={block.attribution || ''}
          onChange={(e) => onChange({ ...block, attribution: e.target.value })}
          placeholder="Attribution (optional)"
          className="mt-3"
        />
      )}
      
      {block.type === 'video' && (
        <Input
          value={block.video_url || ''}
          onChange={(e) => onChange({ ...block, video_url: e.target.value })}
          placeholder="Video URL (YouTube, Vimeo, etc.)"
        />
      )}
      
      {block.type === 'scripture' && (
        <>
          <Input
            value={block.scripture_ref || ''}
            onChange={(e) => onChange({ ...block, scripture_ref: e.target.value })}
            placeholder="Scripture Reference (e.g., John 3:16)"
            className="mb-3"
          />
          <Textarea
            value={block.content || ''}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Scripture text (optional - readers can look it up)"
            className="min-h-[80px]"
          />
        </>
      )}
      
      {block.type === 'resource_link' && (
        <>
          <Input
            value={block.content || ''}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Resource title"
            className="mb-3"
          />
          <Input
            value={block.video_url || ''}
            onChange={(e) => onChange({ ...block, video_url: e.target.value })}
            placeholder="Resource URL"
          />
        </>
      )}
    </div>
  );
}

export default function CourseBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  
  const [editSession, setEditSession] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sessionBlocks, setSessionBlocks] = useState([]);
  const queryClient = useQueryClient();

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }, null, 1).then(r => r[0]),
    enabled: !!courseId
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', courseId],
    queryFn: () => base44.entities.CourseSession.filter({ course_id: courseId }, 'order'),
    enabled: !!courseId
  });

  const saveSessionMutation = useMutation({
    mutationFn: async (data) => {
      if (editSession?.id) {
        return base44.entities.CourseSession.update(editSession.id, data);
      }
      const newSession = await base44.entities.CourseSession.create({
        ...data,
        course_id: courseId,
        order: sessions.length + 1
      });
      await base44.entities.Course.update(courseId, { sessions_count: sessions.length + 1 });
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sessions']);
      queryClient.invalidateQueries(['course']);
      setIsDialogOpen(false);
      setEditSession(null);
      setSessionBlocks([]);
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.CourseSession.delete(id);
      await base44.entities.Course.update(courseId, { sessions_count: Math.max(0, sessions.length - 1) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sessions']);
      queryClient.invalidateQueries(['course']);
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedSessions) => {
      for (let i = 0; i < reorderedSessions.length; i++) {
        await base44.entities.CourseSession.update(reorderedSessions[i].id, { order: i + 1 });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['sessions'])
  });

  const openEditDialog = (session = null) => {
    setEditSession(session);
    setSessionBlocks(session?.content_blocks || []);
    setIsDialogOpen(true);
  };

  const addBlock = (type) => {
    setSessionBlocks([...sessionBlocks, { id: Date.now().toString(), type, content: '' }]);
  };

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...sessionBlocks];
    newBlocks[index] = updatedBlock;
    setSessionBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    setSessionBlocks(sessionBlocks.filter((_, i) => i !== index));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(sessions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderMutation.mutate(items);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    saveSessionMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      estimated_minutes: parseInt(formData.get('estimated_minutes')) || 30,
      content_blocks: sessionBlocks
    });
  };

  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Course not found</h2>
          <Link to={createPageUrl("AdminCourses")}>
            <Button>Back to Courses</Button>
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
              <Link to={createPageUrl("AdminCourses")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-slate-800">{course.title}</h1>
                <p className="text-sm text-slate-500">Session Builder</p>
              </div>
            </div>
            <Button onClick={() => openEditDialog()} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="h-4 w-4" />
              Add Session
            </Button>
          </div>
        </div>
      </div>
      
      {/* Sessions List */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loadingSessions ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : sessions.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sessions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {sessions.map((session, index) => (
                    <Draggable key={session.id} draggableId={session.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <GradientCard variant="cool" className="p-5">
                            <div className="flex items-center gap-4">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-slate-400" />
                              </div>
                              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-600">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800">{session.title}</h3>
                                {session.description && (
                                  <p className="text-sm text-slate-500 line-clamp-1">{session.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary">
                                  {session.content_blocks?.length || 0} blocks
                                </Badge>
                                <Badge variant="outline">
                                  {session.estimated_minutes || 30} min
                                </Badge>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(session)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deleteSessionMutation.mutate(session.id)}
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
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No sessions yet</h3>
            <p className="text-slate-500 mb-6">Start building your course by adding the first session</p>
            <Button onClick={() => openEditDialog()} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="h-4 w-4" />
              Add First Session
            </Button>
          </div>
        )}
      </div>
      
      {/* Session Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSession ? 'Edit Session' : 'Add New Session'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Session Title</Label>
                <Input name="title" defaultValue={editSession?.title} required placeholder="e.g., Understanding Grace" />
              </div>
              <div className="col-span-2">
                <Label>Description (optional)</Label>
                <Textarea name="description" defaultValue={editSession?.description} placeholder="Brief overview of this session" />
              </div>
              <div>
                <Label>Estimated Minutes</Label>
                <Input name="estimated_minutes" type="number" defaultValue={editSession?.estimated_minutes || 30} min={5} />
              </div>
            </div>
            
            {/* Content Blocks */}
            <div>
              <Label className="mb-3 block">Content Blocks</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {BLOCK_TYPES.map(bt => (
                  <Button
                    key={bt.type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock(bt.type)}
                    className="gap-2"
                  >
                    <bt.icon className="h-4 w-4" />
                    {bt.label}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {sessionBlocks.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <ContentBlockEditor
                        block={block}
                        onChange={(b) => updateBlock(index, b)}
                        onRemove={() => removeBlock(index)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {sessionBlocks.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                    Add content blocks using the buttons above
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSessionMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save Session
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}