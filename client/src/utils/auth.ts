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
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

export const startLinkedInLogin = () => {
  const base = getApiBaseUrl();
  const redirectUri = encodeURIComponent(
    window.location.origin + "/auth/callback"
  );
  window.location.href = `${base}/auth/linkedin/start?redirect_uri=${redirectUri}`;
};

export const exchangeCodeForSession = async (
  code: string,
  state?: string
): Promise<Session> => {
  const base = getApiBaseUrl();
  const resp = await fetch(`${base}/auth/linkedin/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      state,
      redirectUri: window.location.origin + "/auth/callback",
    }),
    credentials: "include",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Failed to authenticate with LinkedIn");
  }
  const session = (await resp.json()) as Session;
  authStorage.save(session);
  return session;
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
