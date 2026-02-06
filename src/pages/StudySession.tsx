// src/pages/StudySession.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Send,
} from "lucide-react";
import { motion } from "framer-motion";

type Track = "beginner" | "intermediate" | "advanced";

type ProfileLite = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type StudySessionRow = {
  id: string;
  created_by: string;
  church_id: string | null;
  group_id: string | null;
  reference: string | null;
  scripture_reference: string | null;
  track: Track | null;
  difficulty: Track;
  status: string;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: ProfileLite | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function StudySession() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("sessionId") || "";

  const [session, setSession] = useState<StudySessionRow | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  // Social
  const [isSharedSession, setIsSharedSession] = useState(false);
  const [participants, setParticipants] = useState<ProfileLite[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingSocial, setLoadingSocial] = useState(false);

  const track: Track = ((session?.track || session?.difficulty || "beginner") as Track) ?? "beginner";
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

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const updateResponse = (field: string, value: any) => setResponses((prev) => ({ ...prev, [field]: value }));

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

  // ---- Helpers for social access
  const loadMemberships = async (uid: string): Promise<{ groupIds: string[]; churchIds: string[] }> => {
    const [gm, cm] = await Promise.all([
      supabase.from("group_members").select("group_id").eq("user_id", uid),
      supabase.from("church_members").select("church_id").eq("user_id", uid),
    ]);

    if (gm.error) throw gm.error;
    if (cm.error) throw cm.error;

    const groupIds = (gm.data ?? []).map((r: any) => r.group_id).filter(Boolean);
    const churchIds = (cm.data ?? []).map((r: any) => r.church_id).filter(Boolean);
    return { groupIds, churchIds };
  };

  const canAccessSession = (sess: StudySessionRow, uid: string, memberships: { groupIds: string[]; churchIds: string[] }) => {
    if (sess.created_by === uid) return true;
    if (sess.group_id && memberships.groupIds.includes(sess.group_id)) return true;
    if (sess.church_id && memberships.churchIds.includes(sess.church_id)) return true;
    return false;
  };

  // Hydrate: session row + previous saved responses + social context
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
        const { data: sess, error: sessErr } = await supabase.from("study_sessions").select("*").eq("id", sessionId).single();
        if (sessErr) throw sessErr;

        const sessRow = sess as StudySessionRow;

        const memberships = await loadMemberships(user.id);
        const ok = canAccessSession(sessRow, user.id, memberships);
        if (!ok) throw new Error("You don’t have access to this study session.");

        setSession(sessRow);
        setIsSharedSession(!!sessRow.group_id || !!sessRow.church_id);

        // Load your saved responses
        const { data: r, error: rErr } = await supabase
          .from("study_session_responses")
          .select("id, responses, notes")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .eq("prompt_key", "__all__")
          .maybeSingle();

        if (rErr) throw rErr;

        if (r?.responses && typeof r.responses === "object") setResponses(r.responses as Record<string, any>);
        if (typeof r?.notes === "string") setResponses((prev) => ({ ...prev, notes: r.notes }));

        setHydrating(false);
      } catch (e: any) {
        setPageErr(e?.message ?? "Failed to load study session.");
        setHydrating(false);
      }
    };

    run();
  }, [loading, user, sessionId, supabase, navigate]);

  // Load participants + messages (social)
  useEffect(() => {
    const runSocial = async () => {
      if (!user?.id) return;
      if (!sessionId) return;
      if (!session) return;

      setLoadingSocial(true);
      try {
        // Participants: distinct responders + session creator
        const { data: responders, error: respErr } = await supabase
          .from("study_session_responses")
          .select("user_id")
          .eq("session_id", sessionId);

        if (respErr) throw respErr;

        const responderIds = Array.from(new Set((responders ?? []).map((r: any) => r.user_id).filter(Boolean)));
        const allIds = Array.from(new Set([session.created_by, ...responderIds].filter(Boolean)));

        if (allIds.length > 0) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id, display_name, email, avatar_url")
            .in("id", allIds);

          if (pErr) throw pErr;
          setParticipants((profs ?? []) as ProfileLite[]);
        } else {
          setParticipants([]);
        }

        // Messages
        const { data: msgs, error: mErr } = await supabase
          .from("study_session_messages")
          .select("id, session_id, user_id, body, created_at, profiles:profiles(id,display_name,email,avatar_url)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(200);

        if (mErr) {
          // If table doesn’t exist yet, don’t crash the page.
          // You’ll just see “Discussion unavailable”.
          setMessages([]);
        } else {
          setMessages((msgs ?? []) as any);
        }
      } catch {
        // Keep UI stable
      } finally {
        setLoadingSocial(false);
      }
    };

    runSocial();
  }, [user?.id, sessionId, session, supabase]);

  // Optional realtime for discussion (won’t break if not supported)
  useEffect(() => {
    if (!user?.id) return;
    if (!sessionId) return;

    const channel = supabase
      .channel(`study_session_messages:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_session_messages", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const row = payload.new as any;
          // Re-fetch a small tail to include profile join cleanly
          const { data } = await supabase
            .from("study_session_messages")
            .select("id, session_id, user_id, body, created_at, profiles:profiles(id,display_name,email,avatar_url)")
            .eq("id", row.id)
            .maybeSingle();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === (data as any).id)) return prev;
              return [...prev, data as any];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, sessionId, supabase]);

  const saveMutation = useMutation({
    mutationFn: async (markComplete: boolean) => {
      if (!user) throw new Error("Not authenticated.");
      if (!sessionId) throw new Error("Missing sessionId.");

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
        response: null as any,
      };

      if (existing?.id) {
        const { error: upErr } = await supabase.from("study_session_responses").update(payload).eq("id", existing.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("study_session_responses").insert(payload);
        if (insErr) throw insErr;
      }

      if (markComplete) {
        const { error: sessUpErr } = await supabase
          .from("study_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", sessionId);

        if (sessUpErr) throw sessUpErr;
      }
    },
    onSuccess: (_data, markComplete) => {
      if (markComplete) navigate("/studies", { replace: true });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated.");
      if (!sessionId) throw new Error("Missing sessionId.");
      const body = newMessage.trim();
      if (!body) return;

      const { error } = await supabase.from("study_session_messages").insert({
        session_id: sessionId,
        user_id: user.id,
        body,
      });

      if (error) throw error;
      setNewMessage("");
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

  const discussionAvailable = true; // UI flag; will gracefully degrade if table missing (messages list empty + send errors shown)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link to="/studies" className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back to Studies
          </Link>

          <h1 className="text-3xl font-serif font-bold mb-2">{reference || "Study Session"}</h1>
          <p className="text-amber-100 capitalize">{track} Track</p>

          {isSharedSession && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-3 py-2 text-sm">
              <Users className="h-4 w-4" />
              This is a shared session. You’ll see people + discussion below.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr,320px] gap-8">
        {/* Main column */}
        <div>
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

          {/* Prompts (unchanged) */}
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
            <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save Progress"
              )}
            </Button>

            <Button size="lg" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
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

        {/* Right column: Social */}
        <div className="space-y-6">
          {/* Participants */}
          <GradientCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-700" />
                <h3 className="font-bold text-slate-900">People</h3>
              </div>
              {loadingSocial && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              {isSharedSession ? "Participants in this shared session." : "This is your personal session."}
            </p>

            <div className="mt-4 space-y-3">
              {participants.length === 0 ? (
                <div className="text-sm text-slate-600">No participants yet.</div>
              ) : (
                participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-500">
                          {(p.display_name || p.email || "U").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {p.display_name || "User"}
                        {session?.created_by === p.id ? <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Host</span> : null}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{p.email || ""}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GradientCard>

          {/* Discussion */}
          <GradientCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-slate-700" />
              <h3 className="font-bold text-slate-900">Discussion</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Talk about what you’re seeing in the text. Ask questions. Encourage others.
            </p>

            {/* If you haven’t created the table yet, the list will simply be empty and sends will error */}
            {!discussionAvailable ? (
              <div className="text-sm text-slate-600">Discussion unavailable.</div>
            ) : (
              <>
                <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                  {messages.length === 0 ? (
                    <div className="text-sm text-slate-600">No messages yet. Start the conversation.</div>
                  ) : (
                    messages.map((m) => {
                      const me = m.user_id === user?.id;
                      const name = m.profiles?.display_name || m.profiles?.email || "User";
                      return (
                        <div key={m.id} className={cx("rounded-xl border p-3", me ? "bg-amber-50 border-amber-100" : "bg-white border-slate-200")}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-medium text-slate-700 truncate">{name}{me ? " (you)" : ""}</div>
                            <div className="text-[10px] text-slate-500">{formatWhen(m.created_at)}</div>
                          </div>
                          <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{m.body}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message…"
                    className="bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sendMessageMutation.isPending) sendMessageMutation.mutate();
                      }
                    }}
                  />
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={sendMessageMutation.isPending || newMessage.trim().length === 0}
                    aria-label="Send"
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {sendMessageMutation.isError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {(sendMessageMutation.error as any)?.message ?? "Failed to send message (did you create the study_session_messages table?)"}
                  </div>
                )}
              </>
            )}
          </GradientCard>
        </div>
      </div>
    </div>
  );
}
