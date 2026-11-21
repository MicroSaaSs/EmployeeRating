export interface BrowserProfile {
  version: 1;
  linkedinProfileUrl: string;
  name: string;
  positions: Array<{ company: string; title: string; start: string; end: string }>;
}

const storageKey = "eprorate.browserImport";
export const browserImportToken = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function browserProfile(value: unknown): BrowserProfile {
  if (!value || typeof value !== "object") throw new Error("Invalid browser import.");
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || typeof data.name !== "string" || data.name.length > 150 ||
      typeof data.linkedinProfileUrl !== "string" || data.linkedinProfileUrl.length > 512 ||
      !Array.isArray(data.positions) || !data.positions.length || data.positions.length > 50) {
    throw new Error("This browser import is incomplete.");
  }
  const url = new URL(data.linkedinProfileUrl);
  if (url.origin !== "https://www.linkedin.com" || !/^\/in\/[^/]+\/$/.test(url.pathname) || url.search || url.hash || url.username || url.password) {
    throw new Error("The imported profile needs a LinkedIn profile link.");
  }
  const positions = data.positions.map(item => {
    if (!item || typeof item !== "object") throw new Error("Invalid work history in browser import.");
    for (const key of ["company", "title", "start", "end"]) {
      if (typeof item[key] !== "string" || item[key].length > 240 || item[key].includes("\0")) {
        throw new Error("Invalid work history in browser import.");
      }
    }
    if (!item.company.trim() || !item.title.trim()) throw new Error("An imported role needs a company and title.");
    return { company: item.company.trim(), title: item.title.trim(), start: item.start.trim(), end: item.end.trim() };
  });
  return { version: 1, linkedinProfileUrl: url.href, name: data.name.trim(), positions };
}

export function storeBrowserImport(token: string, profile: unknown) {
  if (!browserImportToken.test(token)) throw new Error("Invalid browser import link.");
  const record = { token, profile: browserProfile(profile), expiresAt: Date.now() + 15 * 60 * 1000 };
  sessionStorage.setItem(storageKey, JSON.stringify(record));
  return record;
}

export function pendingBrowserImport(token?: string) {
  try {
    const value = sessionStorage.getItem(storageKey);
    if (!value) return null;
    const record = JSON.parse(value);
    if (!browserImportToken.test(record.token) || typeof record.expiresAt !== "number" || record.expiresAt <= Date.now()) {
      sessionStorage.removeItem(storageKey);
      return null;
    }
    if (token && record.token !== token) return null;
    return { token: record.token as string, profile: browserProfile(record.profile) };
  } catch {
    return null;
  }
}

export function clearBrowserImport(token: string) {
  if (pendingBrowserImport(token)) sessionStorage.removeItem(storageKey);
}
