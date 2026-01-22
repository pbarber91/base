import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import UserAvatar from "@/components/shared/UserAvatar";
import GradientCard from "@/components/ui/GradientCard";
import { 
  GraduationCap, Clock, Users, ChevronLeft, ChevronRight, Play, 
  Calendar, Check, Lock, Video, BookOpen, FileText, MessageSquare, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CourseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      setUser(null);
      // Redirect to GetStarted if not logged in
      window.location.href = createPageUrl("GetStarted");
    });
  }, []);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }, null, 1).then(r => r[0]),
    enabled: !!courseId
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['course-sessions', courseId],
    queryFn: () => base44.entities.CourseSession.filter({ course_id: courseId }, 'order'),
    enabled: !!courseId
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', courseId, user?.email],
    queryFn: () => base44.entities.CourseEnrollment.filter({ course_id: courseId, user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!courseId && !!user?.email
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!user?.email
  });

  const { data: church } = useQuery({
    queryKey: ['church', course?.church_id],
    queryFn: () => base44.entities.Church.filter({ id: course?.church_id }, null, 1).then(r => r[0]),
    enabled: !!course?.church_id
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const newEnrollment = await base44.entities.CourseEnrollment.create({
        user_email: user.email,
        course_id: courseId,
        status: 'enrolled',
        current_session_order: 1,
        completed_sessions: [],
        progress_percent: 0,
        enrolled_at: new Date().toISOString()
      });
      
      await base44.entities.Course.update(courseId, {
        enrollment_count: (course.enrollment_count || 0) + 1
      });
      
      await base44.entities.ActivityFeed.create({
        user_email: user.email,
        user_name: profile?.display_name || user.full_name,
        user_avatar: profile?.avatar_url,
        activity_type: 'enrolled_course',
        title: course.title,
        related_id: courseId,
        related_type: 'course',
        visibility: 'public'
      });
      
      return newEnrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollment']);
      queryClient.invalidateQueries(['course']);
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      const completedSessions = [...(enrollment?.completed_sessions || []), sessionId];
      const progressPercent = Math.round(completedSessions.length / sessions.length * 100);
      const isComplete = completedSessions.length >= sessions.length;
      
      await base44.entities.CourseEnrollment.update(enrollment.id, {
        completed_sessions: completedSessions,
        current_session_order: Math.min((enrollment.current_session_order || 1) + 1, sessions.length),
        progress_percent: progressPercent,
        status: isComplete ? 'completed' : 'in_progress',
        completed_at: isComplete ? new Date().toISOString() : null
      });
      
      await base44.entities.ActivityFeed.create({
        user_email: user.email,
        user_name: profile?.display_name || user.full_name,
        user_avatar: profile?.avatar_url,
        activity_type: isComplete ? 'completed_course' : 'completed_session',
        title: isComplete ? course.title : `Session: ${sessions.find(s => s.id === sessionId)?.title}`,
        description: isComplete ? null : `in ${course.title}`,
        related_id: courseId,
        related_type: isComplete ? 'course' : 'session',
        visibility: 'public'
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['enrollment'])
  });

  const activeSession = sessions.find(s => s.id === activeSessionId);

  if (isLoading) {
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
          <Link to={createPageUrl("Courses")}>
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link to={createPageUrl("Courses")} className="inline-flex items-center gap-2 text-violet-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back to Courses
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-white/20 text-white border-0">{categoryLabels[course.category] || course.category}</Badge>
                <DifficultyBadge difficulty={course.difficulty || 'beginner'} className="bg-white/20 border-white/30 text-white" />
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-serif font-bold mb-4">{course.title}</h1>
              <p className="text-violet-100 text-lg mb-6 leading-relaxed">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {course.instructor_name && (
                  <div className="flex items-center gap-2">
                    <UserAvatar name={course.instructor_name} size="sm" />
                    <span className="text-violet-100">{course.instructor_name}</span>
                  </div>
                )}
                <span className="flex items-center gap-2 text-violet-200">
                  <Calendar className="h-4 w-4" />
                  {sessions.length} sessions
                </span>
                <span className="flex items-center gap-2 text-violet-200">
                  <Clock className="h-4 w-4" />
                  {course.estimated_weeks || 4} weeks
                </span>
                <span className="flex items-center gap-2 text-violet-200">
                  <Users className="h-4 w-4" />
                  {course.enrollment_count || 0} enrolled
                </span>
              </div>
              
              {church && (
                <div className="mt-6 flex items-center gap-3 text-violet-100">
                  <span>Offered by</span>
                  <Badge variant="outline" className="border-violet-300 text-white">
                    {church.name}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Enrollment Card */}
            <div className="lg:w-80">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                {enrollment ? (
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-violet-600 mb-1">{enrollment.progress_percent || 0}%</div>
                      <div className="text-slate-500 text-sm">Complete</div>
                    </div>
                    <Progress value={enrollment.progress_percent || 0} className="h-2 mb-4" />
                    <p className="text-sm text-slate-500 mb-4 text-center">
                      {enrollment.completed_sessions?.length || 0} of {sessions.length} sessions completed
                    </p>
                    <Button 
                      onClick={() => {
                        const nextSession = sessions.find(s => !enrollment.completed_sessions?.includes(s.id));
                        if (nextSession) setActiveSessionId(nextSession.id);
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Continue Learning
                    </Button>
                  </div>
                ) : user ? (
                  <div className="text-center">
                    <GraduationCap className="h-12 w-12 text-violet-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Ready to start?</h3>
                    <p className="text-sm text-slate-500 mb-4">Join {course.enrollment_count || 0} others in this course</p>
                    <Button 
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Enroll Now
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="font-semibold text-slate-800 mb-2">Sign in to enroll</h3>
                    <p className="text-sm text-slate-500 mb-4">Create an account to track your progress</p>
                    <Button onClick={() => base44.auth.redirectToLogin()} className="w-full bg-violet-600 hover:bg-violet-700">
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sessions List */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Course Sessions</h2>
        
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const isCompleted = enrollment?.completed_sessions?.includes(session.id);
            const isLocked = !enrollment && i > 0;
            const isActive = session.id === activeSessionId;
            
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GradientCard 
                  variant={isActive ? 'purple' : 'cool'} 
                  hover={!isLocked}
                  className={`cursor-pointer ${isLocked ? 'opacity-60' : ''}`}
                  onClick={() => !isLocked && setActiveSessionId(isActive ? null : session.id)}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-emerald-500 text-white' : 
                        isLocked ? 'bg-slate-200 text-slate-400' : 
                        'bg-violet-100 text-violet-600'
                      }`}>
                        {isCompleted ? <Check className="h-5 w-5" /> : 
                         isLocked ? <Lock className="h-4 w-4" /> : 
                         <span className="font-semibold">{i + 1}</span>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800">{session.title}</h3>
                        {session.description && (
                          <p className="text-sm text-slate-500 line-clamp-1">{session.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {session.estimated_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.estimated_minutes} min
                          </span>
                        )}
                        <ChevronRight className={`h-5 w-5 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 mt-6 border-t border-slate-100">
                            {session.content_blocks?.map((block, bi) => (
                              <div key={bi} className="mb-4 last:mb-0">
                                {block.type === 'text' && (
                                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{block.content}</p>
                                )}
                                {block.type === 'video' && (
                                  <div className="bg-slate-100 rounded-xl p-4 flex items-center gap-3">
                                    <Video className="h-5 w-5 text-violet-600" />
                                    <a href={block.video_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                                      Watch Video
                                    </a>
                                  </div>
                                )}
                                {block.type === 'scripture' && (
                                  <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-4">
                                    <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
                                      <BookOpen className="h-4 w-4" />
                                      {block.scripture_ref}
                                    </div>
                                    <p className="text-slate-700 italic">{block.content}</p>
                                  </div>
                                )}
                                {block.type === 'quote' && (
                                  <blockquote className="border-l-4 border-violet-300 pl-4 py-2 italic text-slate-600">
                                    "{block.content}"
                                    {block.attribution && <cite className="block text-sm text-slate-500 mt-2 not-italic">— {block.attribution}</cite>}
                                  </blockquote>
                                )}
                                {block.type === 'discussion_question' && (
                                  <div className="bg-blue-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                                      <MessageSquare className="h-4 w-4" />
                                      Discussion Question
                                    </div>
                                    <p className="text-slate-700">{block.content}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {enrollment && !isCompleted && (
                              <div className="flex justify-end mt-6">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeSessionMutation.mutate(session.id);
                                  }}
                                  disabled={completeSessionMutation.isPending}
                                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                                >
                                  {completeSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  Mark Complete
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </GradientCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}