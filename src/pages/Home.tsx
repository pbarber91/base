import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import HeroSection from "@/components/home/HeroSection";
import FeatureCards from "@/components/home/FeatureCards";
import DifficultyTracks from "@/components/home/DifficultyTracks";
import StudyCard from "@/components/studies/StudyCard";
import CourseCard from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";

export default function Home() {
  const navigate = useNavigate();

  // Keep legacy user fetch for HeroSection prop compatibility
  const [legacyUser, setLegacyUser] = useState<any>(null);
  useEffect(() => {
    base44.auth
      .me()
      .then(setLegacyUser)
      .catch(() => setLegacyUser(null));
  }, []);

  // Source of truth for auth/profile state
  const { user, profile, loading } = useAuth();

  const profileCompletedAt = (profile as any)?.profile_completed_at ?? null;

  const shouldShowGetStartedBanner = useMemo(() => {
    if (loading) return false;

    // Logged out => show banner
    if (!user) return true;

    // Logged in but not completed => show banner
    return !profileCompletedAt;
  }, [loading, user, profileCompletedAt]);

  const bannerTitle = useMemo(() => {
    if (!user) return "New here?";
    return "Finish setting up your profile";
  }, [user]);

  const bannerBody = useMemo(() => {
    if (!user) {
      return "Sign in with a magic link to start studies, join groups, and connect with your church.";
    }
    return "You’re logged in, but your profile isn’t complete yet. Finish setup to unlock the full experience.";
  }, [user]);

  const bannerCtaLabel = useMemo(() => {
    if (!user) return "Get Started";
    return "Complete Setup";
  }, [user]);

  const bannerCtaTarget = useMemo(() => {
    // We always send to /get-started — it will decide where to route next.
    return createPageUrl("GetStarted");
  }, []);

  const { data: featuredStudies = [], isLoading: loadingStudies } = useQuery({
    queryKey: ["featured-studies"],
    queryFn: () => base44.entities.ScriptureStudy.filter({ is_published: true }, "-created_date", 4),
    enabled: !!legacyUser,
  });

  const { data: featuredCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: () => base44.entities.Course.filter({ is_published: true, visibility: "public" }, "-enrollment_count", 4),
    enabled: !!legacyUser,
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Onboarding Banner: visible only when logged out OR profile not completed.
          Once logged in + profile completed => banner disappears entirely. */}
      {shouldShowGetStartedBanner ? (
        <div className="sticky top-0 z-40 border-b bg-gradient-to-r from-amber-50 via-white to-orange-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">{bannerTitle}</div>
              <div className="text-sm text-slate-600">{bannerBody}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="bg-amber-600 hover:bg-amber-700 gap-2"
                onClick={() => navigate(bannerCtaTarget)}
              >
                {bannerCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Secondary quick action for logged-in users */}
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Profile"))}
                >
                  View Profile
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <HeroSection user={legacyUser} />
      <FeatureCards />
      <DifficultyTracks />

      {/* Featured Studies */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-amber-600 font-medium text-sm tracking-wide uppercase mb-2 block">
                Scripture Studies
              </span>
              <h2 className="text-3xl font-serif font-bold text-slate-800">Popular Studies</h2>
            </div>
            <Link to={createPageUrl("Studies")}>
              <Button variant="ghost" className="text-amber-700 hover:text-amber-800 gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loadingStudies ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : featuredStudies.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredStudies.map((study: any, i: number) => (
                <motion.div
                  key={study.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <StudyCard study={study} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">No studies available yet. Check back soon!</div>
          )}
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-violet-600 font-medium text-sm tracking-wide uppercase mb-2 block">
                Church Courses
              </span>
              <h2 className="text-3xl font-serif font-bold text-slate-800">Featured Courses</h2>
            </div>
            <Link to={createPageUrl("Courses")}>
              <Button variant="ghost" className="text-violet-700 hover:text-violet-800 gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loadingCourses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCourses.map((course: any, i: number) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <CourseCard course={course} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">No courses available yet. Check back soon!</div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-6">
            Ready to Grow in Your Faith?
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Join believers who are diving deeper into scripture and building meaningful connections with their church community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={createPageUrl("Studies")}>
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 h-12 px-8">
                Start Your Journey
              </Button>
            </Link>
            <Link to={createPageUrl("Groups")}>
              <Button size="lg" variant="outline" className="h-12 px-8">
                Find a Group
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
