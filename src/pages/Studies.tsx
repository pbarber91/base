// src/pages/Studies.tsx
import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { BookOpen, Plus, Loader2, ArrowRight, Users } from "lucide-react";
import { motion } from "framer-motion";

type StudySessionRow = {
  id: string;
  created_by: string;
  church_id: string | null;
  group_id: string | null;
  study_id: string | null;
  reference: string | null;
  scripture_reference: string | null;
  track: "beginner" | "intermediate" | "advanced" | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  church_id: string | null;
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

function prettyTrack(track: any) {
  const t = (track || "").toString().toLowerCase();
  if (t === "beginner") return "Beginner";
  if (t === "intermediate") return "Intermediate";
  if (t === "advanced") return "Advanced";
  return "Beginner";
}

function isCompleted(s: StudySessionRow) {
  return (s.status || "").toLowerCase() === "completed" || !!s.completed_at;
}

function getReference(s: StudySessionRow) {
  return s.reference || s.scripture_reference || "Study Session";
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export default function Studies() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();

  const openSession = (id: string) => navigate(`/study-session?sessionId=${encodeURIComponent(id)}`);

  // 1) Your sessions
  const mySessionsQ = useQuery({
    queryKey: ["my-study-sessions", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async (): Promise<StudySessionRow[]> => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "id,created_by,church_id,group_id,study_id,reference,scripture_reference,track,difficulty,status,started_at,completed_at,created_at,updated_at"
        )
        .eq("created_by", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudySessionRow[];
    },
    staleTime: 15_000,
  });

  // 2) Active church (from profiles.church_id) + optional membership tables if they exist
  const membershipsQ = useQuery({
    queryKey: ["study-memberships", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async (): Promise<{ groupIds: string[]; churchIds: string[] }> => {
      if (!user?.id) return { groupIds: [], churchIds: [] };

      // Always read profiles.church_id (this is your “active church” today)
      const prof = await supabase
        .from("profiles")
        .select("id,church_id")
        .eq("id", user.id)
        .maybeSingle();

      if (prof.error) throw prof.error;
      const profile = (prof.data ?? null) as ProfileRow | null;

      const safeIds = async (table: string, col: string) => {
        const { data, error } = await supabase.from(table).select(col).eq("user_id", user.id);
        if (error) {
          // If table doesn't exist (common during transition), treat as empty.
          const msg = (error as any)?.message?.toString()?.toLowerCase?.() ?? "";
          if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42p01")) {
            return [] as string[];
          }
          throw error;
        }
        return (data ?? []).map((r: any) => r[col]).filter(Boolean) as string[];
      };

      const [groupIds, churchMemberIds] = await Promise.all([
        safeIds("group_members", "group_id"),
        safeIds("church_members", "church_id"),
      ]);

      const churchIds = uniq([...(churchMemberIds ?? []), ...(profile?.church_id ? [profile.church_id] : [])]);

      return { groupIds: uniq(groupIds ?? []), churchIds };
    },
    staleTime: 30_000,
  });

  // 3) Shared sessions: sessions tied to a group/church you belong to (including your profile church_id)
  const sharedSessionsQ = useQuery({
    queryKey: ["shared-study-sessions", user?.id, membershipsQ.data?.groupIds, membershipsQ.data?.churchIds],
    enabled: !!user?.id && !loading && !!membershipsQ.data,
    queryFn: async (): Promise<StudySessionRow[]> => {
      const groupIds = membershipsQ.data?.groupIds ?? [];
      const churchIds = membershipsQ.data?.churchIds ?? [];

      if (groupIds.length === 0 && churchIds.length === 0) return [];

      let query = supabase
        .from("study_sessions")
        .select(
          "id,created_by,church_id,group_id,study_id,reference,scripture_reference,track,difficulty,status,started_at,completed_at,created_at,updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(50);

      const orParts: string[] = [];
      if (groupIds.length > 0) orParts.push(`group_id.in.(${groupIds.join(",")})`);
      if (churchIds.length > 0) orParts.push(`church_id.in.(${churchIds.join(",")})`);
      if (orParts.length > 0) query = query.or(orParts.join(","));

      // Don’t show duplicates of your own personal sessions in “Shared”
      // BUT if you started a church/group session yourself, it's still helpful to show it in Shared.
      // We'll only filter out your sessions that have no group/church linkage.
      query = query.neq("created_by", ""); // no-op guard

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as StudySessionRow[];

      const filtered = rows.filter((s) => {
        const isMine = s.created_by === user!.id;
        const isLinked = !!s.group_id || !!s.church_id;
        if (isMine && !isLinked) return false;
        return true;
      });

      return filtered.sort((a, b) => {
        const ac = isCompleted(a) ? 1 : 0;
        const bc = isCompleted(b) ? 1 : 0;
        if (ac !== bc) return ac - bc;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    },
    staleTime: 15_000,
  });

  const mySessions = mySessionsQ.data ?? [];
  const sharedSessions = sharedSessionsQ.data ?? [];

  const { myActive, myHistory } = useMemo(() => {
    const active = mySessions.filter((s) => !isCompleted(s));
    const history = mySessions.filter((s) => isCompleted(s));
    return { myActive: active, myHistory: history };
  }, [mySessions]);

  const isBusy = loading || mySessionsQ.isLoading || membershipsQ.isLoading || sharedSessionsQ.isLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

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
              <span className="text-amber-100 font-medium">Studies</span>
            </div>

            <h1 className="text-4xl font-serif font-bold mb-3">Learn how to study Scripture</h1>

            <p className="text-lg text-amber-100 leading-relaxed">
              A Study is a guided walk through a passage using fixed prompts. You pick a reference and a track (Beginner / Intermediate / Advanced),
              then work through the questions and save your progress.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link to="/start-study">
                <Button className="bg-white text-amber-700 hover:bg-amber-50">
                  <Plus className="h-5 w-5 mr-2" />
                  Start a Study
                </Button>
              </Link>

              <div className="hidden sm:flex items-center text-amber-100/90 text-sm">
                You can come back anytime to continue where you left off.
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {isBusy && (
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading studies…
          </div>
        )}

        {/* Continue */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Continue</h2>
              <p className="text-sm text-slate-600">Your in-progress studies.</p>
            </div>
            <Link to="/start-study">
              <Button variant="outline">New Study</Button>
            </Link>
          </div>

          {myActive.length === 0 ? (
            <GradientCard className="p-6">
              <div className="text-slate-800 font-semibold mb-1">No in-progress studies</div>
              <div className="text-sm text-slate-600 mb-4">Start a new study and it will show up here.</div>
              <Link to="/start-study">
                <Button className="bg-amber-600 hover:bg-amber-700">Start a Study</Button>
              </Link>
            </GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myActive.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <button onClick={() => openSession(s.id)} className="w-full text-left" aria-label={`Resume ${getReference(s)}`}>
                    <GradientCard className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{getReference(s)}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {prettyTrack(s.track || s.difficulty)} • Started {formatWhen(s.started_at)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Last updated {formatWhen(s.updated_at)}</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      </div>
                    </GradientCard>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Your Study History</h2>
          <p className="text-sm text-slate-600 mb-4">Completed and past studies (for reflection).</p>

          {myHistory.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">Nothing completed yet.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myHistory.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <button onClick={() => openSession(s.id)} className="w-full text-left">
                    <GradientCard className="p-5 hover:shadow-md transition-shadow">
                      <div className="font-semibold text-slate-900 truncate">{getReference(s)}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {prettyTrack(s.track || s.difficulty)} • Completed {s.completed_at ? formatWhen(s.completed_at) : "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Last updated {formatWhen(s.updated_at)}</div>
                    </GradientCard>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Shared */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Shared with you</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Sessions tied to a group or your selected church (from your profile) so you can connect with others doing the same study.
          </p>

          {sharedSessions.length === 0 ? (
            <GradientCard className="p-6 text-sm text-slate-600">Nothing shared yet.</GradientCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedSessions.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <button onClick={() => openSession(s.id)} className="w-full text-left">
                    <GradientCard className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{getReference(s)}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {prettyTrack(s.track || s.difficulty)} • Updated {formatWhen(s.updated_at)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {s.group_id ? "Group session" : s.church_id ? "Church session" : "Shared session"}
                            {s.created_by === user?.id ? " • Started by you" : ""}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      </div>
                    </GradientCard>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Errors */}
        {(mySessionsQ.isError || membershipsQ.isError || sharedSessionsQ.isError) && (
          <div className={cx("rounded-xl border p-4 text-sm", "border-rose-200 bg-rose-50 text-rose-800")}>
            {(mySessionsQ.error as any)?.message ||
              (membershipsQ.error as any)?.message ||
              (sharedSessionsQ.error as any)?.message ||
              "Failed to load studies."}
          </div>
        )}
      </div>
    </div>
  );
}
