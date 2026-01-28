// src/pages/ChurchAdmin.tsx
import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Building2, Loader2, Plus, Settings, Users, Mail } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ChurchAdmin() {
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);

  const { data: churches = [], isLoading } = useQuery({
    queryKey: ["churches"],
    queryFn: () => base44.entities.Church.list(),
  });

  const selectedChurch = useMemo(() => {
    if (!selectedChurchId) return null;
    return (churches as any[]).find((c: any) => String(c.id) === String(selectedChurchId)) ?? null;
  }, [churches, selectedChurchId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold">Church Admin</h1>
              <p className="text-slate-200 mt-1">Manage your church, members, and resources.</p>
            </div>

            {/* ✅ NEW entry point */}
            <Link to="/church-admin/invite">
              <Button className="bg-amber-600 hover:bg-amber-700 gap-2">
                <Mail className="h-4 w-4" />
                Invite Members
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : churches.length === 0 ? (
          <GradientCard variant="warm" className="p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                <Plus className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">No churches yet</h2>
                <p className="text-slate-600 mb-6">
                  Create a church to start managing courses, groups, and members.
                </p>
                <Link to={createPageUrl("CreateChurch")}>
                  <Button className="bg-amber-600 hover:bg-amber-700">Create Church</Button>
                </Link>
              </div>
            </div>
          </GradientCard>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GradientCard variant="warm" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-700" />
                    <h2 className="text-lg font-semibold text-slate-900">Your Churches</h2>
                  </div>
                  <Link to={createPageUrl("CreateChurch")}>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2">
                  {(churches as any[]).map((c: any) => {
                    const active = String(selectedChurchId) === String(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedChurchId(String(c.id))}
                        className={[
                          "w-full text-left p-3 rounded-xl border transition",
                          active
                            ? "bg-white border-amber-200 shadow-sm"
                            : "bg-white/60 border-slate-200 hover:bg-white",
                        ].join(" ")}
                      >
                        <div className="font-medium text-slate-900">{c.name}</div>
                        {c.city || c.state ? (
                          <div className="text-xs text-slate-500 mt-1">
                            {[c.city, c.state].filter(Boolean).join(", ")}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </GradientCard>

              <GradientCard variant="purple" className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-violet-700" />
                  <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
                </div>

                {!selectedChurch ? (
                  <div className="text-slate-600">Select a church to manage it.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600">
                      Managing: <span className="font-medium text-slate-900">{selectedChurch.name}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/church-admin/manage?churchId=${encodeURIComponent(String(selectedChurch.id))}`}>
                        <Button className="gap-2">
                          <Settings className="h-4 w-4" />
                          Manage Church
                        </Button>
                      </Link>

                      <Link to="/church-admin/invite">
                        <Button variant="outline" className="gap-2">
                          <Mail className="h-4 w-4" />
                          Invite Members
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </GradientCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
