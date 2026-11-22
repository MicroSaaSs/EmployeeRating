import { useEffect, useState } from "react";
import type { LinkedInSource } from "./linkedinPositions";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly retryAt?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body) headers.set("Content-Type", "application/json");
  const response = await fetch("/api" + path, { ...options, headers, credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("session-expired"));
    const body = await response.json().catch(() => null);
    const retryAt = typeof body?.retryAt === "string" ? Date.parse(body.retryAt) : NaN;
    throw new ApiError(typeof body?.message === "string" ? body.message : "That request failed. Try again.", response.status,
      Number.isFinite(retryAt) ? retryAt : undefined);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export function send<T = void>(path: string, method: string, body?: object) {
  return request<T>(path, { method, body: body && JSON.stringify(body) });
}

export const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

export function useResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ path: string; data?: T; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    request<T>(path, { signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setResult({ path, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setResult({ path, error: message(error) }); },
    );
    return () => controller.abort();
  }, [path, version]);

  return { ...(result?.path === path ? result : {}), refresh: () => setVersion((value) => value + 1) };
}

export interface Colleague {
  id: string;
  name: string;
  eligible: boolean;
  draft?: true;
  claimedByViewer?: true;
}

export interface WorkEntry {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string | null;
  linkedinSource?: LinkedInSource | null;
}

export interface SharedColleagueDraft {
  id: string;
  name: string;
  linkedinProfileUrl: string;
  revision: number;
  history: WorkEntry[];
  overlappingRoleIds?: string[];
  claim: { code: string; submitted: boolean } | null;
  invitedBy: string | null;
}

export const categories = ["technical", "communication", "leadership", "reliability", "teamwork"] as const;

export interface Rating {
  id: string;
  name: string;
  overall: number;
  categories: Partial<Record<(typeof categories)[number], number>>;
  feedback: string;
  anonymous: boolean;
  hidden: boolean;
  personId?: string;
  canOpenProfile?: boolean;
  reportStatus?: "open" | "dismissed" | null;
  opened?: boolean;
}

export const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
