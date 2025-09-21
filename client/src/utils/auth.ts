export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  linkedinUrl?: string;
};

export type Session = {
  user: User;
  accessToken: string;
};

const STORAGE_KEY = "prorate_session";

export const authStorage = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  save(session: Session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export const getApiBaseUrl = () =>
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";

export const startLinkedInLogin = () => {
  const base = getApiBaseUrl();
  // Passport strategy uses server-side configured callback; no need to pass redirect_uri
  window.location.href = `${base}/auth/linkedin/start`;
};

// Not needed with redirect-based Passport flow; kept for future popup/XHR approach
export const exchangeCodeForSession = async (
  _code: string,
  _state?: string
): Promise<Session> => {
  throw new Error("Not used: server redirects after callback and sets cookie");
};

export const logoutSession = async () => {
  try {
    const base = getApiBaseUrl();
    await fetch(`${base}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore network errors on logout
  } finally {
    authStorage.clear();
  }
};
