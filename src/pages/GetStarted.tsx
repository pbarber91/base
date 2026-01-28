// src/pages/GetStarted.tsx
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Church, User, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

export default function GetStarted() {
  const { user, supabase, loading } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-onboarding", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_completed_at")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // If logged in AND profile completed → leave onboarding
  useEffect(() => {
    if (loading || isLoading) return;
    if (!user) return;

    if (profile?.profile_completed_at) {
      window.location.replace(createPageUrl("Home"));
    }
  }, [loading, isLoading, user, profile]);

  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  // Logged out
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">
            Welcome!
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Sign in to begin your journey.
          </p>
          <Button
            onClick={() => (window.location.href = "/auth")}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  // Logged in + profile NOT completed
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-4">
            Let’s Get You Set Up
          </h1>
          <p className="text-lg text-slate-600">
            Choose how you want to begin.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <GradientCard variant="purple" className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Church className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-center mb-3">
              I’m a Church Leader
            </h2>

            <p className="text-slate-600 mb-6 text-center">
              Create and lead your church.
            </p>

            <Button
              onClick={() =>
                window.location.href = createPageUrl("CreateChurch")
              }
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              Create My Church
            </Button>
          </GradientCard>

          <GradientCard variant="warm" className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <User className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-center mb-3">
              I’m Here to Learn
            </h2>

            <p className="text-slate-600 mb-6 text-center">
              Complete your profile and get started.
            </p>

            <Button
              onClick={() =>
                window.location.href = createPageUrl("SetupProfile")
              }
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
