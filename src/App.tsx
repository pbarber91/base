// src/App.tsx
import React, { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import AppHeader from "@/components/layout/AppHeader";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import RequireAuth from "@/auth/RequireAuth";
import ChurchManage from "./pages/ChurchManage";

import Home from "./pages/Home";
import GetStarted from "./pages/GetStarted";
import SetupProfile from "./pages/SetupProfile";
import Profile from "./pages/Profile";
import Login from "./pages/login";
import AdminHub from "./pages/AdminHub";

import Studies from "./pages/Studies";
import StudyDetail from "./pages/StudyDetail";
import StartStudy from "./pages/StartStudy";
import StudySession from "./pages/StudySession";

import Courses from "./pages/courses";
import CourseDetail from "./pages/CourseDetail";

import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import CreateGroup from "./pages/CreateGroup";

import Community from "./pages/Community";

import CreateChurch from "./pages/CreateChurch";
import ChurchAdmin from "./pages/ChurchAdmin";

import AdminCourses from "./pages/AdminCourses";
import CourseBuilder from "./pages/CourseBuilder";
import AdminStudies from "./pages/AdminStudies";
import StudyBuilder from "./pages/StudyBuilder";
import Auth from "./pages/Auth";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function OnboardingGate() {
  const { user, supabase, loading } = useAuth();
  const location = useLocation();

  const allowPaths = useMemo(() => {
    // Don’t gate the auth/onboarding screens themselves
    return new Set<string>(["/auth", "/login", "/get-started", "/setup-profile"]);
  }, []);

  const shouldGate = !!user && !allowPaths.has(location.pathname);

  const { data: hasProfile, isLoading } = useQuery({
    queryKey: ["has-profile", user?.id],
    enabled: !!user?.id && shouldGate,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return !!data?.id;
    },
  });

  // While auth is initializing, do nothing
  if (loading) return <Outlet />;

  // Not logged in => no gate
  if (!user) return <Outlet />;

  // Logged in but we're not gating this path
  if (!shouldGate) return <Outlet />;

  // Logged in + gating path: wait for profile check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  // Logged in + no profile => force onboarding
  if (!hasProfile) {
    return <Navigate to="/get-started" replace />;
  }

  // Has profile => proceed
  return <Outlet />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Gate everything inside layout */}
            <Route element={<AppLayout />}>
              <Route element={<OnboardingGate />}>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<AdminHub />} />

                <Route path="/login" element={<Login />} />
                <Route path="/get-started" element={<GetStarted />} />
                <Route path="/setup-profile" element={<SetupProfile />} />
                <Route path="/profile" element={<Profile />} />

                <Route path="/church-admin/manage" element={<RequireAuth><ChurchManage /></RequireAuth>} />

                <Route path="/studies" element={<Studies />} />
                <Route path="/study" element={<StudyDetail />} />
                <Route path="/start-study" element={<StartStudy />} />
                <Route path="/study-session" element={<StudySession />} />
                <Route path="/auth" element={<Auth />} />

                <Route path="/courses" element={<Courses />} />
                <Route path="/course" element={<CourseDetail />} />

                <Route path="/groups" element={<Groups />} />
                <Route path="/group" element={<GroupDetail />} />
                <Route path="/create-group" element={<CreateGroup />} />

                <Route path="/community" element={<Community />} />

                <Route path="/create-church" element={<CreateChurch />} />
                <Route
                  path="/church-admin"
                  element={
                    <RequireAuth>
                      <ChurchAdmin />
                    </RequireAuth>
                  }
                />

                {/* Hard-protected admin routes */}
                <Route
                  path="/admin/courses"
                  element={
                    <RequireAuth requireAdmin>
                      <AdminCourses />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/course-builder"
                  element={
                    <RequireAuth requireAdmin>
                      <CourseBuilder />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/studies"
                  element={
                    <RequireAuth requireAdmin>
                      <AdminStudies />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/study-builder"
                  element={
                    <RequireAuth>
                      <StudyBuilder />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
