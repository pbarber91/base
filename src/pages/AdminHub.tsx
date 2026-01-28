import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";
import {
  Church,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  ArrowRight,
  Shield,
} from "lucide-react";

export default function AdminHub() {
  const { user, profile, isAdmin, loading } = useAuth();

  const role = useMemo(() => {
    const r =
      (profile as any)?.role ??
      (user as any)?.user_metadata?.role ??
      (user as any)?.app_metadata?.role ??
      "";
    return String(r || "").toLowerCase();
  }, [profile, user]);

  const isSuperAdmin = role === "superadmin" || role === "super_admin" || role === "owner";

  const hasChurchId = !!(profile as any)?.church_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Not signed in</h2>
          <p className="text-slate-600 mb-6">Please sign in to access admin tools.</p>
          <Link to={createPageUrl("Auth")}>
            <Button className="gap-2">
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Note: isAdmin is your “hard admin” gate (used by RequireAuth requireAdmin).
  // Church admin is separate and comes from church_members; we still show Church Admin entry if they have a church_id.
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Settings className="h-6 w-6" />
            </div>
            <Badge className="bg-white/10 text-white border-white/10">Admin Hub</Badge>
          </div>
          <h1 className="text-3xl font-serif font-bold">Administration</h1>
          <p className="text-slate-200 mt-2">
            Manage churches, people, courses, and studies.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Church Admin */}
          <GradientCard variant="purple" className="p-7">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Church className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-violet-100 text-violet-700 border-0">
                Church
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-5 mb-2">Church Admin</h2>
            <p className="text-slate-600 text-sm mb-6">
              Manage your church details and members.
            </p>

            <Link to="/church-admin">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 gap-2">
                Open Church Admin <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {!hasChurchId && (
              <p className="text-xs text-slate-500 mt-3">
                Tip: Set your church on your profile (or accept an invite) to see church tools.
              </p>
            )}
          </GradientCard>

          {/* Admin Courses */}
          <GradientCard variant="cool" className="p-7">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-sky-700" />
              </div>
              <Badge className="bg-sky-100 text-sky-700 border-0">Courses</Badge>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-5 mb-2">Course Admin</h2>
            <p className="text-slate-600 text-sm mb-6">
              Create, publish, and manage courses.
            </p>

            <Link to="/admin/courses">
              <Button disabled={!isAdmin} className="w-full gap-2">
                Manage Courses <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {!isAdmin && (
              <p className="text-xs text-slate-500 mt-3">
                Requires admin access.
              </p>
            )}
          </GradientCard>

          {/* Admin Studies */}
          <GradientCard variant="sage" className="p-7">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-emerald-700" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0">Studies</Badge>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-5 mb-2">Study Admin</h2>
            <p className="text-slate-600 text-sm mb-6">
              Create and manage scripture studies.
            </p>

            <Link to="/admin/studies">
              <Button disabled={!isAdmin} className="w-full gap-2">
                Manage Studies <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {!isAdmin && (
              <p className="text-xs text-slate-500 mt-3">
                Requires admin access.
              </p>
            )}
          </GradientCard>

          {/* User Admin (superadmin / owner only) */}
          <GradientCard variant="warm" className="p-7">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-700" />
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-0">
                Users
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-5 mb-2">User Admin</h2>
            <p className="text-slate-600 text-sm mb-6">
              View and edit user profiles, roles, and church associations.
            </p>

            <Link to="/admin/users">
              <Button disabled={!isAdmin} className="w-full gap-2">
                Open User Admin <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {!isSuperAdmin && (
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                <Shield className="h-4 w-4" />
                Intended for superadmin/owner workflows.
              </div>
            )}
          </GradientCard>
        </div>
      </div>
    </div>
  );
}
