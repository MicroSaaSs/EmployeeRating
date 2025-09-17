import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "../utils/auth";
import { authStorage, logoutSession, startLinkedInLogin } from "../utils/auth";

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
    setIsLoading(false);
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
