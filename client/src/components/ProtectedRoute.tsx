import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import Header from "./ui/Header";

export default function ProtectedRoute() {
  const { session, isLoading, error } = useAuth();

  if (isLoading) return <p className="pilot-main" role="status">Checking your session…</p>;
  if (error) return <p className="pilot-main" role="alert">Could not check your session. Refresh to try again.</p>;
  if (!session) return <Navigate to="/login-register" replace />;
  return <><Header /><Outlet /></>;
}
