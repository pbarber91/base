import * as React from "react";
import { Link } from "react-router-dom";
import { Shield, Settings, BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import GradientCard from "@/components/ui/GradientCard";

function getRole(user: any): string | null {
  return (
    user?.app_metadata?.role ??
    user?.user_metadata?.role ??
    user?.role ??
    null
  );
}

export default function AdminHub() {
  const { user, loading } = useAuth();

  const role = React.useMemo(() => getRole(user), [user]);
  const isAdmin = !!user && (role === "admin" || role === "super_admin");

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <GradientCard variant="warm" className="p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-800">
                Admin Hub
              </h1>
              <p className="text-slate-600 mt-2">
                You need to be signed in to access admin tools.
              </p>
            </div>
          </div>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">
            Admin Hub
          </h1>
          <p className="text-slate-600">
            Tools and dashboards based on your permissions.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Church Admin (often for church leaders) */}
        <Link to="/church-admin" className="group">
          <GradientCard variant="purple" className="p-6 h-full transition-shadow group-hover:shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800">Church Admin</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Manage your church profile, settings, and visibility.
                </p>
              </div>
            </div>
          </GradientCard>
        </Link>

        {/* Studies Admin (true admin) */}
        {isAdmin && (
          <Link to="/admin/studies" className="group">
            <GradientCard variant="warm" className="p-6 h-full transition-shadow group-hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">Admin Studies</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Create and publish scripture studies.
                  </p>
                </div>
              </div>
            </GradientCard>
          </Link>
        )}

        {/* Courses Admin (true admin) */}
        {isAdmin && (
          <Link to="/admin/courses" className="group">
            <GradientCard variant="sage" className="p-6 h-full transition-shadow group-hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">Admin Courses</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Build and manage courses for learners.
                  </p>
                </div>
              </div>
            </GradientCard>
          </Link>
        )}

        {!isAdmin && (
          <GradientCard variant="warm" className="p-6">
            <div className="text-slate-700 font-medium mb-1">
              Limited access
            </div>
            <div className="text-sm text-slate-600">
              You’re signed in, but don’t currently have admin permissions for
              Courses/Studies.
            </div>
            <div className="text-xs text-slate-500 mt-3">
              (Role detected: {role ?? "none"})
            </div>
          </GradientCard>
        )}
      </div>
    </div>
  );
}
