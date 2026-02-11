// src/pages/CourseDetail.tsx
import React, { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, ChevronLeft, Users, ShieldCheck } from "lucide-react";
import { createPageUrl } from "@/utils";

type CourseRow = {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  is_published: boolean;
  visibility?: string | null;
};

type EnrollmentRow = {
  course_id: string;
  user_id: string;
  role: string;
  enrolled_at: string;
};

export default function CourseDetail() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const courseId = params.get("id") || "";

  const canUse = !!user?.id && !loading && !!courseId;

  const courseQ = useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId && !loading,
    queryFn: async (): Promise<CourseRow | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,church_id,title,description,cover_image_url,tags,is_published,visibility")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CourseRow | null;
    },
  });

  const enrollmentQ = useQuery({
    queryKey: ["course-enrollment", courseId, user?.id],
    enabled: canUse,
    queryFn: async (): Promise<EnrollmentRow | null> => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id,user_id,role,enrolled_at")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EnrollmentRow | null;
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

  const course = courseQ.data;

  const isEnrolled = !!enrollmentQ.data;
  const myRole = enrollmentQ.data?.role || "participant";

  const visibilityLabel = useMemo(() => {
    const v = (course?.visibility || "").toString().toLowerCase();
    if (v === "public") return "Public";
    if (v === "church") return "Church-only";
    if (v) return v;
    return null;
  }, [course?.visibility]);

  if (loading || courseQ.isLoading) {
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

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <div className="text-xl font-bold text-slate-900 mb-2">Course not found</div>
          <Link to={createPageUrl("Courses")}>
            <Button>Back to Courses</Button>
          </Link>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link
            to={createPageUrl("Courses")}
            className="inline-flex items-center gap-2 text-violet-100 hover:text-white mb-6 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Courses
          </Link>

          <h1 className="text-3xl font-serif font-bold mb-3">{course.title}</h1>
          {course.description ? (
            <p className="text-violet-100 mb-4">{course.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant={course.is_published ? "default" : "secondary"}>
              {course.is_published ? "Published" : "Draft"}
            </Badge>
            {visibilityLabel ? <Badge variant="outline">{visibilityLabel}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <GradientCard className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Users className="h-5 w-5" />
                Enrollment
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {isEnrolled ? (
                  <span className="inline-flex items-center gap-2">
                    You are enrolled. Role:{" "}
                    <Badge className={myRole === "leader" ? "bg-violet-600" : ""} variant={myRole === "leader" ? "default" : "secondary"}>
                      {myRole === "leader" ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Leader
                        </span>
                      ) : (
                        "Participant"
                      )}
                    </Badge>
                  </span>
                ) : (
                  "Enroll to participate and show up on the roster."
                )}
              </div>
            </div>

            {!isEnrolled ? (
              <Button
                onClick={() => enrollMutation.mutate()}
                disabled={enrollMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {enrollMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enrolling…
                  </>
                ) : (
                  "Enroll"
                )}
              </Button>
            ) : null}
          </div>

          {(enrollmentQ.isError || enrollMutation.isError) && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {(enrollmentQ.error as any)?.message ||
                (enrollMutation.error as any)?.message ||
                "Enrollment error."}
            </div>
          )}
        </GradientCard>
      </div>
    </div>
  );
}
