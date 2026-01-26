// src/pages/ChurchAdmin.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

type ChurchRow = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  created_by?: string | null;
};

type ChurchMemberRow = {
  church_id: string;
  user_id: string;
  role?: string | null;
};

export default function ChurchAdmin() {
  const { data: authUser, isLoading: loadingUser } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not authenticated");
      return data.user;
    },
  });

  const { data: adminChurches = [], isLoading: loadingChurches } = useQuery({
    queryKey: ["admin_churches", authUser?.id],
    enabled: !!authUser,
    queryFn: async () => {
      // Find churches where I'm admin/owner/superadmin in church_members
      const { data: memberships, error: memErr } = await supabase
        .from("church_members")
        .select("church_id,user_id,role")
        .eq("user_id", authUser!.id);

      if (memErr) throw memErr;

      const adminChurchIds = (memberships ?? [])
        .filter((m: ChurchMemberRow) => {
          const role = (m.role || "").toLowerCase();
          return role === "admin" || role === "owner" || role === "superadmin";
        })
        .map((m: ChurchMemberRow) => m.church_id);

      if (adminChurchIds.length === 0) return [] as ChurchRow[];

      const { data: churches, error: chErr } = await supabase
        .from("churches")
        .select("id,name,description,location,website,logo_url,cover_image_url,created_by")
        .in("id", adminChurchIds)
        .order("name", { ascending: true });

      if (chErr) throw chErr;
      return (churches ?? []) as ChurchRow[];
    },
  });

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Church Admin</h1>
            <p className="text-sm text-slate-500">Manage the churches you administer</p>
          </div>

          <Link to={createPageUrl("CreateChurch")}>
            <Button className="bg-violet-600 hover:bg-violet-700">Create Church</Button>
          </Link>
        </div>

        {loadingChurches ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : adminChurches.length === 0 ? (
          <GradientCard variant="cool" className="p-8">
            <div className="text-slate-700">
              <p className="font-medium mb-2">No admin churches found.</p>
              <p className="text-sm text-slate-500 mb-4">
                You’ll see churches here when you’re listed in <code>church_members</code> as an admin/owner/superadmin.
              </p>
              <Link to={createPageUrl("CreateChurch")}>
                <Button className="bg-violet-600 hover:bg-violet-700">Create your first church</Button>
              </Link>
            </div>
          </GradientCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {adminChurches.map((c) => (
              <GradientCard key={c.id} variant="cool" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900/10 flex items-center justify-center overflow-hidden">
                    {c.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-semibold text-slate-800">{c.name?.[0]?.toUpperCase() ?? "C"}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                    {c.location && <p className="text-sm text-slate-500">{c.location}</p>}
                    {c.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{c.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      <Link to={`${createPageUrl("ChurchAdmin")}?church=${c.id}`}>
                        <Button variant="outline" className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </GradientCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
