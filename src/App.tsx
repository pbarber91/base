import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppHeader from "@/components/layout/AppHeader";
import { AuthProvider } from "@/auth/AuthProvider";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
