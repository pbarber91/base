// src/pages/courses.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, GraduationCap, ArrowRight, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function Courses() {
  const { user, supabase, loading } = useAuth();

  const myChurchIdsQ = useQuery({
    queryKey: ["my-church-ids-for-courses", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("church_members").select("church_id").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.church_id).filter(Boolean);
    },
    staleTime: 30_000,
  });

  const coursesQ = useQuery({
    queryKey: ["courses-visible", user?.id, myChurchIdsQ.data],
    enabled: !loading && (!!user?.id ? !!myChurchIdsQ.data : true),
    queryFn: async (): Promise<CourseRow[]> => {
      // 1) Always only published courses show in participant listing.
      // 2) Visibility logic:
      //    - is_public = true => anyone
      //    - is_public = false => only if church_id in my churches
      const churchIds = myChurchIdsQ.data ?? [];

      let query = supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_at,updated_at")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (!user) {
        // not logged in => only public courses
        query = query.eq("is_public", true);
      } else {
        // logged in => public OR church-only courses for their churches
        const orParts: string[] = ["is_public.eq.true"];
        if (churchIds.length > 0) {
          orParts.push(`and(is_public.eq.false,church_id.in.(${churchIds.join(",")}))`);
        }
        query = query.or(orParts.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 15_000,
  });

  const isBusy = loading || coursesQ.isLoading || myChurchIdsQ.isLoading;

  const courses = coursesQ.data ?? [];

  const { publicCourses, churchCourses } = useMemo(() => {
    const pub = courses.filter((c) => c.is_public);
    const ch = courses.filter((c) => !c.is_public);
    return { publicCourses: pub, churchCourses: ch };
  }, [courses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-violet-100 font-medium">Courses</span>
            </div>

            <h1 className="text-4xl font-serif font-bold mb-3">Learn together, on purpose</h1>
            <p className="text-lg text-violet-100 leading-relaxed">
              Courses are church-led learning paths with sessions and embedded content. Published courses appear here.
              Visibility controls whether a course is Public or Church-only.
            </p>

            <div className="mt-6 flex gap-3">
              <Link to={createPageUrl("AdminCourses")}>
                <Button className="bg-white text-violet-700 hover:bg-violet-50">Admin / Build Courses</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {isBusy && (
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading courses…
          </div>
        )}

        {/* Public */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Public courses</h2>
          </div>

          {publicCourses.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">No public courses yet.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link to={createPageUrl("CourseDetail") + `?id=${encodeURIComponent(c.id)}`}>
                    <GradientCard className="overflow-hidden hover:shadow-md transition-shadow">
                      {c.cover_image_url ? (
                        <div className="h-32 overflow-hidden">
                          <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                            <div className="text-sm text-slate-600 line-clamp-2 mt-1">{c.description || ""}</div>
                            <div className="text-xs text-slate-500 mt-2">Updated {formatWhen(c.updated_at)}</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 mt-0.5" />
                        </div>
                      </div>
                    </GradientCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Church-only */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Church-only courses</h2>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            These are published, but restricted to members of the offering church.
          </p>

          {!user ? (
            <GradientCard className="p-6 text-sm text-slate-600">
              Sign in to see church-only courses you have access to.
            </GradientCard>
          ) : churchCourses.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">No church-only courses available to you.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {churchCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link to={createPageUrl("CourseDetail") + `?id=${encodeURIComponent(c.id)}`}>
                    <GradientCard className="overflow-hidden hover:shadow-md transition-shadow">
                      {c.cover_image_url ? (
                        <div className="h-32 overflow-hidden">
                          <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                            <div className="text-sm text-slate-600 line-clamp-2 mt-1">{c.description || ""}</div>
                            <div className="text-xs text-slate-500 mt-2">Updated {formatWhen(c.updated_at)}</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 mt-0.5" />
                        </div>
                      </div>
                    </GradientCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {coursesQ.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(coursesQ.error as any)?.message ?? "Failed to load courses."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
