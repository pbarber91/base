// auth/RequireAuth.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export default function RequireAuth({
  children,
  requireAdmin = false,
}: {
  children: JSX.Element;
  requireAdmin?: boolean;
}) {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 🔑 FORCE onboarding if profile incomplete
  if (!profile?.profile_completed_at) {
    if (
      location.pathname !== "/get-started" &&
      location.pathname !== "/setup-profile"
    ) {
      return <Navigate to="/get-started" replace />;
    }
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
