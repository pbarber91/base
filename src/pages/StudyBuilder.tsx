import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, ChevronLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

type StudyRow = {
  id: string;
  title: string;
  description: string | null;
  scripture_reference: string | null;
  book: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number | null;
  cover_image_url: string | null;
  sections: any[];
};

export default function StudyBuilder() {
  const { supabase, user, loading } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get("id");

  const { data: study, isLoading } = useQuery<StudyRow | null>({
    queryKey: ["study-preview", studyId ?? "none"],
    enabled: !!studyId && !loading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studies")
        .select("id,title,description,scripture_reference,book,difficulty,estimated_minutes,cover_image_url,sections")
        .eq("id", studyId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Study not found</h2>
          <Link to={createPageUrl("AdminStudies")}>
            <Button>Back to Studies</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("AdminStudies")}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-slate-800">{study.title}</h1>
                <p className="text-sm text-slate-500">
                  {study.scripture_reference ?? ""} • Preview
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            This page is read-only. Prompts/resources stay locked to the app’s study experience.
            “Together” functionality is handled by creating study sessions (not editing sections).
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <GradientCard variant="warm" className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-800">{study.title}</h2>
              {study.description ? <p className="text-slate-600 mt-1">{study.description}</p> : null}
              <div className="text-sm text-slate-500 mt-3">
                <div>Reference: {study.scripture_reference ?? "—"}</div>
                <div>Book: {study.book ?? "—"}</div>
                <div>Difficulty: {study.difficulty}</div>
                <div>Estimated: {study.estimated_minutes ? `${study.estimated_minutes} min` : "—"}</div>
              </div>
            </div>
          </div>
        </GradientCard>

        {/* If sections exist in DB, we show them as a legacy preview only */}
        {Array.isArray(study.sections) && study.sections.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Legacy Sections (preview only)</h3>
            {study.sections.map((s: any, idx: number) => (
              <GradientCard key={s?.id ?? idx} variant="warm" className="p-5">
                <div className="text-sm font-semibold text-slate-800">
                  {idx + 1}. {s?.title ?? "Untitled"}
                </div>
                {s?.content ? <p className="text-sm text-slate-600 mt-1">{s.content}</p> : null}
              </GradientCard>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
