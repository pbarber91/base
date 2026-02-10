// src/pages/CourseDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import EmptyState from "@/components/shared/EmptyState";
import GradientCard from "@/components/ui/GradientCard";
import {
  GraduationCap,
  Clock,
  Users,
  ChevronLeft,
  Play,
  CheckCircle,
  Lock,
  ExternalLink,
  Loader2,
  BookOpen,
  MessageCircle,
  FileText,
  Video,
  ListChecks,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

type VideoEmbed =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "file"; src: string }
  | { kind: "unknown"; href: string };

function safeUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isVideoFile(url: string) {
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
}

function toYouTubeEmbed(href: string): string | null {
  const safe = safeUrl(href);
  if (!safe) return null;

  try {
    const url = new URL(safe);
    const host = url.hostname.replace(/^www\./, "");

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (!id) return null;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        id
      )}?rel=0&modestbranding=1`;
    }

    // youtube.com/watch?v=<id>
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        if (!id) return null;
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          id
        )}?rel=0&modestbranding=1`;
      }

      // /embed/<id>
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          parts[1]
        )}?rel=0&modestbranding=1`;
      }

      // /shorts/<id>
      if (parts[0] === "shorts" && parts[1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          parts[1]
        )}?rel=0&modestbranding=1`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function toVimeoEmbed(href: string): string | null {
  const safe = safeUrl(href);
  if (!safe) return null;

  try {
    const url = new URL(safe);
    const host = url.hostname.replace(/^www\./, "");

    // vimeo.com/<id>
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (!id) return null;
      return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    }

    // player.vimeo.com/video/<id>
    if (host === "player.vimeo.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("video");
      const id = idx >= 0 ? parts[idx + 1] : null;
      if (!id) return null;
      return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    }

    return null;
  } catch {
    return null;
  }
}

function getVideoEmbed(url: string): VideoEmbed {
  const safe = safeUrl(url);
  if (!safe) return { kind: "unknown", href: url };

  if (isVideoFile(safe)) return { kind: "file", src: safe };

  const yt = toYouTubeEmbed(safe);
  if (yt) return { kind: "youtube", embedUrl: yt };

  const vm = toVimeoEmbed(safe);
  if (vm) return { kind: "vimeo", embedUrl: vm };

  return { kind: "unknown", href: safe };
}

