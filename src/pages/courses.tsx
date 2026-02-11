import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  is_published: boolean;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Courses() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();

  const membershipsQ = useQuery({
    queryKey: ["courses-church-memberships", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("church_members").select("church_id").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.church_id).filter(Boolean);
    },
    staleTime: 30_000,
  });

  const coursesQ = useQuery({
    queryKey: ["courses-list", user?.id, membershipsQ.data?.join(",")],
    enabled: !loading && (!!user?.id),
    queryFn: async (): Promise<CourseRow[]> => {
      const churchIds = membershipsQ.data ?? [];

      // Show:
      // - published public courses
      // - published church-only courses if you are a member of that church
      // (admins will also see drafts through AdminCourses)
      let query = supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by,created_at,updated_at")
        .eq("is_published", true)
        .order("updated_at", { ascending: false });

      if (churchIds.length > 0) {
        query = query.or(`is_public.eq.true,and(is_public.eq.false,church_id.in.(${churchIds.join(",")}))`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 10_000,
  });

  const isBusy = loading || membershipsQ.isLoading || coursesQ.isLoading;

  const courses = coursesQ.data ?? [];

  const grouped = useMemo(() => {
    const publicCourses = courses.filter((c) => c.is_public);
    const churchCourses = courses.filter((c) => !c.is_public);
    return { publicCourses, churchCourses };
  }, [courses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/get-started", { replace: true });
    return null;
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

            <h1 className="text-4xl font-serif font-bold mb-3">Grow with your church</h1>
            <p className="text-lg text-violet-100 leading-relaxed">
              Courses are structured, session-based learning experiences with videos, readings, and discussion.
            </p>
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
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Public Courses</h2>
              <p className="text-sm text-slate-600">Available to anyone.</p>
            </div>
          </div>

          {grouped.publicCourses.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">No public courses yet.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.publicCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link to={createPageUrl("CourseDetail") + `?id=${c.id}`} className="block">
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
                            <div className="text-sm text-slate-600 line-clamp-2 mt-1">{c.description || "—"}</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 mt-1" />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>Public</Badge>
                          {(c.tags ?? []).slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
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
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Your Church Courses</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Published courses visible only to members of your church.
          </p>

          {grouped.churchCourses.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">No church-only courses available to you yet.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.churchCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link to={createPageUrl("CourseDetail") + `?id=${c.id}`} className="block">
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
                            <div className="text-sm text-slate-600 line-clamp-2 mt-1">{c.description || "—"}</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 mt-1" />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">Church-only</Badge>
                          {(c.tags ?? []).slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </GradientCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {(coursesQ.isError || membershipsQ.isError) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(coursesQ.error as any)?.message || (membershipsQ.error as any)?.message || "Failed to load courses."}
          </div>
        )}
      </div>
    </div>
  );
}
