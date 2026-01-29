// src/pages/Studies.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, Plus, CheckCircle2, Sparkles, Compass, Mountain } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

import StudyCard from "@/components/studies/StudyCard";
import StudyFilters from "@/components/studies/StudyFilters";
import EmptyState from "@/components/shared/EmptyState";
import GradientCard from "@/components/ui/GradientCard";
import { Button } from "@/components/ui/button";

export default function Studies() {
  const { user } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const initialDifficulty = urlParams.get("difficulty") || "";

  const [filters, setFilters] = useState({
    search: "",
    difficulty: initialDifficulty,
    book: "",
  });

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ["studies"],
    queryFn: () => base44.entities.ScriptureStudy.filter({ is_published: true }, "-created_date"),
  });

  const filteredStudies = useMemo(() => {
    return studies.filter((study: any) => {
      const search = filters.search.trim().toLowerCase();
      const searchMatch =
        !search ||
        study.title?.toLowerCase().includes(search) ||
        study.description?.toLowerCase().includes(search) ||
        study.scripture_reference?.toLowerCase().includes(search);

      const difficultyMatch = !filters.difficulty || study.difficulty === filters.difficulty;
      const bookMatch = !filters.book || study.book === filters.book;

      return searchMatch && difficultyMatch && bookMatch;
    });
  }, [studies, filters]);

  const clearFilters = () => setFilters({ search: "", difficulty: "", book: "" });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Studies</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-serif font-bold mb-3">Learn to Study Scripture</h1>
                <p className="text-lg text-amber-100 leading-relaxed">
                  Studies are guided sessions that teach you <span className="font-semibold">how</span> to read Scripture
                  well—through fixed prompts and trusted resources—so you can grow in confidence and clarity.
                </p>
              </div>

              <Link to={createPageUrl("StartStudy")} className="shrink-0">
                <Button className="bg-white text-amber-700 hover:bg-amber-50 mt-1">
                  <Plus className="h-5 w-5 mr-2" />
                  Start New Study
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* “How it works” */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 pb-2">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GradientCard className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/60 border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  <div className="font-semibold text-slate-800">1) Choose a passage</div>
                </div>
                <p className="text-sm text-slate-600">
                  Pick a reference (like John 3:16–17). Optionally paste the text so you can stay focused.
                </p>
              </div>

              <div className="rounded-2xl bg-white/60 border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  <div className="font-semibold text-slate-800">2) Follow fixed prompts</div>
                </div>
                <p className="text-sm text-slate-600">
                  Prompts are intentionally consistent so you learn a reliable process (and don’t get derailed).
                </p>
              </div>

              <div className="rounded-2xl bg-white/60 border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  <div className="font-semibold text-slate-800">3) Save + return anytime</div>
                </div>
                <p className="text-sm text-slate-600">
                  Your answers are saved so you can come back later or use them as a foundation for group discussion.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-slate-100 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Beginner
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-slate-100 px-3 py-1.5">
                <Compass className="h-3.5 w-3.5 text-blue-600" /> Intermediate
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-slate-100 px-3 py-1.5">
                <Mountain className="h-3.5 w-3.5 text-violet-600" /> Advanced
              </span>

              {!user && (
                <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5 text-amber-800">
                  Sign in to save your sessions
                </span>
              )}
            </div>
          </GradientCard>
        </motion.div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <StudyFilters filters={filters} onChange={setFilters} onClear={clearFilters} />

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          </div>
        ) : filteredStudies.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudies.map((study: any, i: number) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
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
      </div>
    </div>
  );
}
