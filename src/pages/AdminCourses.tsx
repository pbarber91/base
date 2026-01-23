import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Edit2, Trash2, Eye, EyeOff, GraduationCap,
  MoreVertical, Loader2, Users, Calendar, Settings, Upload, Image as ImageIcon
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradientCard from "@/components/ui/GradientCard";
import EmptyState from "@/components/shared/EmptyState";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AdminCourses() {
  const [user, setUser] = useState<any>(null);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Cover image (URL stored in DB)
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  const myChurches = churches.filter((c: any) => c.admin_emails?.includes(user?.email));

  const { data: myCourses = [], isLoading } = useQuery({
    queryKey: ['my-courses', user?.email],
    queryFn: async () => {
      const byInstructor = await base44.entities.Course.filter({ instructor_email: user?.email }, '-created_date');
      const byChurch: any[] = [];
      for (const church of myChurches) {
        const churchCourses = await base44.entities.Course.filter({ church_id: church.id }, '-created_date');
        byChurch.push(...churchCourses);
      }
      const allCourses = [...byInstructor, ...byChurch];
      const uniqueCourses = Array.from(new Map(allCourses.map((c: any) => [c.id, c])).values());
      return uniqueCourses;
    },
    enabled: !!user?.email
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
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
      setCoverImageUrl('');
      setUploadError('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['my-courses'])
  });

  const togglePublishMutation = useMutation({
    mutationFn: (course: any) => base44.entities.Course.update(course.id, { is_published: !course.is_published }),
    onSuccess: () => queryClient.invalidateQueries(['my-courses'])
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    saveMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      church_id: formData.get('church_id'),
      category: formData.get('category'),
      difficulty: formData.get('difficulty'),
      estimated_weeks: parseInt(String(formData.get('estimated_weeks') ?? ''), 10) || 4,
      is_public: formData.get('is_public') === 'on',
      cover_image_url: coverImageUrl?.trim() || null,
    });
  };

  const openEditDialog = (course: any = null) => {
    setEditCourse(course);
    setCoverImageUrl(course?.cover_image_url || '');
    setUploadError('');
    setIsDialogOpen(true);
  };

  const churchMap: Record<string, any> = {};
  churches.forEach((c: any) => { churchMap[c.id] = c; });

  const categoryLabels: Record<string, string> = {
    foundations: "Foundations",
    bible_study: "Bible Study",
    theology: "Theology",
    spiritual_growth: "Spiritual Growth",
    leadership: "Leadership",
    family: "Family",
    outreach: "Outreach",
    other: "Other"
  };

  const getAuthedUid = async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  };

  const uploadCoverImage = async (file: File) => {
    setUploadError('');
    setIsUploadingCover(true);
    try {
      const uid = await getAuthedUid();
      if (!uid) {
        throw new Error("You must be signed in to upload images.");
      }

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'png';
      const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      const path = `public/courses/covers/${uid}/${id}.${safeExt}`;

      const { error: upErr } = await supabase
        .storage
        .from('public-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || undefined,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('public-media').getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Upload succeeded but could not generate a public URL.");

      setCoverImageUrl(publicUrl);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const onPickCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset input so selecting the same file again triggers change
    e.target.value = '';
    if (!file) return;

    // Basic guard: only images
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
      return;
    }

    await uploadCoverImage(file);
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
            {myCourses.map((course: any, i: number) => (
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
        <DialogContent className="max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-800">Course Title</Label>
              <Input
                name="title"
                defaultValue={editCourse?.title}
                required
                placeholder="e.g., Foundations of Faith"
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label className="text-slate-800">Description</Label>
              <Textarea
                name="description"
                defaultValue={editCourse?.description}
                placeholder="What will participants learn?"
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-800">Church</Label>
                <Select name="church_id" defaultValue={editCourse?.church_id || myChurches[0]?.id}>
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent>
                    {myChurches.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-800">Category</Label>
                <Select name="category" defaultValue={editCourse?.category || 'bible_study'}>
                  <SelectTrigger className="bg-white text-slate-900">
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
                <Label className="text-slate-800">Difficulty</Label>
                <Select name="difficulty" defaultValue={editCourse?.difficulty || 'beginner'}>
                  <SelectTrigger className="bg-white text-slate-900">
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
                <Label className="text-slate-800">Estimated Weeks</Label>
                <Input
                  name="estimated_weeks"
                  type="number"
                  defaultValue={editCourse?.estimated_weeks || 4}
                  min={1}
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Cover Image Upload + URL */}
            <div className="space-y-2">
              <Label className="text-slate-800">Cover Image (optional)</Label>

              {coverImageUrl ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="h-32 w-full overflow-hidden">
                    <img src={coverImageUrl} alt="Cover preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 truncate">{coverImageUrl}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCoverImageUrl('')}
                      className="shrink-0"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">Upload a cover image</p>
                      <p className="text-xs text-slate-500">PNG/JPG recommended (public)</p>
                    </div>
                    <div className="shrink-0">
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onPickCoverFile}
                          className="hidden"
                        />
                        <span
                          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium cursor-pointer border ${
                            isUploadingCover
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isUploadingCover ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                </div>
              )}

              <div>
                <Label className="text-slate-700 text-xs">Or paste an image URL</Label>
                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch name="is_public" defaultChecked={editCourse?.is_public} />
              <Label className="text-slate-800">Make this course public (visible to all users)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
