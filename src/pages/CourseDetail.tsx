// src/pages/CourseDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, ChevronLeft, Clock, Check, Lock, Video, BookOpen, MessageSquare, ExternalLink, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string;
};

type CourseSessionRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_minutes: number | null;
  blocks: any[];
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  role: string | null; // 'participant' | 'leader' (course-specific)
  created_at?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseVideoEmbed(urlRaw: string): { kind: "youtube" | "vimeo" | "other"; embedUrl?: string } {
  const url = (urlRaw || "").trim();
  if (!url) return { kind: "other" };

  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${v}` };
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "").trim();
      if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    // ignore
  }

  return { kind: "other" };
}

export default function CourseDetail() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id") || "";

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const canUse = !!user?.id && !!courseId && !loading;

  const courseQ = useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId && !loading,
    queryFn: async (): Promise<CourseRow> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,created_by")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data as CourseRow;
    },
    staleTime: 15_000,
  });

  const sessionsQ = useQuery({
    queryKey: ["course-sessions", courseId],
    enabled: !!courseId && !loading,
    queryFn: async (): Promise<CourseSessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index,estimated_minutes,blocks")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as any[];
      return rows.map((r) => ({
        ...r,
        blocks: Array.isArray(r.blocks) ? r.blocks : [],
      })) as CourseSessionRow[];
    },
    staleTime: 10_000,
  });

  const enrollmentQ = useQuery({
    queryKey: ["course-enrollment", courseId, user?.id],
    enabled: canUse,
    queryFn: async (): Promise<EnrollmentRow | null> => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("id,course_id,user_id,role,created_at")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 10_000,
  });

  // Determine church admin (NOTE: your church_role enum does NOT include leader; only check admin)
  const churchAdminQ = useQuery({
    queryKey: ["course-church-admin", courseId, courseQ.data?.church_id, user?.id],
    enabled: canUse && !!courseQ.data?.church_id,
    queryFn: async (): Promise<boolean> => {
      const churchId = courseQ.data!.church_id!;
      const { data, error } = await supabase
        .from("church_members")
        .select("role")
        .eq("church_id", churchId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.role ?? "").toString() === "admin";
    },
    staleTime: 15_000,
  });

  const course = courseQ.data;
  const sessions = sessionsQ.data ?? [];
  const enrollment = enrollmentQ.data;

  const isCreator = !!course && !!user && course.created_by === user.id;
  const isChurchAdmin = !!churchAdminQ.data;
  const isCourseLeader = (enrollment?.role ?? "").toString() === "leader";

  const hasAccess = !!enrollment || isCreator || isChurchAdmin || isCourseLeader;

  // Auto-enroll creator as leader (so they never get blocked / never see enroll wall)
  const autoEnrollCreatorMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (!course) return;

      if (course.created_by !== user.id) return;
      if (enrollment) return;

      // Upsert to avoid unique constraint errors
      const { error } = await supabase
        .from("course_enrollments")
        .upsert(
          {
            course_id: course.id,
            user_id: user.id,
            role: "leader",
          },
          { onConflict: "course_id,user_id" }
        );

      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["course-enrollment", courseId, user?.id] });
    },
  });

  useEffect(() => {
    if (!course || !user) return;
    if (enrollmentQ.isLoading) return;
    if (course.created_by === user.id && !enrollment) {
      autoEnrollCreatorMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, user?.id, enrollmentQ.isLoading]);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated.");
      if (!courseId) throw new Error("Missing course id.");

      // Upsert avoids duplicate key if user clicks twice
      const { error } = await supabase
        .from("course_enrollments")
        .upsert(
          {
            course_id: courseId,
            user_id: user.id,
            role: "participant",
          },
          { onConflict: "course_id,user_id" }
        );

      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["course-enrollment", courseId, user?.id] });
    },
  });

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) ?? null, [sessions, activeSessionId]);

  if (loading || courseQ.isLoading || sessionsQ.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Course not found</h2>
          <div className="flex justify-end">
            <Link to={createPageUrl("Courses")}>
              <Button variant="outline">Back to Courses</Button>
            </Link>
          </div>
        </GradientCard>
      </div>
    );
  }

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
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {course.is_published ? <Badge className="bg-white/20 text-white border-0">Published</Badge> : <Badge className="bg-white/20 text-white border-0">Draft</Badge>}
                {isCreator ? <Badge className="bg-white/20 text-white border-0">Creator</Badge> : null}
                {isChurchAdmin ? <Badge className="bg-white/20 text-white border-0">Church Admin</Badge> : null}
                {isCourseLeader ? <Badge className="bg-white/20 text-white border-0">Leader</Badge> : null}
              </div>

              <h1 className="text-3xl lg:text-4xl font-serif font-bold mb-3">{course.title}</h1>
              {course.description ? <p className="text-violet-100 text-lg leading-relaxed mb-4">{course.description}</p> : null}

              <div className="flex items-center gap-4 text-sm text-violet-100/90">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {sessions.length} sessions
                </span>
              </div>

              {Array.isArray(course.tags) && course.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.slice(0, 10).map((t, i) => (
                    <Badge key={i} className="bg-white/10 text-white border-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Enrollment card */}
            <div className="lg:w-80">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                {hasAccess ? (
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">You have access</div>
                    <div className="text-sm text-slate-600 mb-4">
                      {isCreator || isChurchAdmin || isCourseLeader ? "You can view and facilitate this course." : "You’re enrolled as a participant."}
                    </div>

                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      onClick={() => {
                        const first = sessions[0];
                        if (first) setActiveSessionId(first.id);
                      }}
                      disabled={sessions.length === 0}
                    >
                      Start / Continue
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="font-semibold text-slate-900 mb-2">Enroll to start</div>
                    <p className="text-sm text-slate-600 mb-4">Enrollment unlocks the sessions and progress tracking.</p>

                    <Button
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Enroll
                    </Button>

                    {enrollMutation.isError ? (
                      <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                        {(enrollMutation.error as any)?.message ?? "Failed to enroll."}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Course Sessions</h2>

        {sessions.length === 0 ? (
          <GradientCard className="p-7 text-sm text-slate-600">No sessions yet.</GradientCard>
        ) : (
          <div className="space-y-4">
            {sessions.map((s, i) => {
              const isActive = s.id === activeSessionId;
              const locked = !hasAccess;

              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <GradientCard
                    variant={isActive ? "purple" : "cool"}
                    className={cx("cursor-pointer", locked && "opacity-70")}
                    onClick={() => {
                      if (locked) return;
                      setActiveSessionId(isActive ? null : s.id);
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cx(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              locked ? "bg-slate-200 text-slate-400" : "bg-violet-100 text-violet-700"
                            )}
                          >
                            {locked ? <Lock className="h-4 w-4" /> : <span className="font-semibold">{i + 1}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{s.title}</div>
                            {s.description ? <div className="text-sm text-slate-600 line-clamp-1">{s.description}</div> : null}
                          </div>
                        </div>

                        <div className="text-sm text-slate-600 flex items-center gap-4">
                          {s.estimated_minutes ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {s.estimated_minutes} min
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                              {(Array.isArray(s.blocks) ? s.blocks : []).map((b: any, bi: number) => {
                                const type = (b?.type ?? "").toString();

                                if (type === "text") {
                                  return (
                                    <div key={bi} className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                      {b.content}
                                    </div>
                                  );
                                }

                                if (type === "video") {
                                  const url = (b.url || b.video_url || "").toString();
                                  const parsed = parseVideoEmbed(url);

                                  return (
                                    <div key={bi} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100">
                                        <Video className="h-4 w-4 text-violet-600" />
                                        <div className="font-semibold text-slate-900 text-sm">Video</div>
                                      </div>

                                      {parsed.embedUrl ? (
                                        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                                          <iframe
                                            src={parsed.embedUrl}
                                            title="Video"
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                          />
                                        </div>
                                      ) : (
                                        <div className="p-4">
                                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-violet-700 hover:underline">
                                            <ExternalLink className="h-4 w-4" />
                                            Open video
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (type === "link") {
                                  const url = (b.url || "").toString();
                                  const title = (b.title || "Open link").toString();
                                  return (
                                    <a
                                      key={bi}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-shadow"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-900">{title}</div>
                                        <div className="text-xs text-slate-500 truncate">{url}</div>
                                      </div>
                                      <ExternalLink className="h-4 w-4 text-slate-400" />
                                    </a>
                                  );
                                }

                                if (type === "scripture") {
                                  return (
                                    <div key={bi} className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                                      <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-2">
                                        <BookOpen className="h-4 w-4" />
                                        {b.scripture_ref || "Scripture"}
                                      </div>
                                      {b.content ? <div className="text-slate-700 italic whitespace-pre-wrap">{b.content}</div> : null}
                                    </div>
                                  );
                                }

                                if (type === "quote") {
                                  return (
                                    <div key={bi} className="rounded-2xl border border-slate-200 bg-white p-4">
                                      <div className="text-slate-700 italic whitespace-pre-wrap">“{b.content}”</div>
                                      {b.attribution ? <div className="text-sm text-slate-500 mt-2">— {b.attribution}</div> : null}
                                    </div>
                                  );
                                }

                                if (type === "discussion_question") {
                                  return (
                                    <div key={bi} className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                                      <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold mb-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Discussion Question
                                      </div>
                                      <div className="text-slate-700">{b.content}</div>
                                    </div>
                                  );
                                }

                                // fallback
                                return (
                                  <div key={bi} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                    Unsupported block type: <code className="text-slate-900">{type || "unknown"}</code>
                                  </div>
                                );
                              })}
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
        )}

        {(courseQ.isError || sessionsQ.isError || enrollmentQ.isError || churchAdminQ.isError) && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {(courseQ.error as any)?.message ||
              (sessionsQ.error as any)?.message ||
              (enrollmentQ.error as any)?.message ||
              (churchAdminQ.error as any)?.message ||
              "Failed to load course."}
          </div>
        )}
      </div>
    </div>
  );
}
