import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/shared/UserAvatar";
import DiscussionThread from "@/components/social/DiscussionThread";
import GradientCard from "@/components/ui/GradientCard";
import { 
  Users, ChevronLeft, BookOpen, GraduationCap, Lock, UserPlus,
  MessageCircle, Send, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GroupDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [newPost, setNewPost] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => base44.entities.StudyGroup.filter({ id: groupId }, null, 1).then(r => r[0]),
    enabled: !!groupId
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.UserProfile.list()
  });

  const { data: discussions = [] } = useQuery({
    queryKey: ['group-discussions', groupId],
    queryFn: () => base44.entities.Discussion.filter({ context_type: 'group', context_id: groupId }, '-created_date'),
    enabled: !!groupId
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!user?.email
  });

  const { data: linkedStudy } = useQuery({
    queryKey: ['linked-study', group?.linked_study_id],
    queryFn: () => base44.entities.ScriptureStudy.filter({ id: group?.linked_study_id }, null, 1).then(r => r[0]),
    enabled: !!group?.linked_study_id
  });

  const { data: linkedCourse } = useQuery({
    queryKey: ['linked-course', group?.linked_course_id],
    queryFn: () => base44.entities.Course.filter({ id: group?.linked_course_id }, null, 1).then(r => r[0]),
    enabled: !!group?.linked_course_id
  });

  const profileMap = {};
  profiles.forEach(p => { profileMap[p.user_email] = p; });

  const isMember = group?.member_emails?.includes(user?.email) || group?.leader_email === user?.email;
  const isLeader = group?.leader_email === user?.email;

  const joinMutation = useMutation({
    mutationFn: async () => {
      const newMembers = [...(group.member_emails || []), user.email];
      await base44.entities.StudyGroup.update(groupId, { member_emails: newMembers });
      
      await base44.entities.ActivityFeed.create({
        user_email: user.email,
        user_name: myProfile?.display_name || user.full_name,
        user_avatar: myProfile?.avatar_url,
        activity_type: 'joined_group',
        title: group.name,
        related_id: groupId,
        related_type: 'group',
        visibility: 'public'
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['group'])
  });

  const postMutation = useMutation({
    mutationFn: (content) => base44.entities.Discussion.create({
      author_email: user.email,
      author_name: myProfile?.display_name || user.full_name,
      author_avatar: myProfile?.avatar_url,
      content,
      context_type: 'group',
      context_id: groupId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-discussions']);
      setNewPost('');
    }
  });

  const replyMutation = useMutation({
    mutationFn: ({ parentId, content }) => base44.entities.Discussion.create({
      author_email: user.email,
      author_name: myProfile?.display_name || user.full_name,
      author_avatar: myProfile?.avatar_url,
      content,
      context_type: 'group',
      context_id: groupId,
      parent_id: parentId
    }),
    onSuccess: () => queryClient.invalidateQueries(['group-discussions'])
  });

  const handleReply = async (parentId, content) => {
    replyMutation.mutate({ parentId, content });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Group not found</h2>
          <Link to={createPageUrl("Groups")}>
            <Button>Back to Groups</Button>
          </Link>
        </div>
      </div>
    );
  }

  const members = (group.member_emails || []).map(email => profileMap[email]).filter(Boolean);
  const leader = profileMap[group.leader_email];

  const typeConfig = {
    scripture_study: { icon: BookOpen, label: "Scripture Study", color: "amber" },
    course: { icon: GraduationCap, label: "Course Group", color: "violet" },
    general: { icon: Users, label: "Fellowship", color: "emerald" }
  };
  const config = typeConfig[group.type] || typeConfig.general;
  const TypeIcon = config.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link to={createPageUrl("Groups")} className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back to Groups
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 bg-white/20 rounded-xl`}>
                  <TypeIcon className="h-6 w-6" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{config.label}</Badge>
                {group.is_private && (
                  <Badge variant="outline" className="border-white/40 text-white gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-serif font-bold mb-3">{group.name}</h1>
              <p className="text-emerald-100 mb-6">{group.description}</p>
              
              {/* Leader & Members Preview */}
              <div className="flex items-center gap-4">
                {leader && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserAvatar name={leader.display_name} imageUrl={leader.avatar_url} size="sm" />
                    <span className="text-emerald-100">Led by <strong className="text-white">{leader.display_name}</strong></span>
                  </div>
                )}
                <span className="text-emerald-200 text-sm">
                  {group.member_emails?.length || 0} / {group.max_members} members
                </span>
              </div>
            </div>
            
            {!isMember && user && (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending || (group.member_emails?.length >= group.max_members)}
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2"
              >
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                Join Group
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main - Discussions */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Group Discussion
            </h2>
            
            {/* New Post */}
            {isMember && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex gap-3">
                  <UserAvatar name={myProfile?.display_name || user?.full_name} imageUrl={myProfile?.avatar_url} size="md" />
                  <div className="flex-1">
                    <Textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share something with the group..."
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <Button
                        onClick={() => postMutation.mutate(newPost)}
                        disabled={!newPost.trim() || postMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                      >
                        {postMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Discussions */}
            {discussions.filter(d => !d.parent_id).length > 0 ? (
              <div className="space-y-4">
                {discussions.filter(d => !d.parent_id).map(discussion => (
                  <DiscussionThread
                    key={discussion.id}
                    discussion={discussion}
                    replies={discussions.filter(d => d.parent_id === discussion.id)}
                    currentUserEmail={user?.email}
                    onReply={handleReply}
                    onLike={() => {}}
                    showReplyForm={isMember}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No discussions yet. {isMember ? "Start the conversation!" : "Join to participate."}</p>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Linked Content */}
            {linkedStudy && (
              <GradientCard variant="warm" className="p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  Current Study
                </h3>
                <Link to={createPageUrl("StudyDetail") + `?id=${linkedStudy.id}`}>
                  <div className="hover:bg-amber-50 rounded-lg p-3 -m-1 transition-colors">
                    <p className="font-medium text-slate-700">{linkedStudy.title}</p>
                    <p className="text-sm text-amber-700">{linkedStudy.scripture_reference}</p>
                  </div>
                </Link>
              </GradientCard>
            )}
            
            {linkedCourse && (
              <GradientCard variant="purple" className="p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-violet-600" />
                  Current Course
                </h3>
                <Link to={createPageUrl("CourseDetail") + `?id=${linkedCourse.id}`}>
                  <div className="hover:bg-violet-50 rounded-lg p-3 -m-1 transition-colors">
                    <p className="font-medium text-slate-700">{linkedCourse.title}</p>
                    <p className="text-sm text-violet-700">{linkedCourse.sessions_count} sessions</p>
                  </div>
                </Link>
              </GradientCard>
            )}
            
            {/* Members */}
            <GradientCard variant="sage" className="p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Members ({(group.member_emails?.length || 0) + 1})
              </h3>
              <div className="space-y-3">
                {/* Leader */}
                {leader && (
                  <Link to={createPageUrl("Profile") + `?email=${group.leader_email}`} className="flex items-center gap-3 hover:bg-emerald-50 rounded-lg p-2 -m-1 transition-colors">
                    <UserAvatar name={leader.display_name} imageUrl={leader.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{leader.display_name}</p>
                      <Badge variant="outline" className="text-xs">Leader</Badge>
                    </div>
                  </Link>
                )}
                
                {/* Members */}
                {members.map(member => (
                  <Link 
                    key={member.user_email} 
                    to={createPageUrl("Profile") + `?email=${member.user_email}`}
                    className="flex items-center gap-3 hover:bg-emerald-50 rounded-lg p-2 -m-1 transition-colors"
                  >
                    <UserAvatar name={member.display_name} imageUrl={member.avatar_url} size="sm" />
                    <p className="font-medium text-slate-800 text-sm truncate">{member.display_name}</p>
                  </Link>
                ))}
              </div>
            </GradientCard>
          </div>
        </div>
      </div>
    </div>
  );
}