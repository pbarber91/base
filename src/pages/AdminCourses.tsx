import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, GraduationCap, 
  MoreVertical, Loader2, Users, Calendar, Settings
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import EmptyState from "@/components/shared/EmptyState";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AdminCourses() {
  const [user, setUser] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  const myChurches = churches.filter(c => c.admin_emails?.includes(user?.email));

  const { data: myCourses = [], isLoading } = useQuery({
    queryKey: ['my-courses', user?.email],
    queryFn: async () => {
      const byInstructor = await base44.entities.Course.filter({ instructor_email: user?.email }, '-created_date');
      const byChurch = [];
      for (const church of myChurches) {
        const churchCourses = await base44.entities.Course.filter({ church_id: church.id }, '-created_date');
        byChurch.push(...churchCourses);
      }
      const allCourses = [...byInstructor, ...byChurch];
      const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());
      return uniqueCourses;
    },
    enabled: !!user?.email
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editCourse?.id) {
        return base44.entities.Course.update(editCourse.id, data);
      }
      return base44.entities.Course.create({
        ...data,
        instructor_email: user.email,
        instructor_name: user.full_name,
        enrollment_count: 0,
        sessions_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-courses']);
      setIsDialogOpen(false);
      setEditCourse(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['my-courses'])
  });

  const togglePublishMutation = useMutation({
    mutationFn: (course) => base44.entities.Course.update(course.id, { is_published: !course.is_published }),
    onSuccess: () => queryClient.invalidateQueries(['my-courses'])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    saveMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      church_id: formData.get('church_id'),
      category: formData.get('category'),
      difficulty: formData.get('difficulty'),
      estimated_weeks: parseInt(formData.get('estimated_weeks')) || 4,
      is_public: formData.get('is_public') === 'on',
      cover_image_url: formData.get('cover_image_url')
    });
  };

  const openEditDialog = (course = null) => {
    setEditCourse(course);
    setIsDialogOpen(true);
  };

  const churchMap = {};
  churches.forEach(c => { churchMap[c.id] = c; });

  const categoryLabels = {
    foundations: "Foundations",
    bible_study: "Bible Study",
    theology: "Theology",
    spiritual_growth: "Spiritual Growth",
    leadership: "Leadership",
    family: "Family",
    outreach: "Outreach",
    other: "Other"
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in required</h2>
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Settings className="h-6 w-6" />
                </div>
                <span className="text-violet-100 font-medium">Course Management</span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-2">My Courses</h1>
              <p className="text-violet-100">Create and manage courses for your church community</p>
            </div>
            <Button 
              onClick={() => openEditDialog()} 
              size="lg" 
              className="bg-white text-violet-700 hover:bg-violet-50 gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Course
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : myCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GradientCard variant="cool" className="overflow-hidden">
                  {course.cover_image_url && (
                    <div className="h-32 overflow-hidden">
                      <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800 line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {churchMap[course.church_id]?.name || 'No church'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(course)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("CourseBuilder") + `?id=${course.id}`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Sessions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePublishMutation.mutate(course)}>
                            {course.is_published ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {course.is_published ? 'Unpublish' : 'Publish'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(course.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant="outline">{categoryLabels[course.category] || course.category}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {course.sessions_count || 0} sessions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.enrollment_count || 0} enrolled
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Link to={createPageUrl("CourseBuilder") + `?id=${course.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Manage Sessions
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="No courses yet"
            description="Create your first course to start discipling your community."
            action={() => openEditDialog()}
            actionLabel="Create Course"
          />
        )}
      </div>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Course Title</Label>
              <Input name="title" defaultValue={editCourse?.title} required placeholder="e.g., Foundations of Faith" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editCourse?.description} placeholder="What will participants learn?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Church</Label>
                <Select name="church_id" defaultValue={editCourse?.church_id || myChurches[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent>
                    {myChurches.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select name="category" defaultValue={editCourse?.category || 'bible_study'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select name="difficulty" defaultValue={editCourse?.difficulty || 'beginner'}>
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
                <Label>Estimated Weeks</Label>
                <Input name="estimated_weeks" type="number" defaultValue={editCourse?.estimated_weeks || 4} min={1} />
              </div>
            </div>
            <div>
              <Label>Cover Image URL (optional)</Label>
              <Input name="cover_image_url" defaultValue={editCourse?.cover_image_url} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch name="is_public" defaultChecked={editCourse?.is_public} />
              <Label>Make this course public (visible to all users)</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-violet-600 hover:bg-violet-700 gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editCourse ? 'Save Changes' : 'Create Course'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}