function VideoBlock({ url, title }: { url: string; title?: string }) {
  const embed = useMemo(() => getVideoEmbed(url), [url]);

  // Responsive 16:9 container (no Tailwind plugin assumptions)
  const Frame = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );

  if (embed.kind === "file") {
    return (
      <div className="space-y-2">
        <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
          <video
            controls
            playsInline
            preload="metadata"
            src={embed.src}
            className="w-full h-auto"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 truncate">
            {title || "Video"}
          </p>
          <a
            href={embed.src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
          >
            Open <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  if (embed.kind === "youtube" || embed.kind === "vimeo") {
    return (
      <div className="space-y-2">
        <Frame>
          <iframe
            src={embed.embedUrl}
            title={title || "Embedded video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </Frame>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 truncate">
            {title || "Video"}
          </p>
          <a
            href={safeUrl(url) || url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
          >
            Open <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // Unknown provider: keep your existing link behavior
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{title || "Video"}</p>
          <p className="text-sm text-slate-600 truncate">{url}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            Watch Video <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("id");

  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth
      .me()
      .then(setUser)
      .catch(() => {
        setUser(null);
        window.location.href = createPageUrl("GetStarted");
      });
  }, []);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () =>
      base44.entities.Course.filter({ id: courseId }, null, 1).then((r: any[]) => r[0]),
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["course-enrollment", courseId, user?.email],
    queryFn: () =>
      base44.entities.CourseEnrollment.filter(
        { course_id: courseId, user_email: user?.email },
        null,
        1
      ).then((r: any[]) => r[0]),
    enabled: !!courseId && !!user?.email,
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      base44.entities.CourseEnrollment.create({
        user_email: user.email,
        course_id: courseId,
        progress_percent: 0,
        completed_sessions: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["course"] });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: (sessionIndex: number) => {
      const completed = enrollment?.completed_sessions || [];
      const newCompleted = completed.includes(sessionIndex)
        ? completed.filter((i: number) => i !== sessionIndex)
        : [...completed, sessionIndex];

      const totalSessions = course?.sessions?.length || 1;
      const progressPercent = Math.round((newCompleted.length / totalSessions) * 100);

      return base44.entities.CourseEnrollment.update(enrollment.id, {
        completed_sessions: newCompleted,
        progress_percent: progressPercent,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-enrollment"] }),
  });

  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState
          icon={GraduationCap}
          title="Course not found"
          description="This course may have been removed or is no longer available."
          action={() => (window.location.href = createPageUrl("Courses"))}
          actionLabel="Back to Courses"
        />
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const completedSessions = enrollment?.completed_sessions || [];
  const progressPercent = enrollment?.progress_percent || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link
            to={createPageUrl("Courses")}
            className="inline-flex items-center gap-2 text-violet-100 hover:text-white mb-6 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Courses
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-white/20 border-white/30 text-white">{course.category}</Badge>
                <Badge className="bg-white/20 border-white/30 text-white">{course.difficulty}</Badge>
                <span className="text-violet-100 text-sm flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.estimated_weeks || 4} weeks
                </span>
                <span className="text-violet-100 text-sm flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrollment_count || 0} enrolled
                </span>
              </div>

              <h1 className="text-4xl font-serif font-bold mb-4">{course.title}</h1>
              <p className="text-violet-100 text-lg leading-relaxed mb-6">{course.description}</p>

              {!isEnrolled ? (
                <Button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending || !user}
                  className="bg-white text-violet-700 hover:bg-violet-50 gap-2"
                  size="lg"
                >
                  {enrollMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  Enroll & Start Course
                </Button>
              ) : (
                <div className="bg-white/15 rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Your Progress</span>
                    <span className="text-violet-100">{progressPercent}% complete</span>
                  </div>
                  <Progress value={progressPercent} className="h-2 mb-2" />
                  <p className="text-violet-100 text-sm">
                    {completedSessions.length} of {course.sessions?.length || 0} sessions completed
                  </p>
                </div>
              )}
            </div>

            {course.cover_image_url && (
              <div className="w-full lg:w-80">
                <div className="aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-lg">
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {!user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-lg mx-auto"
          >
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Sign in to Access Course</h2>
            <p className="text-slate-500 mb-6">Create an account to track your progress and participate.</p>
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Sign In
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {(course.sessions || []).map((session: any, sessionIndex: number) => {
              const isCompleted = completedSessions.includes(sessionIndex);

              return (
                <motion.div
                  key={sessionIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sessionIndex * 0.1 }}
                >
                  <GradientCard variant="cool" className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-violet-600 border-violet-200">
                            Session {sessionIndex + 1}
                          </Badge>
                          {isCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{session.title}</h2>
                        <p className="text-slate-600">{session.description}</p>
                      </div>

                      {isEnrolled && (
                        <Button
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => updateProgressMutation.mutate(sessionIndex)}
                          disabled={updateProgressMutation.isPending}
                          className={isCompleted ? "" : "bg-violet-600 hover:bg-violet-700"}
                        >
                          {updateProgressMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isCompleted ? (
                            "Mark Incomplete"
                          ) : (
                            "Mark Complete"
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Content Blocks */}
                    <div className="space-y-6">
                      {(session.content_blocks || []).map((block: any, blockIndex: number) => {
                        const blockType = block.type;

                        const blockIcon =
                          blockType === "video"
                            ? Video
                            : blockType === "discussion"
                              ? MessageCircle
                              : blockType === "assignment"
                                ? ListChecks
                                : FileText;

                        const Icon = blockIcon;

                        return (
                          <div key={blockIndex} className="border border-slate-200 rounded-xl p-6 bg-white">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-violet-100 rounded-lg">
                                <Icon className="h-5 w-5 text-violet-600" />
                              </div>
                              <h3 className="font-semibold text-slate-800">{block.title}</h3>
                            </div>

                            {blockType === "video" ? (
                              <div className="space-y-4">
                                <p className="text-slate-600">{block.description}</p>
                                {block.video_url ? (
                                  <VideoBlock url={block.video_url} title={block.title} />
                                ) : (
                                  <div className="text-sm text-slate-600">
                                    No video URL provided.
                                  </div>
                                )}
                              </div>
                            ) : blockType === "discussion" ? (
                              <div className="space-y-4">
                                <p className="text-slate-600">{block.prompt}</p>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                  <p className="text-sm text-slate-500 text-center">
                                    Discussion feature coming soon (V1: read-only placeholder).
                                  </p>
                                </div>
                              </div>
                            ) : blockType === "assignment" ? (
                              <div className="space-y-4">
                                <p className="text-slate-600">{block.instructions}</p>
                                {block.resources && block.resources.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-slate-700">Resources:</h4>
                                    {block.resources.map((resource: any, i: number) => (
                                      <a
                                        key={i}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <BookOpen className="h-4 w-4 text-slate-500" />
                                          <span className="text-sm text-slate-700">{resource.title}</span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-slate-400" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 whitespace-pre-wrap">{block.content}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
