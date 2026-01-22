import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GradientCard from "@/components/ui/GradientCard";
import { 
  Church, Users, GraduationCap, Settings, Plus, Edit2, 
  Loader2, UserPlus, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChurchAdmin() {
  const [user, setUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: churches = [], isLoading } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['church-courses'],
    queryFn: () => base44.entities.Course.list()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.UserProfile.list()
  });

  const myChurches = churches.filter(c => c.admin_emails?.includes(user?.email));
  const selectedChurch = myChurches[0];

  const updateChurchMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Church.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['churches']);
      setIsEditDialogOpen(false);
    }
  });

  const addAdminMutation = useMutation({
    mutationFn: (email) => {
      const newAdmins = [...(selectedChurch.admin_emails || []), email];
      return base44.entities.Church.update(selectedChurch.id, { admin_emails: newAdmins });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['churches']);
      setNewAdminEmail('');
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: (email) => {
      const newAdmins = (selectedChurch.admin_emails || []).filter(e => e !== email);
      return base44.entities.Church.update(selectedChurch.id, { admin_emails: newAdmins });
    },
    onSuccess: () => queryClient.invalidateQueries(['churches'])
  });

  const handleUpdateChurch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateChurchMutation.mutate({
      id: selectedChurch.id,
      data: {
        name: formData.get('name'),
        description: formData.get('description'),
        location: formData.get('location'),
        website: formData.get('website'),
        logo_url: formData.get('logo_url'),
        cover_image_url: formData.get('cover_image_url')
      }
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!selectedChurch) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <Church className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Church Access</h2>
          <p className="text-slate-500">You don't have admin access to any churches yet. Contact your church administrator to get access.</p>
        </div>
      </div>
    );
  }

  const churchCourses = courses.filter(c => c.church_id === selectedChurch.id);
  const churchMembers = profiles.filter(p => p.church_id === selectedChurch.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Church className="h-6 w-6" />
            </div>
            <Badge className="bg-white/20 text-white border-0">Church Admin</Badge>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">{selectedChurch.name}</h1>
          <p className="text-violet-100">{selectedChurch.description}</p>
          <div className="flex items-center gap-4 mt-6">
            <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Church Info
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <GradientCard variant="purple" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{churchCourses.length}</p>
                    <p className="text-sm text-slate-500">Courses</p>
                  </div>
                </div>
              </GradientCard>

              <GradientCard variant="warm" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{churchMembers.length}</p>
                    <p className="text-sm text-slate-500">Members</p>
                  </div>
                </div>
              </GradientCard>

              <GradientCard variant="sage" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{selectedChurch.admin_emails?.length || 0}</p>
                    <p className="text-sm text-slate-500">Admins</p>
                  </div>
                </div>
              </GradientCard>
            </div>

            <GradientCard variant="cool" className="p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Church Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Location:</span>
                  <span className="ml-2 text-slate-800">{selectedChurch.location || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Website:</span>
                  <a href={selectedChurch.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-violet-600 hover:underline">
                    {selectedChurch.website || 'Not set'}
                  </a>
                </div>
              </div>
            </GradientCard>
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <GradientCard variant="purple" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800">Church Courses</h3>
                <Button onClick={() => window.location.href = '/admin-courses'} className="bg-violet-600 hover:bg-violet-700 gap-2">
                  <Plus className="h-4 w-4" />
                  Manage Courses
                </Button>
              </div>
              <div className="space-y-3">
                {churchCourses.map(course => (
                  <div key={course.id} className="p-4 bg-white rounded-lg border border-violet-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">{course.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{course.visibility === 'public' ? 'Public' : 'Church Only'}</Badge>
                          <span className="text-xs text-slate-500">{course.enrollment_count} enrolled</span>
                        </div>
                      </div>
                      <Badge className={course.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {churchCourses.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No courses yet. Create your first course!</p>
                )}
              </div>
            </GradientCard>
          </TabsContent>

          {/* Admins */}
          <TabsContent value="admins">
            <GradientCard variant="sage" className="p-6">
              <h3 className="font-semibold text-slate-800 mb-6">Church Administrators</h3>
              
              <div className="mb-6">
                <Label className="mb-2">Add New Admin</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@email.com"
                    type="email"
                  />
                  <Button
                    onClick={() => addAdminMutation.mutate(newAdminEmail)}
                    disabled={!newAdminEmail || addAdminMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {addAdminMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {(selectedChurch.admin_emails || []).map(email => (
                  <div key={email} className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-100">
                    <span className="text-slate-700">{email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAdminMutation.mutate(email)}
                      disabled={removeAdminMutation.isPending}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </GradientCard>
          </TabsContent>

          {/* Members */}
          <TabsContent value="members">
            <GradientCard variant="warm" className="p-6">
              <h3 className="font-semibold text-slate-800 mb-6">Church Members</h3>
              <div className="space-y-2">
                {churchMembers.map(member => (
                  <div key={member.user_email} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-medium">
                      {member.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{member.display_name}</p>
                      <p className="text-xs text-slate-500">{member.user_email}</p>
                    </div>
                    {member.faith_journey_stage && (
                      <Badge variant="outline" className="text-xs">{member.faith_journey_stage}</Badge>
                    )}
                  </div>
                ))}
                {churchMembers.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No members yet</p>
                )}
              </div>
            </GradientCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Church Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Church Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateChurch} className="space-y-4">
            <div>
              <Label>Church Name</Label>
              <Input name="name" defaultValue={selectedChurch.name} required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={selectedChurch.description} className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input name="location" defaultValue={selectedChurch.location} placeholder="City, State" />
              </div>
              <div>
                <Label>Website</Label>
                <Input name="website" defaultValue={selectedChurch.website} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input name="logo_url" defaultValue={selectedChurch.logo_url} placeholder="https://..." />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input name="cover_image_url" defaultValue={selectedChurch.cover_image_url} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateChurchMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
                {updateChurchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}