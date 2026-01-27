import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Church, User, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  faith_journey_stage: string | null;
  bio: string | null;
  church_id: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

function isProfileComplete(p: ProfileRow | null): boolean {
  if (!p) return false;
  const hasName = !!(p.display_name ?? "").trim();
  const hasStage = !!(p.faith_journey_stage ?? "").trim();
  return hasName && hasStage;
}

export default function GetStarted() {
  const { user, supabase, loading } = useAuth();

  const { data: profile, isLoading: loadingProfile, error } = useQuery<ProfileRow | null>({
    queryKey: ["profile", user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,faith_journey_stage,bio,church_id,avatar_url,role")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (loadingProfile) return;

    // Only redirect home when the profile is actually "complete"
    if (isProfileComplete(profile)) {
      window.location.href = createPageUrl("Home");
    }
  }, [loading, user, loadingProfile, profile]);

  if (loading || (user && loadingProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border rounded-xl p-5">
          <div className="font-semibold text-slate-900 mb-2">Get Started error</div>
          <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">
            {String((error as any)?.message ?? error)}
          </pre>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="outline" onClick={() => (window.location.href = createPageUrl("Home"))}>
              Back Home
            </Button>
          </div>
        </div>
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
            Sign in (magic link) to start your faith journey with studies, courses, and community.
          </p>
          <Button onClick={() => (window.location.href = "/auth")} size="lg" className="bg-amber-600 hover:bg-amber-700">
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  // Logged in AND profile incomplete => show choices
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">Welcome to Deeper!</h1>
          <p className="text-lg text-slate-600">Let’s get you started.</p>
          <p className="text-sm text-slate-500 mt-3">
            Finish your personal profile first — you can create or join a church after.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <GradientCard variant="warm" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <User className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">I’m Here to Learn</h2>
            <p className="text-slate-600 mb-6 text-center">Set up your profile, then join studies, groups, and courses.</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Complete your profile</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Pick or change your church later</span>
              </li>
            </ul>

            <Button onClick={() => (window.location.href = createPageUrl("SetupProfile"))} className="w-full bg-amber-600 hover:bg-amber-700">
              Complete My Profile
            </Button>
          </GradientCard>

          <GradientCard variant="purple" className="p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 text-center">I’m a Church Leader</h2>
            <p className="text-slate-600 mb-6 text-center">Create your church after your profile is set up.</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <span>Create a church tied to your account</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <span>Assign church admins/leaders later</span>
              </li>
            </ul>

            <Button onClick={() => (window.location.href = createPageUrl("SetupProfile"))} className="w-full bg-violet-600 hover:bg-violet-700">
              Set Up Profile First
            </Button>

            <p className="text-xs text-slate-500 mt-3 text-center">
              After setup, use <span className="font-medium">Create Church</span> from the Church Admin area.
            </p>
          </GradientCard>
        </div>
      </div>
    </div>
  );
}
