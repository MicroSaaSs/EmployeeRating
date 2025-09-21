import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "../utils/auth";
import {
  authStorage,
  logoutSession,
  startLinkedInLogin,
  getApiBaseUrl,
} from "../utils/auth";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  loginWithLinkedIn: () => void;
  logout: () => Promise<void>;
  setSession: (s: Session | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = authStorage.load();
    if (stored) setSession(stored);
    // also try to hydrate from server cookie session
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/session`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setSession({
              user: {
                id: data.user.id,
                name: `${data.user.firstName || ""} ${
                  data.user.lastName || ""
                }`.trim(),
                avatarUrl: data.user.avatar,
              },
              accessToken: "",
            });
            authStorage.save({
              user: {
                id: data.user.id,
                name: `${data.user.firstName || ""} ${
                  data.user.lastName || ""
                }`.trim(),
                avatarUrl: data.user.avatar,
              },
              accessToken: "",
            });
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const loginWithLinkedIn = () => startLinkedInLogin();
  const logout = async () => {
    await logoutSession();
    setSession(null);
  };

  const value = useMemo(
    () => ({ session, isLoading, loginWithLinkedIn, logout, setSession }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
