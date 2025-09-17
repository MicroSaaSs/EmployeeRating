import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

type Props = { children: React.ReactElement };

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/login-register" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
