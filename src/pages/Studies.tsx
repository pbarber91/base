// src/pages/Studies.tsx
import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StudyCard from "@/components/studies/StudyCard";
import StudyFilters from "@/components/studies/StudyFilters";
import EmptyState from "@/components/shared/EmptyState";
import GradientCard from "@/components/ui/GradientCard";
import { BookOpen, Loader2, Plus, ArrowRight, Users, History } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type StudySessionRow = {
  id: string;
  created_by: string;
  church_id?: string | null;
  group_id?: string | null;
  reference?: string | null;
  track?: string | null;
  difficulty?: string | null;
  status: string;
  started_at: string;
  completed_at?: string | null;
  title?: string | null;
};

function formatTrack(track?: string | null) {
  if (!track) return "Study";
  return track.charAt(0).toUpperCase() + track.slice(1);
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SessionCard({ s }: { s: StudySessionRow }) {
  const title = s.title?.trim() || s.reference?.trim() || "Untitled Study";
  const subtitle = `${formatTrack(s.track)} • Started ${formatDate(s.started_at)}`;

  // IMPORTANT:
  // This expects StudySession page can load by sessionId.
  // If your StudySession page uses a different param name, update this link.
  const resumeHref = `/study-session?sessionId=${encodeURIComponent(s.id)}`;

  const pill =
    s.status === "completed" || !!s.completed_at
      ? { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" }
      : { label: "In progress", cls: "bg-amber-50 text-amber-800 border-amber-100" };

  const context =
    s.group_id ? { icon: Users, label: "Group-linked" } : s.church_id ? { icon: Users, label: "Church-linked" } : null;

  const CIcon = context?.icon;

  return (
    <GradientCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`text-xs px-2 py-1 rounded-full border ${pill.cls}`}>{pill.label}</div>
            {context && (
              <div className="text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-100 inline-flex items-center gap-1">
                {CIcon && <CIcon className="h-3.5 w-3.5" />}
                {context.label}
              </div>
            )}
          </div>

          <div className="mt-2 font-bold text-slate-900 truncate">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>

        <Link to={resumeHref} className="flex-shrink-0">
          <Button className="bg-slate-900 text-white hover:bg-slate-800">
            Resume
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </GradientCard>
  );
}

export default function Studies() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialDifficulty = urlParams.get("difficulty") || "";

  const [filters, setFilters] = useState({
    search: "",
    difficulty: initialDifficulty,
    book: "",
  });

  // Who is logged in (optional — studies page should still render when logged out)
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });

  // Public “template” studies (your existing behavior)
  const { data: studies = [], isLoading: studiesLoading } = useQuery({
    queryKey: ["studies", "public"],
    queryFn: () => base44.entities.ScriptureStudy.filter({ is_published: true }, "-created_date"),
  });

  // Study sessions (mine + linked via RLS)
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
  } = useQuery({
    queryKey: ["study-sessions"],
    enabled: !!me,
    queryFn: async () => {
      // If this entity name differs in your Base44 client, rename it here.
      // Common alternates: StudySessions, study_sessions, StudySession
      const rows = await base44.entities.StudySession.filter({}, "-started_at");
      return (rows ?? []) as StudySessionRow[];
    },
    staleTime: 10_000,
  });

  const { mine, linked } = useMemo(() => {
    const uid = (me as any)?.id;
    const mine = uid ? sessions.filter((s) => s.created_by === uid) : [];
    const linked = uid ? sessions.filter((s) => s.created_by !== uid) : [];
    return { mine, linked };
  }, [sessions, me]);

  const filteredStudies = useMemo(() => {
    return studies.filter((study: any) => {
      const searchMatch =
        !filters.search ||
        study.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.scripture_reference?.toLowerCase().includes(filters.search.toLowerCase());

      const difficultyMatch = !filters.difficulty || study.difficulty === filters.difficulty;
      const bookMatch = !filters.book || study.book === filters.book;

      return searchMatch && difficultyMatch && bookMatch;
    });
  }, [studies, filters]);

  const clearFilters = () => setFilters({ search: "", difficulty: "", book: "" });

  const loadingTop = !!me && sessionsLoading;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Studies</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-serif font-bold mb-4">Learn to Study the Bible</h1>
                <p className="text-lg text-amber-100 leading-relaxed">
                  This isn’t a “devotional feed.” It’s training wheels: pick a passage, follow the prompts, and save your work so
                  you can return and reflect later. If you start a study inside a group, you’ll also be able to link up with others
                  walking through the same passage.
                </p>
              </div>

              <Link to="/start-study">
                <Button className="bg-white text-amber-700 hover:bg-amber-50 mt-2 sm:mt-0">
                  <Plus className="h-5 w-5 mr-2" />
                  Start New Study
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Continue section */}
        {me && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Continue Your Studies</h2>
            </div>

            {loadingTop ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : mine.length > 0 ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {mine.map((s) => (
                  <SessionCard key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <GradientCard className="p-6">
                <div className="text-slate-800 font-semibold">No studies yet.</div>
                <div className="text-slate-600 text-sm mt-1">
                  Start one, and you’ll see it here so you can pick it back up later.
                </div>
                <div className="mt-4">
                  <Link to="/start-study">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">Start a Study</Button>
                  </Link>
                </div>
              </GradientCard>
            )}
          </section>
        )}

        {/* Linked section */}
        {me && linked.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Linked Studies</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {linked.map((s) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        )}

        {/* Explore section (your existing list) */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-900">Explore</h2>
          </div>

          <StudyFilters filters={filters} onChange={setFilters} onClear={clearFilters} />

          {studiesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
            </div>
          ) : filteredStudies.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStudies.map((study: any, i: number) => (
                <motion.div
                  key={study.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <StudyCard study={study} />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No studies found"
              description="Try adjusting your filters or check back later for new studies."
              action={clearFilters}
              actionLabel="Clear Filters"
            />
          )}
        </section>
      </div>
    </div>
  );
}
