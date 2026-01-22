import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Church, User, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function GetStarted() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, null, 1).then(r => r[0]),
    enabled: !!user?.email
  });

  useEffect(() => {
    if (!isLoading && profile) {
      // User already has a profile, redirect to home
      window.location.href = createPageUrl("Home");
    }
  }, [profile, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">
            Welcome to Deeper!
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Create an account to start your faith journey with guided scripture studies, courses, and community.
          </p>
          <Button 
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700"
          >
            Sign In or Create Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">
            Welcome to Deeper!
          </h1>
          <p className="text-lg text-slate-600">
            Let's get you started on your faith journey
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <button 
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="text-amber-600 hover:text-amber-700 font-medium underline"
            >
              Sign In
            </button>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Church Leader Path */}
          <GradientCard variant="purple" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">
              I'm a Church Leader
            </h2>
            <p className="text-slate-600 mb-6 text-center">
              Create your church, build courses, and lead your congregation in digital discipleship
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <span>Create and manage church courses</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <span>Build church-only study groups</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <span>Track member engagement</span>
              </li>
            </ul>
            <Button 
              onClick={() => window.location.href = createPageUrl("CreateChurch")}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              Create My Church
            </Button>
          </GradientCard>

          {/* Regular User Path */}
          <GradientCard variant="warm" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <User className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">
              I'm Here to Learn
            </h2>
            <p className="text-slate-600 mb-6 text-center">
              Dive into scripture studies, take courses, and join study groups
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Access guided scripture studies</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Join study groups and courses</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Track your spiritual growth</span>
              </li>
            </ul>
            <Button 
              onClick={() => window.location.href = createPageUrl("SetupProfile")}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Complete My Profile
            </Button>
          </GradientCard>
        </div>
      </div>
    </div>
  );
}