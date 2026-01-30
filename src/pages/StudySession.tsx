import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GradientCard from "@/components/ui/GradientCard";
import {
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Check,
  Loader2,
  BookOpen,
  Users,
  Globe,
  ArrowLeftRight,
  Lightbulb,
  StickyNote,
  Network,
  Book,
  Languages,
  MessageSquare,
  HeartHandshake,
} from "lucide-react";
import { motion } from "framer-motion";

type Track = "beginner" | "intermediate" | "advanced";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function StudySession() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("sessionId") || "";

  const [session, setSession] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const track: Track = (session?.track || session?.difficulty || "beginner") as Track;
  const reference: string = session?.reference || session?.scripture_reference || "";

  const resources = useMemo(
    () => [
      { title: "BibleProject — Book Overviews", url: "https://bibleproject.com/explore/book-overviews/", subtitle: "Quick context + structure" },
      { title: "ESV Bible", url: "https://www.esv.org/", subtitle: "Clean passage text for copy/paste" },
      { title: "NET Bible", url: "https://netbible.org/", subtitle: "Translator notes explain why wording matters" },
      { title: "StepBible — Free study tools", url: "https://www.stepbible.org/", subtitle: "Cross references, lexicon, notes" },
      { title: "Blue Letter Bible — Interlinear + Lexicon", url: "https://www.blueletterbible.org/", subtitle: "Word study, original language tools" },
      { title: "GotQuestions (use discernment)", url: "https://www.gotquestions.org/", subtitle: "Fast topic summaries; compare with Scripture" },
    ],
    []
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateResponse = (field: string, value: any) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
  };

  const sections = useMemo(() => {
    const common = [
      {
        id: "pray",
        icon: HeartHandshake,
        title: "Pray",
        subtitle: "Ask God for humility, clarity, and obedience before you begin.",
        placeholder: "Write a short prayer (or a sentence of intention)...",
        field: "pray",
        tools: [],
      },
      {
        id: "genre",
        icon: BookOpen,
        title: "Genre Lens",
        subtitle: "Genre shapes what to look for and how to interpret responsibly.",
        placeholder: "Pick a genre from the dropdown.",
        field: "genre",
        tools: [
          { label: "BibleGateway Genres", url: "https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/" },
          { label: "BibleProject (How to Read)", url: "https://bibleproject.com/videos/collections/how-to-read-the-bible/" },
          { label: "BibleProject — Book Overviews", url: "https://bibleproject.com/explore/book-overviews/" },
        ],
        kind: "select" as const,
      },
      {
        id: "scripture_text",
        icon: BookOpen,
        title: "Paste Scripture Text",
        subtitle: "Optional (for now). Paste the passage so you can mark observations right in context.",
        placeholder: "Paste the passage text here (optional)...",
        field: "scripture_text",
        tools: [
          { label: "NET API (plain text)", url: "https://labs.bible.org/api/?passage=John+3:16-17&formatting=plain&type=text" },
          { label: "StepBible", url: "https://www.stepbible.org/" },
          { label: "ESV Bible", url: "https://www.esv.org/" },
          { label: "BibleGateway", url: "https://www.biblegateway.com/" },
        ],
      },
    ];

    const beginner = [
      {
        id: "observations",
        icon: BookOpen,
        title: "What do you notice?",
        subtitle: "Slow down. List what you see (repeated words, people, because/therefore, contrasts).",
        placeholder: "Write what stands out to you...",
        field: "observations",
        tools: [{ label: "StepBible", url: "https://www.stepbible.org/" }],
      },
      {
        id: "application",
        icon: Lightbulb,
        title: "Application / Response",
        subtitle: "Write one clear response you can actually do this week. Keep it simple and honest.",
        placeholder: "A specific, doable response (this week)...",
        field: "application",
        tools: [],
      },
    ];

    const intermediate = [
      {
        id: "historical_context",
        icon: Globe,
        title: "Historical / Cultural Context",
        subtitle: `Answer “Who/why/what was happening?” so application stays accurate.`,
        placeholder: "What context matters here (author, setting, situation)...",
        field: "historical_context",
        tools: [
         { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" },
         { label: "StepBible", url: "https://www.stepbible.org/" },
         { label: "Bible Odyssey", url: "https://www.bibleodyssey.org/" },
         { label: "NET Bible", url: "https://netbible.org/" },
        ],
      },
      {
        id: "observations",
        icon: BookOpen,
        title: "Important Words / Observations",
        subtitle: "Observation = what the text says. Start with repeated terms, contrasts, cause/effect.",
        placeholder: "List key observations...",
        field: "observations",
        tools: [
          { label: "StepBible", url: "https://www.stepbible.org/" },
          { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/" },
          { label: "NET Bible", url: "https://netbible.org/" },
          { label: "OpenBible (Cross-refs)", url: "https://www.openbible.info/labs/cross-references/" },
        ],
      },
      {
        id: "original_audience",
        icon: Users,
        title: "Original Audience",
        subtitle: "Who heard/read this first? What was their situation?",
        placeholder: "Describe the original audience...",
        field: "original_audience",
        tools: [
          { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" },
          { label: "StepBible", url: "https://www.stepbible.org/" },
        ],
      },
      {
        id: "original_meaning",
        icon: Globe,
        title: "What did it mean to them?",
        subtitle: "What would the original audience understand this to mean in their world?",
        placeholder: "Summarize the original meaning...",
        field: "original_meaning",
        tools: [
          { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/" },
          { label: "StepBible", url: "https://www.stepbible.org/" },
          { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/" },
        ],
      },
      {
        id: "context_similarities",
        icon: ArrowLeftRight,
        title: "How is our context similar?",
        subtitle: "Bridge: what overlaps between their context and ours?",
        placeholder: "List similarities...",
        field: "context_similarities",
        tools: [
          { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/" },
          { label: "GotQuestions", url: "https://www.gotquestions.org/" },
        ],
      },
      {
        id: "context_differences",
        icon: ArrowLeftRight,
        title: "How is our context different?",
        subtitle: "Name differences so you don’t misapply.",
        placeholder: "List differences...",
        field: "context_differences",
        tools: [
          { label: "BibleProject (Covenants)", url: "https://bibleproject.com/videos/covenants/" },
          { label: "StepBible", url: "https://www.stepbible.org/" },
        ],
      },
      {
        id: "application",
        icon: Lightbulb,
        title: "Application / Response",
        subtitle: "Write a specific response faithful to the text and wise for today.",
        placeholder: "A specific, text-faithful response...",
        field: "application",
        tools: [],
      },
    ];

    const advanced = [
      {
        id: "historical_context",
        icon: Globe,
        title: "Historical / Cultural Context",
        subtitle: `Answer “Who/why/what was happening?” so application stays accurate.`,
        placeholder: "Context notes...",
        field: "historical_context",
        tools: [],
      },
      {
        id: "observations",
        icon: BookOpen,
        title: "Observations",
        subtitle: "Stay text-first. Mark imperatives, flow (claims → reasons → implications), contrasts, repeated terms.",
        placeholder: "Your observations...",
        field: "observations",
        tools: [],
      },
      {
        id: "original_audience",
        icon: Users,
        title: "Original Audience",
        subtitle: "Who heard/read this first? What was their situation?",
        placeholder: "Original audience notes...",
        field: "original_audience",
        tools: [],
      },
      {
        id: "original_meaning",
        icon: Globe,
        title: "What did it mean to them?",
        subtitle: "What would the original audience understand this to mean in their world?",
        placeholder: "Original meaning...",
        field: "original_meaning",
        tools: [],
      },
      {
        id: "context_similarities",
        icon: ArrowLeftRight,
        title: "How is our context similar?",
        subtitle: "Bridge: what overlaps between their context and ours?",
        placeholder: "Similarities...",
        field: "context_similarities",
        tools: [],
      },
      {
        id: "context_differences",
        icon: ArrowLeftRight,
        title: "How is our context different?",
        subtitle: "Name differences so you don’t misapply.",
        placeholder: "Differences...",
        field: "context_differences",
        tools: [],
      },
      {
        id: "structure",
        icon: Network,
        title: "Structure / Argument Flow",
        subtitle: "Outline the logic or movement (claims → reasons → implications).",
        placeholder: "Outline the passage flow...",
        field: "structure",
        tools: [{ label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/" }],
      },
      {
        id: "themes",
        icon: Book,
        title: "Big Theological Themes",
        subtitle: "Truths about God, humanity, salvation, covenant, kingdom, holiness, etc.",
        placeholder: "Themes you see...",
        field: "themes",
        tools: [{ label: "BibleProject Themes", url: "https://bibleproject.com/explore/themes/" }],
      },
      {
        id: "cross_references",
        icon: Network,
        title: "Cross References / Intertext",
        subtitle: "Where does Scripture interpret Scripture? OT echoes, quotations, parallels.",
        placeholder: "Related passages...",
        field: "cross_references",
        tools: [
          { label: "StepBible", url: "https://www.stepbible.org/" },
          { label: "OpenBible Cross-Refs", url: "https://www.openbible.info/labs/cross-references/" },
        ],
      },
      {
        id: "word_studies",
        icon: Languages,
        title: "Word Study (Key Terms)",
        subtitle: "Choose 1–3 key words. Define from context, then check lexicon/interlinear.",
        placeholder: "Key terms + findings...",
        field: "word_studies",
        tools: [{ label: "Blue Letter Bible", url: "https://www.blueletterbible.org/" }],
      },
      {
        id: "commentary_notes",
        icon: MessageSquare,
        title: "Commentary / Questions to Resolve",
        subtitle: "Summarize what you found from a trusted resource + remaining questions.",
        placeholder: "Commentary notes + questions...",
        field: "commentary_notes",
        tools: [],
      },
      {
        id: "application",
        icon: Lightbulb,
        title: "Application / Response",
        subtitle: "Text-grounded obedience response (motive + measurable step + timeframe).",
        placeholder: "Obedience response...",
        field: "application",
        tools: [],
      },
    ];

    const byTrack: Record<Track, any[]> = {
      beginner: [...common, ...beginner],
      intermediate: [...common, ...intermediate],
      advanced: [...common, ...advanced],
    };

    return byTrack;
  }, []);

  const currentSections = sections[track] ?? sections.beginner;

  // Hydrate: session row + previous saved responses
  useEffect(() => {
    const run = async () => {
      setPageErr(null);

      if (loading) return;
      if (!user) {
        navigate("/get-started", { replace: true });
        return;
      }
      if (!sessionId) {
        setPageErr("Missing sessionId. Please start a study again.");
        setHydrating(false);
        return;
      }

      setHydrating(true);

      try {
        const { data: sess, error: sessErr } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (sessErr) throw sessErr;

        // Basic ownership guard (for now). Later we can expand to group/church sessions.
        if (sess?.created_by && sess.created_by !== user.id) {
          throw new Error("You don’t have access to this study session.");
        }

        setSession(sess);

        // Load the single “__all__” response row if it exists
        const { data: r, error: rErr } = await supabase
          .from("study_session_responses")
          .select("id, responses, notes")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .eq("prompt_key", "__all__")
          .maybeSingle();

        if (rErr) throw rErr;

        if (r?.responses && typeof r.responses === "object") {
          setResponses(r.responses as Record<string, any>);
        }
        if (typeof r?.notes === "string") {
          setResponses((prev) => ({ ...prev, notes: r.notes }));
        }

        setHydrating(false);
      } catch (e: any) {
        setPageErr(e?.message ?? "Failed to load study session.");
        setHydrating(false);
      }
    };

    run();
  }, [loading, user, sessionId, supabase, navigate]);

  const saveMutation = useMutation({
    mutationFn: async (markComplete: boolean) => {
      if (!user) throw new Error("Not authenticated.");
      if (!sessionId) throw new Error("Missing sessionId.");

      // Find existing response row id (if any)
      const { data: existing, error: findErr } = await supabase
        .from("study_session_responses")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .eq("prompt_key", "__all__")
        .maybeSingle();

      if (findErr) throw findErr;

      const payload = {
        session_id: sessionId,
        user_id: user.id,
        created_by: user.id,
        prompt_key: "__all__",
        responses: { ...responses, notes: responses.notes ?? "" },
        notes: (responses.notes ?? "").toString(),
        response: null as any, // keep column unused; we store everything in jsonb
      };

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from("study_session_responses")
          .update(payload)
          .eq("id", existing.id);

        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("study_session_responses").insert(payload);
        if (insErr) throw insErr;
      }

      if (markComplete) {
        const { error: sessUpErr } = await supabase
          .from("study_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (sessUpErr) throw sessUpErr;
      }
    },
    onSuccess: (_data, markComplete) => {
      if (markComplete) navigate("/studies", { replace: true });
    },
  });

  if (loading || hydrating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (pageErr) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <GradientCard className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 mb-6">{pageErr}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => navigate("/studies")}>
              Back to Studies
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => navigate("/start-study")}>
              Start Again
            </Button>
          </div>
        </GradientCard>
      </div>
    );
  }

  const genreValue = (responses.genre ?? "") as string;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            to="/start-study"
            className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-6 text-sm"
          >
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
                  <div className="font-medium text-sm text-slate-800 group-hover:text-amber-600 transition-colors">
                    {r.title}
                  </div>
                  <div className="text-xs text-slate-500">{r.subtitle}</div>
                </div>
              </a>
            ))}
          </div>
        </GradientCard>

        {/* Prompts */}
        <div className="space-y-4">
          {currentSections.map((section: any, i: number) => {
            const Icon = section.icon;
            const isOpen = !!openSections[section.id];

            return (
              <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
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
                      <ChevronDown className={cx("h-5 w-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-6 pb-6 space-y-4">
                        {section.tools && section.tools.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {section.tools.map((tool: any, idx: number) => (
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

                        {section.kind === "select" ? (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select a genre</label>
                            <select
                              value={genreValue}
                              onChange={(e) => updateResponse("genre", e.target.value)}
                              className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">Choose one…</option>
                              <option value="narrative">Narrative</option>
                              <option value="law">Law</option>
                              <option value="poetry">Poetry / Wisdom</option>
                              <option value="prophecy">Prophecy</option>
                              <option value="gospel">Gospel</option>
                              <option value="letter">Letter / Epistle</option>
                              <option value="apocalyptic">Apocalyptic</option>
                              <option value="other">Other</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                              Genre isn’t “extra”—it keeps you from reading a proverb like a promise, or poetry like a legal contract.
                            </p>
                          </div>
                        ) : (
                          <Textarea
                            placeholder={section.placeholder}
                            value={(responses[section.field] as string) || ""}
                            onChange={(e) => updateResponse(section.field, e.target.value)}
                            className="min-h-32 resize-none"
                          />
                        )}
                      </div>
                    </CollapsibleContent>
                  </GradientCard>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>

        {/* Notes (end) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: currentSections.length * 0.03 }} className="mt-4">
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
                <ChevronDown className={cx("h-5 w-5 text-slate-400 transition-transform", !!openSections.notes && "rotate-180")} />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <Textarea
                    placeholder="Capture anything else God is teaching you…"
                    value={(responses.notes as string) || ""}
                    onChange={(e) => updateResponse("notes", e.target.value)}
                    className="min-h-32 resize-none"
                  />
                </div>
              </CollapsibleContent>
            </GradientCard>
          </Collapsible>
        </motion.div>

        {/* Save/Complete */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save Progress"
            )}
          </Button>

          <Button
            size="lg"
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Completing…
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Complete Study
              </>
            )}
          </Button>
        </div>

        {saveMutation.isError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {(saveMutation.error as any)?.message ?? "Failed to save."}
          </div>
        )}
      </div>
    </div>
  );
}
