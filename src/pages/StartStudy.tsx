import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { BookOpen, ChevronRight, Sparkles, Compass, Mountain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type Track = "beginner" | "intermediate" | "advanced";

export default function StartStudy() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [track, setTrack] = useState<Track | "">("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tracks = useMemo(
    () => [
      {
        id: "beginner" as const,
        title: "Beginner Track",
        icon: Sparkles,
        color: "from-emerald-500 to-teal-600",
        description: "Perfect for those new to Bible study. Focus on observation and simple application.",
        prompts: ["Pray", "Genre lens", "Observations", "Application", "Notes"],
      },
      {
        id: "intermediate" as const,
        title: "Intermediate Track",
        icon: Compass,
        color: "from-blue-500 to-indigo-600",
        description: "Add original-audience context and bridge the gap to today (similarities/differences).",
        prompts: ["Pray", "Genre lens", "Context", "Meaning", "Bridge", "Application", "Notes"],
      },
      {
        id: "advanced" as const,
        title: "Advanced Track",
        icon: Mountain,
        color: "from-purple-500 to-violet-600",
        description: "Structure, themes, cross-references, word study, and commentary notes.",
        prompts: ["Pray", "Genre lens", "Structure", "Themes", "Cross-refs", "Word study", "Application", "Notes"],
      },
    ],
    []
  );

  const canStart = reference.trim().length > 0 && !!track && !creating;

  const handleStart = async () => {
    if (!user) {
      navigate("/get-started", { replace: true });
      return;
    }
    if (!track || !reference.trim()) return;

    setErr(null);
    setCreating(true);

    try {
      // Create a new study session row in Supabase (NOT Base44)
      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          created_by: user.id,
          reference: reference.trim(),
          // keep both fields so you can evolve later without breaking old sessions
          scripture_reference: reference.trim(),
          track,
          difficulty: track, // your enum is "difficulty" and matches beginner/intermediate/advanced
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;

      const sessionId = data?.id;
      if (!sessionId) throw new Error("Study session was created, but no ID was returned.");

      navigate(`/study-session?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to start study.");
      setCreating(false);
      return;
    }

    setCreating(false);
  };

  // If auth provider still loading, keep UI stable
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  // If not logged in, route to get-started (no full reload)
  if (!user) {
    navigate("/get-started", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Study</span>
            </div>

            <h1 className="text-4xl font-serif font-bold mb-3">Start a New Study</h1>
            <p className="text-lg text-amber-100 leading-relaxed max-w-2xl">
              The goal isn’t to “fill out a form.” It’s to learn how to study Scripture responsibly: pray, observe,
              understand the original meaning, bridge to today, and respond with obedience.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GradientCard variant="warm" className="p-7 mb-6">
            <Label htmlFor="reference" className="text-base font-semibold text-slate-800 mb-2 block">
              Scripture Reference
            </Label>
            <Input
              id="reference"
              placeholder="e.g., John 3:16–17, Romans 8, Psalm 23"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="text-lg h-12"
            />
            <p className="text-sm text-slate-500 mt-2">Pick the passage you want to study today.</p>
          </GradientCard>
        </motion.div>

        <div className="mb-7">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Choose Your Study Track</h2>
          <p className="text-sm text-slate-600 mb-4">
            Tracks don’t change the “truth”—they change the depth. You can always level up later.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {tracks.map((t, i) => {
              const Icon = t.icon;
              const isSelected = track === t.id;

              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.08 }}>
                  <button
                    onClick={() => setTrack(t.id)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                      isSelected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                    type="button"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <h3 className="font-bold text-slate-800 mb-2">{t.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{t.description}</p>

                    <div className="space-y-1">
                      {t.prompts.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {p}
                        </div>
                      ))}
                      {t.prompts.length > 3 && <div className="text-xs text-slate-400">+ {t.prompts.length - 3} more</div>}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {err}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            className="bg-amber-600 hover:bg-amber-700 text-lg px-8"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                Begin Study
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
