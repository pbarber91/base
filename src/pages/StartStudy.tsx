// src/pages/StartStudy.tsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Compass, Mountain, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

import GradientCard from "@/components/ui/GradientCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TrackId = "beginner" | "intermediate" | "advanced";

const GENRE_LENSES = [
  { value: "", label: "Select a genre…" },
  { value: "narrative", label: "Narrative (story / events)" },
  { value: "poetry", label: "Poetry / Wisdom (Psalms, Proverbs)" },
  { value: "gospel", label: "Gospel (Jesus’ life / teaching)" },
  { value: "epistle", label: "Letter (instruction to a church/person)" },
  { value: "prophecy", label: "Prophecy (warning/hope; imagery)" },
  { value: "apocalyptic", label: "Apocalyptic (symbols / visions)" },
];

export default function StartStudy() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [track, setTrack] = useState<TrackId | "">("");
  const [prayer, setPrayer] = useState("");
  const [genreLens, setGenreLens] = useState("");
  const [scriptureText, setScriptureText] = useState("");

  const tracks = useMemo(
    () => [
      {
        id: "beginner" as const,
        title: "Beginner Track",
        icon: Sparkles,
        color: "from-emerald-500 to-teal-600",
        description:
          "Perfect for those new to Bible study. Focus on observations and practical application.",
        bullets: ["Observe the text", "Respond with one clear step"],
      },
      {
        id: "intermediate" as const,
        title: "Intermediate Track",
        icon: Compass,
        color: "from-blue-500 to-indigo-600",
        description:
          "Dig deeper with context and audience. Make application accurate and faithful to the passage.",
        bullets: ["Original audience + meaning", "Bridge similarities/differences"],
      },
      {
        id: "advanced" as const,
        title: "Advanced Track",
        icon: Mountain,
        color: "from-purple-500 to-violet-600",
        description:
          "Comprehensive study with structure analysis, themes, cross-references, and word studies.",
        bullets: ["Structure + themes", "Cross-refs + key terms"],
      },
    ],
    []
  );

  const canStart = reference.trim().length > 0 && !!track;

  const handleStart = () => {
    if (!canStart) return;

    const params = new URLSearchParams();
    params.set("reference", reference.trim());
    params.set("track", track);
    if (prayer.trim()) params.set("prayer", prayer.trim());
    if (genreLens) params.set("genre", genreLens);
    if (scriptureText.trim()) params.set("text", scriptureText.trim());

    // StudySession will create the DB session + persist responses.
    navigate(createPageUrl("StudySession") + "?" + params.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Study</span>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-3">Start a New Study</h1>
            <p className="text-lg text-amber-100 leading-relaxed max-w-2xl">
              Studies teach a consistent process: pray, read carefully, observe, understand in context, then respond with
              faithful application.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Auth hint */}
        {!loading && !user && (
          <GradientCard className="p-6">
            <div className="text-slate-800 font-semibold mb-1">Sign in to save your study</div>
            <div className="text-sm text-slate-600 mb-4">
              You can explore the flow, but you’ll need an account to save and return to your sessions.
            </div>
            <Button onClick={() => navigate(createPageUrl("GetStarted"))} className="bg-amber-600 hover:bg-amber-700">
              Go to Sign In
            </Button>
          </GradientCard>
        )}

        {/* Step 1 */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GradientCard variant="warm" className="p-7">
            <div className="space-y-4">
              <div>
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
                <p className="text-sm text-slate-500 mt-2">Enter the passage you want to study today.</p>
              </div>

              <div>
                <Label className="text-base font-semibold text-slate-800 mb-2 block">Pray (optional)</Label>
                <Textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder="Ask God for illumination, humility, and obedience as you study…"
                  className="min-h-28 resize-none"
                />
              </div>

              <div>
                <Label className="text-base font-semibold text-slate-800 mb-2 block">
                  Genre Lens <span className="text-slate-500 font-normal">(optional)</span>
                </Label>
                <p className="text-sm text-slate-500 mb-2">Genre shapes what to look for.</p>

                <div className="relative">
                  <select
                    value={genreLens}
                    onChange={(e) => setGenreLens(e.target.value)}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
                  >
                    {GENRE_LENSES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    ▾
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold text-slate-800 mb-2 block">
                  Paste Scripture Text <span className="text-slate-500 font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={scriptureText}
                  onChange={(e) => setScriptureText(e.target.value)}
                  placeholder="Paste the passage here (optional)."
                  className="min-h-36 resize-none"
                />
              </div>
            </div>
          </GradientCard>
        </motion.div>

        {/* Step 2 */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Choose Your Track</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tracks.map((t, i) => {
              const Icon = t.icon;
              const isSelected = track === t.id;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <button
                    onClick={() => setTrack(t.id)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 shadow-lg"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">{t.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{t.description}</p>
                    <div className="space-y-1">
                      {t.bullets.map((b) => (
                        <div key={b} className="text-xs text-slate-500 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {b}
                        </div>
                      ))}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Start */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex justify-end"
        >
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            className="bg-amber-600 hover:bg-amber-700 text-lg px-8"
          >
            Begin Study
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
