import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GradientCard from "@/components/ui/GradientCard";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Play,
  Loader2,
  Users,
  Calendar,
  Check,
  Lock,
  MessageSquare,
  Video,
  FileText,
  ExternalLink,
  Crown,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
};

type ProfileRow = {
  id: string;
  role: string;
  display_name: string | null;
  email: string | null;
};

type ChurchMemberRow = {
  church_id: string;
  role: string;
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  role: "participant" | "leader" | string;
  created_at: string;
};

type SessionRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

type BlockRow = {
  id: string;
  session_id: string;
  type: string;
  title: string | null;
  content: string | null;
  url: string | null;
  order_index: number;
};

type QuestionRow = {
  id: string;
  course_id: string;
  session_id: string | null;
  asked_by: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  created_at: string;
  updated_at: string;
  asker?: { display_name: string | null; email: string | null } | null;
  answerer?: { display_name: string | null; email: string | null } | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeUrl(u: string) {
  try {
    return new URL(u).toString();
  } catch {
    return u;
  }
}

function getEmbedUrl(url: string) {
  const u = normalizeUrl(url);
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      // /embed/ID or /shorts/ID
      const parts = parsed.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx >= 0 && parts[idx + 1]) return `https://www.youtube-nocookie.com/embed/${parts[idx + 1]}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
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
  const [questionText, setQuestionText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const canUse = !!user?.id && !loading && !!courseId;

  const profileQ = useQuery({
    queryKey: ["coursedetail-profile", user?.id],
    enabled: canUse,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase.from("profiles").select("id,role,display_name,email").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 30_000,
  });

  const courseQ = useQuery({
    queryKey: ["coursedetail-course", courseId],
    enabled: canUse,
    queryFn: async (): Promise<CourseRow | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,tags,cover_image_url,is_published,is_public,created_by")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const churchMembershipQ = useQuery({
    queryKey: ["coursedetail-church-membership", user?.id, courseQ.data?.church_id],
    enabled: canUse && !!courseQ.data?.church_id,
    queryFn: async (): Promise<ChurchMemberRow | null> => {
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id,role")
        .eq("user_id", user!.id)
        .eq("church_id", courseQ.data!.church_id!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 30_000,
  });

  const sessionsQ = useQuery({
    queryKey: ["coursedetail-sessions", courseId],
    enabled: canUse,
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("course_sessions")
        .select("id,course_id,title,description,order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 10_000,
  });

  React.useEffect(() => {
    if (!activeSessionId && (sessionsQ.data?.length ?? 0) > 0) {
      setActiveSessionId(sessionsQ.data![0].id);
    }
  }, [activeSessionId, sessionsQ.data]);

  const activeSession = useMemo(() => {
    const list = sessionsQ.data ?? [];
    return list.find((s) => s.id === activeSessionId) ?? null;
  }, [sessionsQ.data, activeSessionId]);

  const blocksQ = useQuery({
    queryKey: ["coursedetail-blocks", activeSessionId],
    enabled: canUse && !!activeSessionId,
    queryFn: async (): Promise<BlockRow[]> => {
      const { data, error } = await supabase
        .from("course_session_blocks")
        .select("id,session_id,type,title,content,url,order_index")
        .eq("session_id", activeSessionId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 5_000,
  });

  const enrollmentQ = useQuery({
    queryKey: ["coursedetail-enrollment", courseId, user?.id],
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
    staleTime: 5_000,
  });

  const isGlobalAdmin = (profileQ.data?.role || "").toLowerCase() === "admin";
  const isChurchAdmin = (churchMembershipQ.data?.role || "").toLowerCase() === "admin";
  const isCourseLeader = (enrollmentQ.data?.role || "").toLowerCase() === "leader";
  const canSeeAllPrivateQuestions = isGlobalAdmin || isChurchAdmin || isCourseLeader;

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, user_id: user.id, role: "participant" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coursedetail-enrollment"] }),
  });

  // Minimal “progress” placeholder (V1): session completion can be added next.
  const progressPercent = enrollmentQ.data ? 10 : 0;

  // Private questions
  const questionsQ = useQuery({
    queryKey: ["coursedetail-questions", courseId, user?.id, canSeeAllPrivateQuestions],
    enabled: canUse && !!enrollmentQ.data, // only show if enrolled
    queryFn: async (): Promise<QuestionRow[]> => {
      // RLS handles visibility. Leaders/admins will see all; participants see their own.
      const { data, error } = await supabase
        .from("course_questions")
        .select("id,course_id,session_id,asked_by,question,answer,answered_by,created_at,updated_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 2_000,
  });

  const askQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const q = questionText.trim();
      if (!q) throw new Error("Please write a question.");
      const { error } = await supabase.from("course_questions").insert({
        course_id: courseId,
        session_id: activeSessionId ?? null,
        asked_by: user.id,
        question: q,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestionText("");
      queryClient.invalidateQueries({ queryKey: ["coursedetail-questions"] });
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (args: { questionId: string; answer: string }) => {
      if (!user) throw new Error("Not authenticated");
      const a = args.answer.trim();
      if (!a) throw new Error("Answer cannot be empty.");
      const { error } = await supabase
        .from("course_questions")
        .update({ answer: a, answered_by: user.id })
        .eq("id", args.questionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coursedetail-questions"] }),
  });

  if (loading || courseQ.isLoading || sessionsQ.isLoading || profileQ.isLoading) {
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

  const course = courseQ.data;
  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Course not found</h2>
          <Link to={createPageUrl("Courses")}>
            <Button>Back to Courses</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

  const sessions = sessionsQ.data ?? [];
  const blocks = blocksQ.data ?? [];
  const isEnrolled = !!enrollmentQ.data;

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
                <Badge className="bg-white/20 text-white border-0">{course.is_public ? "Public" : "Church-only"}</Badge>
                <Badge className="bg-white/20 text-white border-0">{course.is_published ? "Published" : "Draft"}</Badge>
                {isGlobalAdmin ? (
                  <Badge variant="outline" className="border-violet-300 text-white inline-flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Global Admin
                  </Badge>
                ) : isChurchAdmin ? (
                  <Badge variant="outline" className="border-violet-300 text-white inline-flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Church Admin
                  </Badge>
                ) : isCourseLeader ? (
                  <Badge variant="outline" className="border-violet-300 text-white inline-flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Course Leader
                  </Badge>
                ) : null}
              </div>

              <h1 className="text-3xl lg:text-4xl font-serif font-bold mb-3">{course.title}</h1>
              <p className="text-violet-100 text-lg mb-6 leading-relaxed">{course.description || ""}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-2 text-violet-200">
                  <Calendar className="h-4 w-4" />
                  {sessions.length} sessions
                </span>
                <span className="flex items-center gap-2 text-violet-200">
                  <Users className="h-4 w-4" />
                  {isEnrolled ? "Enrolled" : "Not enrolled"}
                </span>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="lg:w-80">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                {isEnrolled ? (
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-violet-600 mb-1">{progressPercent}%</div>
                      <div className="text-slate-500 text-sm">Progress (V1)</div>
                    </div>
                    <Progress value={progressPercent} className="h-2 mb-4" />
                    <Button
                      onClick={() => {
                        if (sessions.length > 0) setActiveSessionId(sessions[0].id);
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Continue
                    </Button>

                    {(isChurchAdmin || isGlobalAdmin) && (
                      <div className="mt-3">
                        <Link to={createPageUrl("CourseBuilder") + `?id=${course.id}`}>
                          <Button variant="outline" className="w-full">
                            Admin: Edit Sessions
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Lock className="h-12 w-12 text-violet-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Enroll to participate</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      Enrollment enables progress tracking and private questions to leaders.
                    </p>
                    <Button
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Enroll
                    </Button>
                  </div>
                )}

                {enrollMutation.isError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {(enrollMutation.error as any)?.message ?? "Failed to enroll."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[320px,1fr] gap-6">
        {/* Sessions nav */}
        <div>
          <GradientCard className="p-5">
            <div className="font-semibold text-slate-900 mb-3">Sessions</div>
            {sessions.length === 0 ? (
              <div className="text-sm text-slate-600">No sessions yet.</div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    className={cx(
                      "w-full text-left rounded-xl border p-3 transition",
                      activeSessionId === s.id
                        ? "border-violet-400 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                    onClick={() => setActiveSessionId(s.id)}
                    type="button"
                    disabled={!isEnrolled}
                    aria-disabled={!isEnrolled}
                  >
                    <div className="font-medium text-slate-900">{s.title}</div>
                    {s.description ? <div className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</div> : null}
                    {!isEnrolled ? <div className="text-xs text-slate-400 mt-2">Enroll to open</div> : null}
                  </button>
                ))}
              </div>
            )}
          </GradientCard>
        </div>

        {/* Session content */}
        <div className="space-y-6">
          {!isEnrolled ? (
            <GradientCard className="p-6">
              <div className="font-semibold text-slate-900 mb-1">Enroll to start</div>
              <div className="text-sm text-slate-600">
                Once enrolled, you’ll be able to view sessions and ask private questions to leaders.
              </div>
            </GradientCard>
          ) : (
            <>
              <GradientCard className="p-6">
                <div className="font-semibold text-slate-900 mb-1">
                  {activeSession ? activeSession.title : "Session"}
                </div>
                <div className="text-sm text-slate-600">
                  {activeSession?.description || "Work through the blocks below."}
                </div>
              </GradientCard>

              {blocksQ.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
                </div>
              ) : blocks.length === 0 ? (
                <GradientCard className="p-6 text-sm text-slate-600">No blocks in this session yet.</GradientCard>
              ) : (
                <div className="space-y-4">
                  {blocks.map((b, idx) => {
                    const isVideo = (b.type || "").toLowerCase() === "video";
                    const embed = b.url ? getEmbedUrl(b.url) : null;

                    return (
                      <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                        <GradientCard className="p-6">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              {isVideo ? (
                                <Video className="h-5 w-5 text-slate-700" />
                              ) : (
                                <FileText className="h-5 w-5 text-slate-700" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500 capitalize">{b.type}</div>
                              <div className="font-semibold text-slate-900">{b.title || "Block"}</div>
                              {b.content ? <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{b.content}</div> : null}

                              {isVideo && b.url ? (
                                <div className="mt-4">
                                  {embed ? (
                                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
                                      <iframe
                                        src={embed}
                                        title={b.title || "Video"}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <a
                                      href={b.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-violet-700 hover:text-violet-800 mt-3"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Open video link
                                    </a>
                                  )}
                                </div>
                              ) : b.url ? (
                                <div className="mt-3">
                                  <a
                                    href={b.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-violet-700 hover:text-violet-800"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Open resource
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </GradientCard>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Private Questions (V1) */}
              <GradientCard className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-5 w-5 text-slate-700" />
                  <div className="font-semibold text-slate-900">Private Questions (V1)</div>
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  Ask a private question. Course leaders and church admins can respond.
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Type your question here…"
                    className="min-h-[90px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => askQuestionMutation.mutate()}
                      disabled={askQuestionMutation.isPending || questionText.trim().length === 0}
                      className="bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {askQuestionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Submit Question
                    </Button>
                  </div>

                  {askQuestionMutation.isError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      {(askQuestionMutation.error as any)?.message ?? "Failed to submit question."}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="font-semibold text-slate-900 mb-2">
                    {canSeeAllPrivateQuestions ? "All Questions" : "Your Questions"}
                  </div>

                  {questionsQ.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    </div>
                  ) : (questionsQ.data?.length ?? 0) === 0 ? (
                    <div className="text-sm text-slate-600">No questions yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {questionsQ.data!.map((q) => {
                        const hasAnswer = !!q.answer?.trim();
                        const draft = answerDrafts[q.id] ?? q.answer ?? "";
                        return (
                          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm font-medium text-slate-900">Q: {q.question}</div>
                            <div className="mt-2">
                              {hasAnswer ? (
                                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                  <span className="font-medium">A:</span> {q.answer}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">No answer yet.</div>
                              )}
                            </div>

                            {canSeeAllPrivateQuestions ? (
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                <div className="text-xs text-slate-500">
                                  Leader/Admin response:
                                </div>
                                <Textarea
                                  value={draft}
                                  onChange={(e) => setAnswerDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                                  placeholder="Write an answer…"
                                  className="min-h-[80px]"
                                />
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => answerMutation.mutate({ questionId: q.id, answer: draft })}
                                    disabled={answerMutation.isPending || draft.trim().length === 0}
                                    className="gap-2"
                                  >
                                    {answerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Save Answer
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(questionsQ.isError || answerMutation.isError) && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      {(questionsQ.error as any)?.message || (answerMutation.error as any)?.message || "Failed to load questions."}
                    </div>
                  )}
                </div>
              </GradientCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
