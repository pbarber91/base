// src/pages/CourseDetail.tsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GradientCard from "@/components/ui/GradientCard";
import { createPageUrl } from "@/utils";
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Lock,
  Check,
  Play,
  Loader2,
  Globe,
  Video,
  FileText,
  Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  course_id: string;
  user_id: string;
  role: string; // participant | leader
  enrolled_at: string;
};

type ProgressRow = {
  course_id: string;
  session_id: string;
  user_id: string;
  completed_at: string | null;
};

function isLikelyDirectVideo(url: string) {
  const u = (url || "").toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".ogg");
}

// Very small embed helper (supports youtube + vimeo)
function getEmbedUrl(url: string) {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

export default function CourseDetail() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("id") || "";

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const canUse = !loading && !!courseId;

  const myChurchIdsQ = useQuery({
    queryKey: ["my-church-ids-for-course-detail", user?.id],
    enabled: !!user?.id && canUse,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("church_members").select("church_id").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.church_id).filter(Boolean);
    },
    staleTime: 30_000,
  });

  const courseQ = useQuery({
    queryKey: ["course", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseRow | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by,created_at,updated_at")
        .eq("id", courseId)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const sessionsQ = useQuery({
    queryKey: ["course-sessions", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseSessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index,estimated_minutes,blocks")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, blocks: Array.isArray(r.blocks) ? r.blocks : [] })) as CourseSessionRow[];
    },
    staleTime: 10_000,
  });

  const enrollmentQ = useQuery({
    queryKey: ["course-enrollment", courseId, user?.id],
    enabled: !!user?.id && canUse,
    queryFn: async (): Promise<EnrollmentRow | null> => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id,user_id,role,enrolled_at")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const progressQ = useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    enabled: !!user?.id && canUse,
    queryFn: async (): Promise<ProgressRow[]> => {
      const { data, error } = await supabase
        .from("course_session_progress")
        .select("course_id,session_id,user_id,completed_at")
        .eq("course_id", courseId)
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
    staleTime: 10_000,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated.");
      const { error } = await supabase.from("course_enrollments").insert({
        course_id: courseId,
        user_id: user.id,
        role: "participant",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-enrollment", courseId, user?.id] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("Not authenticated.");
      const { error } = await supabase
        .from("course_session_progress")
        .upsert(
          {
            course_id: courseId,
            session_id: sessionId,
            user_id: user.id,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "course_id,session_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course-progress", courseId, user?.id] });
    },
  });

  const isBusy =
    loading ||
    courseQ.isLoading ||
    sessionsQ.isLoading ||
    (user ? enrollmentQ.isLoading || progressQ.isLoading || myChurchIdsQ.isLoading : false);

  if (loading || isBusy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  const course = courseQ.data;
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

  // Must be published to appear as an accessible course (participant side)
  if (!course.is_published) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">This course isn’t published</h2>
          <p className="text-sm text-slate-600 mb-6">Ask a course admin to publish it when it’s ready.</p>
          <div className="flex justify-end">
            <Link to={createPageUrl("Courses")}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </GradientCard>
      </div>
    );
  }

  // Visibility gate
  if (!course.is_public) {
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <GradientCard className="p-8 max-w-xl w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Church-only course</h2>
            <p className="text-sm text-slate-600 mb-6">Sign in to verify your church membership.</p>
            <div className="flex justify-end">
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => navigate("/get-started")}>
                Sign in
              </Button>
            </div>
          </GradientCard>
        </div>
      );
    }

    const myChurchIds = myChurchIdsQ.data ?? [];
    if (course.church_id && !myChurchIds.includes(course.church_id)) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <GradientCard className="p-8 max-w-xl w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-2">No access</h2>
            <p className="text-sm text-slate-600 mb-6">
              This course is restricted to members of the offering church.
            </p>
            <div className="flex justify-end">
              <Link to={createPageUrl("Courses")}>
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </GradientCard>
        </div>
      );
    }
  }

  const sessions = sessionsQ.data ?? [];

  const completedSet = useMemo(() => {
    const rows = progressQ.data ?? [];
    return new Set(rows.filter((r) => !!r.completed_at).map((r) => r.session_id));
  }, [progressQ.data]);

  const completedCount = completedSet.size;
  const progressPercent = sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0;

  const enrollment = enrollmentQ.data;
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const canStartSession = !!enrollment;

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
                <Badge className="bg-white/20 text-white border-0 gap-1">
                  {course.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {course.is_public ? "Public" : "Church-only"}
                </Badge>
                {course.tags?.slice(0, 4).map((t) => (
                  <Badge key={t} variant="outline" className="border-white/30 text-white">
                    {t}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl lg:text-4xl font-serif font-bold mb-4">{course.title}</h1>
              <p className="text-violet-100 text-lg mb-6 leading-relaxed">{course.description || ""}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-2 text-violet-200">
                  <Users className="h-4 w-4" />
                  {enrollment ? "Enrolled" : "Not enrolled"}
                </span>
                <span className="flex items-center gap-2 text-violet-200">
                  <Clock className="h-4 w-4" />
                  {sessions.length} sessions
                </span>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="lg:w-80">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                {enrollment ? (
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-violet-600 mb-1">{progressPercent}%</div>
                      <div className="text-slate-500 text-sm">Complete</div>
                    </div>
                    <Progress value={progressPercent} className="h-2 mb-4" />
                    <p className="text-sm text-slate-500 mb-4 text-center">
                      {completedCount} of {sessions.length} sessions completed
                    </p>
                    <Button
                      onClick={() => {
                        const next = sessions.find((s) => !completedSet.has(s.id));
                        if (next) setActiveSessionId(next.id);
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Continue
                    </Button>
                  </div>
                ) : user ? (
                  <div className="text-center">
                    <GraduationCap className="h-12 w-12 text-violet-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Ready to start?</h3>
                    <p className="text-sm text-slate-500 mb-4">Enroll to track your progress and unlock sessions.</p>
                    <Button
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Enroll
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="font-semibold text-slate-800 mb-2">Sign in to enroll</h3>
                    <p className="text-sm text-slate-500 mb-4">Create an account to track your progress.</p>
                    <Button onClick={() => navigate("/get-started")} className="w-full bg-violet-600 hover:bg-violet-700">
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
          {sessions.map((s, i) => {
            const isCompleted = completedSet.has(s.id);
            const isLocked = !canStartSession && i > 0;
            const isActive = s.id === activeSessionId;

            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GradientCard
                  variant={isActive ? "purple" : "cool"}
                  hover={!isLocked}
                  className={`cursor-pointer ${isLocked ? "opacity-60" : ""}`}
                  onClick={() => {
                    if (isLocked) return;
                    if (!canStartSession) return; // must enroll
                    setActiveSessionId(isActive ? null : s.id);
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isLocked
                            ? "bg-slate-200 text-slate-400"
                            : "bg-violet-100 text-violet-600"
                        }`}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : <span className="font-semibold">{i + 1}</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800">{s.title}</h3>
                        {s.description ? <p className="text-sm text-slate-500 line-clamp-1">{s.description}</p> : null}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {s.estimated_minutes ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {s.estimated_minutes} min
                          </span>
                        ) : null}
                        <ChevronRight className={`h-5 w-5 transition-transform ${isActive ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded session content */}
                    <AnimatePresence>
                      {isActive && activeSession ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            {(Array.isArray(activeSession.blocks) ? activeSession.blocks : []).map((b: any, idx: number) => {
                              const type = (b?.type || "text").toString();

                              // Video
                              if (type === "video") {
                                const url = (b?.url || "").toString().trim();
                                const title = (b?.title || "").toString().trim();
                                const embed = url ? getEmbedUrl(url) : null;

                                return (
                                  <div key={idx} className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                      <Video className="h-4 w-4 text-violet-600" />
                                      {title || "Video"}
                                    </div>

                                    {embed ? (
                                      <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
                                        <iframe
                                          src={embed}
                                          title={title || "Embedded video"}
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                    ) : url && isLikelyDirectVideo(url) ? (
                                      <video className="w-full rounded-xl border bg-black" controls src={url} />
                                    ) : url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-violet-700 underline"
                                      >
                                        Open video link
                                      </a>
                                    ) : (
                                      <div className="text-sm text-slate-500">No video URL provided.</div>
                                    )}
                                  </div>
                                );
                              }

                              // Link
                              if (type === "link") {
                                const url = (b?.url || "").toString().trim();
                                const title = (b?.title || "").toString().trim();
                                const description = (b?.description || "").toString().trim();

                                return (
                                  <GradientCard key={idx} variant="warm" className="p-4">
                                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                                      <Link2 className="h-4 w-4 text-violet-600" />
                                      {title || "Link"}
                                    </div>
                                    {description ? <div className="text-sm text-slate-600 mt-1">{description}</div> : null}
                                    {url ? (
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-700 underline mt-2 inline-block">
                                        {url}
                                      </a>
                                    ) : (
                                      <div className="text-sm text-slate-500 mt-2">No URL provided.</div>
                                    )}
                                  </GradientCard>
                                );
                              }

                              // Text (default)
                              return (
                                <GradientCard key={idx} variant="cool" className="p-4">
                                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <FileText className="h-4 w-4 text-violet-600" />
                                    {(b?.title || "Notes").toString()}
                                  </div>
                                  <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{(b?.body || "").toString()}</div>
                                </GradientCard>
                              );
                            })}

                            <div className="flex justify-end gap-3 pt-2">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSessionId(null);
                                }}
                              >
                                Close
                              </Button>

                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeSessionMutation.mutate(activeSession.id);
                                }}
                                disabled={completeSessionMutation.isPending || completedSet.has(activeSession.id)}
                              >
                                {completeSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {completedSet.has(activeSession.id) ? "Completed" : "Mark complete"}
                              </Button>
                            </div>

                            {completeSessionMutation.isError ? (
                              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                                {(completeSessionMutation.error as any)?.message ?? "Failed to update progress."}
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
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
