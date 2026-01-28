import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Church, User, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

type ProfileRow = {
  id: string;
  profile_completed_at: string | null;
};

export default function GetStarted() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileRow | null>({
    queryKey: ["profile-onboarding", user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, profile_completed_at")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const isComplete = !!profile?.profile_completed_at;

  useEffect(() => {
    // IMPORTANT: do not redirect while auth/profile are still resolving
    if (loading) return;
    if (!user) return;
    if (loadingProfile) return;

    // If already complete, get them out of onboarding
    if (isComplete) {
      navigate(createPageUrl("Home"), { replace: true });
    }
  }, [loading, user, loadingProfile, isComplete, navigate]);

  if (loading || (user && loadingProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  // Not logged in view
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">Welcome!</h1>
          <p className="text-lg text-slate-600 mb-8">
            Sign in (magic link) to start your faith journey with guided scripture studies, courses, and community.
          </p>
          <Button
            onClick={() => navigate("/auth", { replace: true })}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  // Logged in AND not complete => show choices
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">Welcome to Deeper!</h1>
          <p className="text-lg text-slate-600">Let’s get you started.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <GradientCard variant="purple" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Church className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">I’m a Church Leader</h2>
            <p className="text-slate-600 mb-6 text-center">Create your church, build courses, and lead your congregation.</p>

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

            {/* Must be logged in to create a church; user is logged in here */}
            <Button
              onClick={() => navigate(createPageUrl("CreateChurch"))}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              Create My Church
            </Button>

            <p className="text-xs text-slate-500 mt-3 text-center">
              You’ll still complete your personal profile after creating the church.
            </p>
          </GradientCard>

          <GradientCard variant="warm" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <User className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">I’m Here to Learn</h2>
            <p className="text-slate-600 mb-6 text-center">Dive into studies, take courses, and join groups.</p>

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
                <span>Track your growth</span>
              </li>
            </ul>

            <Button
              onClick={() => navigate(createPageUrl("SetupProfile"))}
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
