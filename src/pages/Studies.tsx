import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";

type StudyRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  scripture_reference?: string | null;
  book?: string | null;
  difficulty?: string | null; // beginner | intermediate | advanced
  is_published?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function DifficultyPill({ value }: { value?: string | null }) {
  const v = (value ?? "").toLowerCase();
  const label = v ? v[0].toUpperCase() + v.slice(1) : "—";
  const cls =
    v === "beginner"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : v === "intermediate"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : v === "advanced"
      ? "bg-violet-50 text-violet-700 border-violet-100"
      : "bg-slate-50 text-slate-700 border-slate-100";

  return <span className={cx("text-xs px-2.5 py-1 rounded-full border", cls)}>{label}</span>;
}

export default function Studies() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialDifficulty = urlParams.get("difficulty") || "";

  const [filters, setFilters] = useState({
    search: "",
    difficulty: initialDifficulty,
    book: "",
  });

  const {
    data: studies = [],
    isLoading,
    error,
    refetch,
  } = useQuery<StudyRecord[]>({
    queryKey: ["studies"],
    queryFn: async () => {
      // Keep this aligned with what you already had:
      // "ScriptureStudy" entity + published only + newest first
      const rows = await base44.entities.ScriptureStudy.filter({ is_published: true }, "-created_date");
      return (rows ?? []) as StudyRecord[];
    },
    retry: false,
  });

  const books = useMemo(() => {
    const set = new Set<string>();
    for (const s of studies) {
      const b = (s.book ?? "").trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [studies]);

  const filteredStudies = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const diff = filters.difficulty.trim().toLowerCase();
    const book = filters.book.trim();

    return studies.filter((study) => {
      const title = (study.title ?? "").toLowerCase();
      const desc = (study.description ?? "").toLowerCase();
      const ref = (study.scripture_reference ?? "").toLowerCase();

      const searchMatch = !q || title.includes(q) || desc.includes(q) || ref.includes(q);
      const difficultyMatch = !diff || (study.difficulty ?? "").toLowerCase() === diff;
      const bookMatch = !book || (study.book ?? "") === book;

      return searchMatch && difficultyMatch && bookMatch;
    });
  }, [studies, filters]);

  const clearFilters = () => setFilters({ search: "", difficulty: "", book: "" });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Studies</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-serif font-bold mb-4">Learn to Study Scripture</h1>
                <p className="text-lg text-amber-100 leading-relaxed">
                  Studies are guided prompts that teach you <span className="font-semibold text-white">how</span> to read
                  and apply the Bible—personally or with a group—without the prompts getting watered down.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm text-amber-100">
                  <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">Pray</span>
                  <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">Genre lens</span>
                  <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">Observe</span>
                  <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">Apply</span>
                  <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">Notes</span>
                </div>
              </div>

              <Link to="/start-study" className="shrink-0">
                <Button className="bg-white text-amber-700 hover:bg-amber-50 mt-2 sm:mt-0">
                  <Plus className="h-5 w-5 mr-2" />
                  Start New Study
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm mb-8">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-3">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Filter studies
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                placeholder="Search title, description, or reference…"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={filters.difficulty}
              onChange={(e) => setFilters((p) => ({ ...p, difficulty: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={filters.book}
              onChange={(e) => setFilters((p) => ({ ...p, book: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All books</option>
              {books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filteredStudies.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{studies.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Clear
              </Button>
              <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* States */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
            <div className="font-semibold text-slate-900 mb-1">Couldn’t load studies</div>
            <div className="text-sm text-slate-600">
              This usually means the query failed or the entity name doesn’t match. Open DevTools → Console for the exact
              error.
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => refetch()} className="bg-amber-600 hover:bg-amber-700">
                Try again
              </Button>
              <Link to="/start-study">
                <Button variant="outline">Start a study anyway</Button>
              </Link>
            </div>
          </div>
        ) : filteredStudies.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm">
            <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <div className="text-lg font-semibold text-slate-900">No studies found</div>
            <div className="text-sm text-slate-600 mt-1">Try clearing filters or publish a study in Admin → Studies.</div>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
              <Link to="/start-study">
                <Button className="bg-amber-600 hover:bg-amber-700">Start New Study</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudies.map((study, i) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <DifficultyPill value={study.difficulty} />
                    {study.book ? <span className="text-xs text-slate-500">{study.book}</span> : null}
                  </div>

                  <div className="mt-3 font-semibold text-slate-900 leading-snug line-clamp-2">
                    {study.title || "Untitled Study"}
                  </div>

                  <div className="mt-2 text-sm text-slate-600 line-clamp-3">{study.description || ""}</div>

                  <div className="mt-3 text-xs text-slate-500">
                    {study.scripture_reference ? study.scripture_reference : "—"}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {/* Your router has /study for StudyDetail; keep it consistent with how you already navigate */}
                    <Link to={`/study?id=${encodeURIComponent(study.id)}`} className="flex-1">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800">Open</Button>
                    </Link>

                    <Link to="/start-study">
                      <Button variant="outline" className="rounded-xl">
                        Start
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
