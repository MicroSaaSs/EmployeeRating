import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { exchangeCodeForSession } from "../utils/auth";
import { useAuth } from "../providers/AuthProvider";
import { authStorage } from "../utils/auth";

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state") || undefined;
    if (!code) {
      setError("Missing authorization code");
      return;
    }
    (async () => {
      try {
        const session = await exchangeCodeForSession(code, state);
        setSession(session);
        const from =
          (history.state && (history.state as any).usr?.from?.pathname) ||
          "/dashboard-home";
        navigate(from, { replace: true });
      } catch (e: any) {
        setError(e.message || "Authentication failed");
      }
    })();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="bg-surface border border-border rounded-lg p-6">
        {!error ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
            <span>Signing you in…</span>
          </div>
        ) : (
          <div className="text-error">
            <p className="font-medium mb-2">LinkedIn sign-in failed</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
