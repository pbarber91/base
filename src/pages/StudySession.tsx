// src/pages/StudySession.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Book,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Globe,
  Languages,
  Lightbulb,
  Loader2,
  MessageSquare,
  Network,
  StickyNote,
  Users,
} from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GradientCard from "@/components/ui/GradientCard";

type TrackId = "beginner" | "intermediate" | "advanced";

type Prompt = {
  id: string;
  title: string;
  subtitle?: string;
  placeholder: string;
  field: string;
  icon: any;
  tools?: Array<{ label: string; url: string }>;
};

function safeString(v: any) {
  return typeof v === "string" ? v : "";
}

export default function StudySession() {
  const navigate = useNavigate();
  const { user, supabase, loading } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);

  const reference = safeString(urlParams.get("reference"));
  const track = (safeString(urlParams.get("track")) as TrackId) || "beginner";

  // optional kickoff params from StartStudy
  const kickoffPrayer = safeString(urlParams.get("prayer"));
  const kickoffGenre = safeString(urlParams.get("genre"));
  const kickoffText = safeString(urlParams.get("text"));

  const [sessionId, setSessionId] = useState<string | null>(safeString(urlParams.get("session")) || null);

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    kickoff: true,
  });
  const [initialLoaded, setInitialLoaded] = useState(false);

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  const updateResponse = (field: string, value: string) => setResponses((p) => ({ ...p, [field]: value }));

  const resources = useMemo(
    () => [
      { title: "BibleProject — Book Overviews", url: "https://bibleproject.com/explore/book-overviews/", subtitle: "Quick context + structure" },
      { title: "StepBible", url: "https://www.stepbible.org/", subtitle: "Cross references, lexicon, notes" },
      { title: "Blue Letter Bible", url: "https://www.blueletterbible.org/", subtitle: "Word study, original language tools" },
      { title: "NET Bible", url: "https://netbible.org/", subtitle: "Translator notes" },
    ],
    []
  );

  // Prompts in code (fixed)
  const sections: Record<TrackId, Prompt[]> = useMemo(
    () => ({
      beginner: [
        {
          id: "observations",
          icon: BookOpen,
          title: "What do you notice?",
          subtitle: 'Slow down and list what you see (repeated words, people, “because/therefore”, contrasts).',
          placeholder: "Write what stands out to you…",
          field: "observations",
          tools: [
            { label: "StepBible", url: "https://www.stepbible.org/" },
            { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/" },
          ],
        },
        {
          id: "application",
          icon: Lightbulb,
          title: "Application / Response",
          subtitle: "Write one clear response you can actually do this week. Keep it simple and honest.",
          placeholder: "Be specific about one step you will take…",
          field: "application",
          tools: [],
        },
      ],
      intermediate: [
        {
          id: "historical_context",
          icon: Globe,
          title: "Historical / Cultural Context",
          subtitle: 'Answer “Who/why/what was happening?” so application stays accurate.',
          placeholder: "What’s going on in the background (time, setting, situation)?",
          field: "historical_context",
          tools: [{ label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" }],
        },
        {
          id: "observations",
          icon: BookOpen,
          title: "Important Words / Observations",
          subtitle: "Observation = what the text says. Start with repeated words, people, contrasts, cause/effect.",
          placeholder: "Write observations from the text…",
          field: "observations",
          tools: [{ label: "StepBible", url: "https://www.stepbible.org/" }],
        },
        {
          id: "original_audience",
          icon: Users,
          title: "Original Audience",
          subtitle: "Who heard/read this first? What was their situation?",
          placeholder: "Who is being addressed, and what’s their context?",
          field: "original_audience",
          tools: [
            { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" },
            { label: "NET Bible", url: "https://netbible.org/" },
          ],
        },
        {
          id: "original_meaning",
          icon: Globe,
          title: "What did it mean to them?",
          subtitle: "What would the original audience understand this to mean in their world?",
          placeholder: "Summarize the original meaning in context…",
          field: "original_meaning",
          tools: [{ label: "NET Bible", url: "https://netbible.org/" }],
        },
        {
          id: "context_similarities",
          icon: ArrowLeftRight,
          title: "How is context similar?",
          subtitle: "Bridge: what overlaps between their context and ours?",
          placeholder: "What overlaps between then and now?",
          field: "context_similarities",
          tools: [],
        },
        {
          id: "context_differences",
          icon: ArrowLeftRight,
          title: "How is context different?",
          subtitle: "Name differences so you don’t misapply.",
          placeholder: "What’s different that affects how you apply this?",
          field: "context_differences",
          tools: [],
        },
        {
          id: "application",
          icon: Lightbulb,
          title: "Application / Response",
          subtitle: "Write a specific response that is faithful to the text and wise for today.",
          placeholder: "One clear response you will act on this week…",
          field: "application",
          tools: [],
        },
      ],
      advanced: [
        {
          id: "historical_context",
          icon: Globe,
          title: "Historical / Cultural Context",
          subtitle: 'Answer “Who/why/what was happening?” so application stays accurate.',
          placeholder: "What’s going on in the background (time, setting, situation)?",
          field: "historical_context",
          tools: [{ label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" }],
        },
        {
          id: "observations",
          icon: BookOpen,
          title: "Observations",
          subtitle:
            "Stay text-first. Mark imperatives, discourse flow (claims → reasons → implications), contrasts, repeated terms.",
          placeholder: "Write your observations…",
          field: "observations",
          tools: [],
        },
        {
          id: "original_audience",
          icon: Users,
          title: "Original Audience",
          subtitle: "Who heard/read this first? What was their situation?",
          placeholder: "Who is being addressed, and what’s their context?",
          field: "original_audience",
          tools: [],
        },
        {
          id: "original_meaning",
          icon: Globe,
          title: "What did it mean to them?",
          subtitle: "What would the original audience understand this to mean in their world?",
          placeholder: "Summarize the original meaning in context…",
          field: "original_meaning",
          tools: [{ label: "NET Bible", url: "https://netbible.org/" }],
        },
        {
          id: "context_similarities",
          icon: ArrowLeftRight,
          title: "How is context similar?",
          subtitle: "Bridge: what overlaps between their context and ours?",
          placeholder: "What overlaps between then and now?",
          field: "context_similarities",
          tools: [],
        },
        {
          id: "context_differences",
          icon: ArrowLeftRight,
          title: "How is context different?",
          subtitle: "Name differences so you don’t misapply.",
          placeholder: "What’s different that affects how you apply this?",
          field: "context_differences",
          tools: [],
        },
        {
          id: "structure",
          icon: Network,
          title: "Structure / argument flow",
          subtitle: "Outline the logic or movement of the passage (claims → reasons → implications).",
          placeholder: "Outline the flow of thought…",
          field: "structure",
          tools: [
            { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" },
            { label: "NET Bible", url: "https://netbible.org/" },
          ],
        },
        {
          id: "themes",
          icon: Book,
          title: "Big theological themes",
          subtitle: "Truths about God, humanity, salvation, covenant, kingdom, holiness, etc.",
          placeholder: "List key themes you see…",
          field: "themes",
          tools: [{ label: "BibleProject Themes", url: "https://bibleproject.com/explore/themes/" }],
        },
        {
          id: "cross_references",
          icon: Network,
          title: "Cross references / intertext",
          subtitle: "Where does Scripture interpret Scripture? Note OT echoes, quotations, parallel passages.",
          placeholder: "Note related scriptures…",
          field: "cross_references",
          tools: [
            { label: "StepBible", url: "https://www.stepbible.org/" },
            { label: "OpenBible Cross References", url: "https://www.openbible.info/labs/cross-references/" },
          ],
        },
        {
          id: "word_studies",
          icon: Languages,
          title: "Word study (key terms)",
          subtitle: "Choose 1–3 key words. Define from context, then check lexicon/interlinear.",
          placeholder: "Key terms + what you found…",
          field: "word_studies",
          tools: [{ label: "Blue Letter Bible", url: "https://www.blueletterbible.org/" }],
        },
        {
          id: "commentary_notes",
          icon: MessageSquare,
          title: "Commentary / questions to resolve",
          subtitle: "Summarize what you found from a trusted resource and list remaining questions.",
          placeholder: "Summarize insights + questions…",
          field: "commentary_notes",
          tools: [],
        },
        {
          id: "application",
          icon: Lightbulb,
          title: "Application / Response",
          subtitle: "State a text-grounded obedience response (motive + measurable step + timeframe).",
          placeholder: "One faithful response you’ll act on…",
          field: "application",
          tools: [],
        },
      ],
    }),
    []
  );

  const currentSections = sections[track] || sections.beginner;

  // ---------------------------------------------
  // Create or load DB session + existing responses
  // ---------------------------------------------
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let cancelled = false;

    const ensureSession = async () => {
      // If we already have a session_id, just load responses
      if (!sessionId) {
        // create session row (robust fallback if column names differ)
        const primaryPayload: any = {
          user_id: user.id,
          reference: reference || null,
          track: track || null,
        };

        let createdId: string | null = null;

        // Try richer insert first
        let insertRes = await supabase.from("study_sessions").insert(primaryPayload).select("id").single();

        // If columns don't exist, retry with minimal safe payload
        if (insertRes.error) {
          const minimalPayload: any = { user_id: user.id };
          insertRes = await supabase.from("study_sessions").insert(minimalPayload).select("id").single();
        }

        if (insertRes.error) {
          // hard fail: go back to start-study
          console.error("Failed to create study session:", insertRes.error);
          return navigate(createPageUrl("StartStudy"), { replace: true });
        }

        createdId = insertRes.data?.id ?? null;
        if (!createdId) return navigate(createPageUrl("StartStudy"), { replace: true });

        if (cancelled) return;

        // Put session id in URL so refresh is stable
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set("session", createdId);
        setSessionId(createdId);
        navigate(createPageUrl("StudySession") + "?" + nextParams.toString(), { replace: true });
        return;
      }

      // Load existing response rows for this user/session
      const { data, error } = await supabase
        .from("study_session_responses")
        .select("id, prompt_key, response, notes")
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to load study responses:", error);
        setInitialLoaded(true);
        return;
      }

      const merged: Record<string, string> = {};

      // kickoff fields are stored under fixed prompt_keys too
      for (const row of data || []) {
        if (row.prompt_key && typeof row.response === "string") merged[row.prompt_key] = row.response;
        if (row.prompt_key === "notes" && typeof row.notes === "string" && !merged.notes) merged.notes = row.notes;
      }

      // If DB has nothing yet, seed from kickoff params (but don't overwrite DB values)
      if (!merged.kickoff_prayer && kickoffPrayer) merged.kickoff_prayer = kickoffPrayer;
      if (!merged.kickoff_genre && kickoffGenre) merged.kickoff_genre = kickoffGenre;
      if (!merged.kickoff_text && kickoffText) merged.kickoff_text = kickoffText;

      setResponses((prev) => ({ ...merged, ...prev }));
      setInitialLoaded(true);
    };

    ensureSession();

    return () => {
      cancelled = true;
    };
  }, [loading, user, sessionId, supabase, reference, track, navigate, kickoffPrayer, kickoffGenre, kickoffText]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !sessionId) throw new Error("Not ready");

      // Load existing row ids so we can update vs insert (no need for a unique constraint)
      const { data: existingRows, error: existingErr } = await supabase
        .from("study_session_responses")
        .select("id, prompt_key")
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (existingErr) throw existingErr;

      const byKey = new Map<string, string>();
      for (const r of existingRows || []) {
        if (r.prompt_key && r.id) byKey.set(r.prompt_key, r.id);
      }

      const toSave: Array<{ prompt_key: string; response: string }> = [];

      // kickoff “always prompts”
      toSave.push({ prompt_key: "kickoff_prayer", response: safeString(responses.kickoff_prayer) });
      toSave.push({ prompt_key: "kickoff_genre", response: safeString(responses.kickoff_genre) });
      toSave.push({ prompt_key: "kickoff_text", response: safeString(responses.kickoff_text) });

      // track prompts
      for (const p of currentSections) {
        toSave.push({ prompt_key: p.field, response: safeString(responses[p.field]) });
      }

      // notes
      toSave.push({ prompt_key: "notes", response: safeString(responses.notes) });

      // Save each prompt row
      for (const item of toSave) {
        const trimmed = (item.response ?? "").toString();

        // Skip totally empty rows (keeps table cleaner), except notes (we still skip if empty)
        if (!trimmed.trim()) continue;

        const existingId = byKey.get(item.prompt_key);

        if (existingId) {
          const { error } = await supabase
            .from("study_session_responses")
            .update({
              response: trimmed,
              // mirror notes column if prompt_key is notes
              ...(item.prompt_key === "notes" ? { notes: trimmed } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("study_session_responses").insert({
            session_id: sessionId,
            user_id: user.id,
            prompt_key: item.prompt_key,
            response: trimmed,
            ...(item.prompt_key === "notes" ? { notes: trimmed } : {}),
            created_by: user.id,
          });

          if (error) throw error;
        }
      }

      // Try to mark session completed (safe fallback if column doesn't exist)
      const completedAttempt = await supabase
        .from("study_sessions")
        .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      // If completed_at column doesn't exist, silently ignore (no throw)
      if (completedAttempt.error) {
        // still try a minimal updated_at, ignore if also not present
        await supabase.from("study_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
    },
    onSuccess: () => {
      navigate(createPageUrl("Studies"), { replace: true });
    },
  });

  if (loading || !initialLoaded || (user && !sessionId)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <GradientCard className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Sign in to continue</h2>
          <p className="text-sm text-slate-600 mb-5">
            You’ll need an account so your study responses can be saved and you can return later.
          </p>
          <Button onClick={() => navigate(createPageUrl("GetStarted"))} className="bg-amber-600 hover:bg-amber-700">
            Go to Sign In
          </Button>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link to={createPageUrl("StartStudy")} className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-3xl font-serif font-bold mb-2">{reference || "Study Session"}</h1>
          <p className="text-amber-100 capitalize">{track} Track</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Resources */}
        <GradientCard variant="sage" className="p-6 mb-8">
          <h3 className="font-bold text-slate-800 mb-3">Study Resources</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-white/60 hover:bg-white border border-slate-100 hover:border-slate-200 transition-all group"
              >
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 group-hover:text-amber-600 transition-colors">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.subtitle}</div>
                </div>
              </a>
            ))}
          </div>
        </GradientCard>

        {/* Kickoff prompts (always) */}
        <div className="mb-4">
          <Collapsible open={openSections.kickoff} onOpenChange={() => toggleSection("kickoff")}>
            <GradientCard className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-6 text-left flex items-center gap-4 hover:bg-white/40 transition-colors">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">Before you begin</h3>
                  <p className="text-sm text-slate-500">Pray, set a genre lens, and keep the text in front of you.</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.kickoff ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">Pray</div>
                    <Textarea
                      placeholder="Ask God for illumination, humility, and obedience…"
                      value={responses.kickoff_prayer || ""}
                      onChange={(e) => updateResponse("kickoff_prayer", e.target.value)}
                      className="min-h-24 resize-none"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">Genre Lens</div>
                    <p className="text-xs text-slate-500 mb-2">Genre shapes what to look for.</p>
                    <input
                      value={responses.kickoff_genre || ""}
                      onChange={(e) => updateResponse("kickoff_genre", e.target.value)}
                      placeholder="Optional (e.g., Gospel, Letter, Poetry, Narrative...)"
                      className="w-full h-10 rounded-lg border border-slate-200 px-3 outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">Scripture Text</div>
                    <Textarea
                      placeholder="Paste the passage here (optional)…"
                      value={responses.kickoff_text || ""}
                      onChange={(e) => updateResponse("kickoff_text", e.target.value)}
                      className="min-h-28 resize-none"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </GradientCard>
          </Collapsible>
        </div>

        {/* Prompts */}
        <div className="space-y-4">
          {currentSections.map((section, i) => {
            const Icon = section.icon;
            const isOpen = !!openSections[section.id];
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                  <GradientCard className="overflow-hidden">
                    <CollapsibleTrigger className="w-full p-6 text-left flex items-center gap-4 hover:bg-white/40 transition-colors">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Icon className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                        {section.subtitle && <p className="text-sm text-slate-500">{section.subtitle}</p>}
                      </div>
                      <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-6 pb-6 space-y-4">
                        {section.tools && section.tools.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {section.tools.map((tool, idx) => (
                              <a
                                key={idx}
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {tool.label}
                              </a>
                            ))}
                          </div>
                        )}

                        <Textarea
                          placeholder={section.placeholder}
                          value={responses[section.field] || ""}
                          onChange={(e) => updateResponse(section.field, e.target.value)}
                          className="min-h-32 resize-none"
                        />
                      </div>
                    </CollapsibleContent>
                  </GradientCard>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>

        {/* Notes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: currentSections.length * 0.04 }} className="mt-4">
          <Collapsible open={!!openSections.notes} onOpenChange={() => toggleSection("notes")}>
            <GradientCard>
              <CollapsibleTrigger className="w-full p-6 text-left flex items-center gap-4 hover:bg-white/40 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <StickyNote className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">Additional Notes</h3>
                  <p className="text-sm text-slate-500">Extra notes, cross references, prayer notes, questions…</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.notes ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <Textarea
                    placeholder="Capture anything else God is teaching you…"
                    value={responses.notes || ""}
                    onChange={(e) => updateResponse("notes", e.target.value)}
                    className="min-h-32 resize-none"
                  />
                </div>
              </CollapsibleContent>
            </GradientCard>
          </Collapsible>
        </motion.div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Save & Finish
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
