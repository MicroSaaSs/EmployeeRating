import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { message, request, send } from "../utils/api";

type Session = { user: { id: string; name: string; role: "participant" | "operator" } };

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  error: string;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const expire = () => setSession(null);
    window.addEventListener("session-expired", expire);
    request<Session | undefined>("/auth/session", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setSession(data ?? null); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(message(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => {
      controller.abort();
      window.removeEventListener("session-expired", expire);
    };
  }, []);

  async function logout() {
    await send("/auth/logout", "POST");
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, isLoading, error, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
