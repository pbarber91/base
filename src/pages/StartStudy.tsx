// src/pages/StartStudy.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { BookOpen, ChevronRight, Sparkles, Compass, Mountain, Loader2, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";

type Track = "beginner" | "intermediate" | "advanced";
type StartMode = "solo" | "church" | "group";

type AdminMembership = {
  churches: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
  isGlobalAdmin: boolean;
};

function isUuidish(v: any) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function StartStudy() {
  const { user, supabase, loading } = useAuth();
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [track, setTrack] = useState<Track | "">("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // “Start with my church / group” state
  const [startMode, setStartMode] = useState<StartMode>("solo");
  const [selectedChurchId, setSelectedChurchId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

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

  // Admin gating for “Start with my church / group”
  const adminMembershipsQ = useQuery({
    queryKey: ["admin-memberships", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async (): Promise<AdminMembership> => {
      if (!user?.id) return { churches: [], groups: [], isGlobalAdmin: false };

      // Best-effort global-admin detection (won’t break if fields don’t exist)
      const meta: any = (user as any)?.user_metadata || {};
      const appMeta: any = (user as any)?.app_metadata || {};
      const isGlobalAdmin =
        !!meta?.is_global_admin ||
        !!appMeta?.is_global_admin ||
        meta?.role === "global_admin" ||
        appMeta?.role === "global_admin" ||
        meta?.role === "admin" ||
        appMeta?.role === "admin";

      // Church admin memberships (assumes a typical schema: church_members(user_id, church_id, role) )
      const cm = await supabase
        .from("church_members")
        .select("church_id, role")
        .eq("user_id", user.id);

      // Group admin memberships (assumes a typical schema: group_members(user_id, group_id, role) )
      const gm = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id);

      // If either table errors (schema mismatch), don’t block the whole page—just treat as no-admin.
      const churchAdminIds =
        cm.error || !Array.isArray(cm.data)
          ? []
          : (cm.data as any[])
              .filter((r) => {
                const role = (r?.role ?? "").toString().toLowerCase();
                return role === "admin" || role === "owner" || role === "leader";
              })
              .map((r) => r.church_id)
              .filter(isUuidish);

      const groupAdminIds =
        gm.error || !Array.isArray(gm.data)
          ? []
          : (gm.data as any[])
              .filter((r) => {
                const role = (r?.role ?? "").toString().toLowerCase();
                return role === "admin" || role === "owner" || role === "leader";
              })
              .map((r) => r.group_id)
              .filter(isUuidish);

      // Load names for dropdowns (optional, but nice)
      const [churchesRes, groupsRes] = await Promise.all([
        churchAdminIds.length
          ? supabase.from("churches").select("id,name").in("id", churchAdminIds).order("name", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        groupAdminIds.length
          ? supabase.from("groups").select("id,name").in("id", groupAdminIds).order("name", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const churches =
        churchesRes.error || !Array.isArray(churchesRes.data)
          ? []
          : (churchesRes.data as any[]).map((c) => ({ id: String(c.id), name: String(c.name ?? "Church") }));

      const groups =
        groupsRes.error || !Array.isArray(groupsRes.data)
          ? []
          : (groupsRes.data as any[]).map((g) => ({ id: String(g.id), name: String(g.name ?? "Group") }));

      return { churches, groups, isGlobalAdmin };
    },
    staleTime: 30_000,
  });

  const adminMemberships = adminMembershipsQ.data;
  const hasAnyAdminPower =
    !!adminMemberships?.isGlobalAdmin ||
    (adminMemberships?.churches?.length ?? 0) > 0 ||
    (adminMemberships?.groups?.length ?? 0) > 0;

  // Default select first available when switching modes
  React.useEffect(() => {
    if (!adminMemberships) return;

    if (startMode === "church") {
      if (!selectedChurchId && adminMemberships.churches.length > 0) setSelectedChurchId(adminMemberships.churches[0].id);
    }
    if (startMode === "group") {
      if (!selectedGroupId && adminMemberships.groups.length > 0) setSelectedGroupId(adminMemberships.groups[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMode, adminMemberships]);

  const canStartBase = reference.trim().length > 0 && !!track && !creating;

  const modeIsValid =
    startMode === "solo" ||
    (startMode === "church" && !!selectedChurchId && isUuidish(selectedChurchId)) ||
    (startMode === "group" && !!selectedGroupId && isUuidish(selectedGroupId));

  const canStart = canStartBase && modeIsValid;

  const handleStart = async () => {
    if (!user) {
      navigate("/get-started", { replace: true });
      return;
    }
    if (!track || !reference.trim()) return;

    // Guard: only allow church/group start if user is admin (or global admin)
    if ((startMode === "church" || startMode === "group") && !hasAnyAdminPower) {
      setErr("You don’t have permission to start a shared session for a church or group.");
      return;
    }

    if (startMode === "church" && !isUuidish(selectedChurchId)) {
      setErr("Please choose a church.");
      return;
    }
    if (startMode === "group" && !isUuidish(selectedGroupId)) {
      setErr("Please choose a group.");
      return;
    }

    setErr(null);
    setCreating(true);

    try {
      // Create a new study session row in Supabase
      const insertPayload: any = {
        created_by: user.id,
        reference: reference.trim(),
        scripture_reference: reference.trim(),
        track,
        difficulty: track, // enum matches beginner/intermediate/advanced
        status: "in_progress",
        started_at: new Date().toISOString(),
        // IMPORTANT: NEVER write "" into UUID columns (causes invalid uuid: "").
        church_id: startMode === "church" ? selectedChurchId : null,
        group_id: startMode === "group" ? selectedGroupId : null,
      };

      const { data, error } = await supabase
        .from("study_sessions")
        .insert(insertPayload)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    navigate("/get-started", { replace: true });
    return null;
  }

  const showSharedToggle = hasAnyAdminPower && ((adminMemberships?.churches?.length ?? 0) > 0 || (adminMemberships?.groups?.length ?? 0) > 0 || !!adminMemberships?.isGlobalAdmin);

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
        {/* Reference */}
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

        {/* Shared session toggle (admin-only) */}
        {showSharedToggle ? (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <GradientCard className="p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Users className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="font-semibold text-slate-900">Start with my church / group</div>
                    <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Shield className="h-3.5 w-3.5" />
                      Admin only
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    This keeps the exact same prompt system. It simply creates a shared session by setting <code>church_id</code> or <code>group_id</code>,
                    so it appears in <b>Shared with you</b> for members.
                  </p>
                </div>

                <div className="shrink-0">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={startMode !== "solo"}
                      onChange={(e) => {
                        if (!e.target.checked) setStartMode("solo");
                        else {
                          // prefer church if available, else group
                          const hasChurch = (adminMemberships?.churches?.length ?? 0) > 0;
                          setStartMode(hasChurch ? "church" : "group");
                        }
                      }}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <span className="text-sm text-slate-700">Shared</span>
                  </label>
                </div>
              </div>

              {startMode !== "solo" && (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Share with</Label>
                    <select
                      value={startMode}
                      onChange={(e) => setStartMode(e.target.value as StartMode)}
                      className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {(adminMemberships?.churches?.length ?? 0) > 0 && <option value="church">My Church</option>}
                      {(adminMemberships?.groups?.length ?? 0) > 0 && <option value="group">My Group</option>}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Members will see this session in <b>Studies → Shared with you</b>.
                    </p>
                  </div>

                  {startMode === "church" ? (
                    <div>
                      <Label className="text-sm">Choose church</Label>
                      <select
                        value={selectedChurchId}
                        onChange={(e) => setSelectedChurchId(e.target.value)}
                        className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {(adminMemberships?.churches ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-sm">Choose group</Label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {(adminMemberships?.groups ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </GradientCard>
          </motion.div>
        ) : null}

        {/* Tracks */}
        <div className="mb-7">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Choose Your Study Track</h2>
          <p className="text-sm text-slate-600 mb-4">Tracks don’t change the “truth”—they change the depth. You can always level up later.</p>

          <div className="grid md:grid-cols-3 gap-4">
            {tracks.map((t, i) => {
              const Icon = t.icon;
              const isSelected = track === t.id;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08 }}
                >
                  <button
                    onClick={() => setTrack(t.id)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 shadow-lg"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
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
          <Button size="lg" onClick={handleStart} disabled={!canStart} className="bg-amber-600 hover:bg-amber-700 text-lg px-8">
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

        {/* Soft hint if admin memberships are still loading */}
        {showSharedToggle && adminMembershipsQ.isLoading ? (
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading your church/group admin access…
          </div>
        ) : null}
      </div>
    </div>
  );
}
