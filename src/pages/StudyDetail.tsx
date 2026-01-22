import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import StudyWalkthrough from "@/components/studies/StudyWalkthrough";
import { 
  BookOpen, Clock, ChevronLeft, Play, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StudyDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [responses, setResponses] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      setUser(null);
      // Redirect to GetStarted if not logged in
      window.location.href = createPageUrl("GetStarted");
    });
  }, []);

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => base44.entities.ScriptureStudy.filter({ id: studyId }, null, 1).then(r => r[0]),
    enabled: !!studyId
  });

  const { data: existingResponse } = useQuery({
    queryKey: ['study-response', studyId, user?.email],
    queryFn: () => base44.entities.StudyResponse.filter({ study_id: studyId, user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!studyId && !!user?.email
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!user?.email
  });

  useEffect(() => {
    if (existingResponse) {
      setResponses(existingResponse);
    }
  }, [existingResponse]);

  const completeStudyMutation = useMutation({
    mutationFn: async () => {
      if (existingResponse) {
        await base44.entities.StudyResponse.update(existingResponse.id, {
          ...responses,
          completed_at: new Date().toISOString()
        });
      } else {
        await base44.entities.StudyResponse.create({
          user_email: user.email,
          study_id: studyId,
          ...responses,
          completed_at: new Date().toISOString()
        });
      }
      
      await base44.entities.ActivityFeed.create({
        user_email: user.email,
        user_name: profile?.display_name || user.full_name,
        user_avatar: profile?.avatar_url,
        activity_type: 'completed_study',
        title: study.title,
        related_id: studyId,
        related_type: 'study',
        visibility: 'public'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['study-response']);
      window.location.href = createPageUrl("Studies");
    }
  });

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
          <Link to={createPageUrl("Studies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link to={createPageUrl("Studies")} className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back to Studies
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <DifficultyBadge difficulty={study.difficulty} className="bg-white/20 border-white/30 text-white" />
                <span className="text-amber-100 text-sm flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {study.estimated_minutes || 20} min
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold mb-3">{study.title}</h1>
              <p className="text-amber-100 mb-4">{study.description}</p>
              <div className="flex items-center gap-2 text-amber-200 font-medium">
                <BookOpen className="h-5 w-5" />
                {study.scripture_reference}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {!user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-lg mx-auto"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Play className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Sign in to Start</h2>
            <p className="text-slate-500 mb-6">Create an account to save your responses and track your progress.</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-amber-600 hover:bg-amber-700">
              Sign In
            </Button>
          </motion.div>
        ) : (
          <StudyWalkthrough
            study={study}
            difficulty={study.difficulty}
            responses={responses}
            onResponseChange={setResponses}
            onComplete={() => completeStudyMutation.mutate()}
          />
        )}
      </div>
    </div>
  );
}