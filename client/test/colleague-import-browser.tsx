/** Browser integration regression: synthetic tab pixels and in-memory draft endpoints only. */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import ProfessionalSearchDiscovery from "../src/pages/professional-search-discovery";

const fixture = new Image(); fixture.src = "/__tab-test/experience.svg"; await fixture.decode();
const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 760;
const context = canvas.getContext("2d")!; context.drawImage(fixture, 0, 0);
setInterval(() => { context.fillStyle = "white"; context.fillRect(1198, 758, 1, 1); }, 250);
const tracks: MediaStreamTrack[] = [];
const calls: Array<{ path: string; method: string; body?: unknown }> = [];
const saved: unknown[] = [];
const nativeFetch = window.fetch.bind(window);
function notify() { window.dispatchEvent(new Event("fixture-state")); }
window.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, options);
  const method = options?.method ?? "GET";
  const body = typeof options?.body === "string" ? JSON.parse(options.body) : undefined;
  calls.push({ path: url.pathname, method, body }); notify();
  const json = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }));
  if (url.pathname === "/api/professionals/search") return json({ professionals: [], hasWorkHistory: true, hasMore: false });
  if (url.pathname === "/api/colleague-drafts/overlap" && method === "POST") return json({ matches: [{ company: "Example Company", start: "2021-01-01", end: "2024-12-31" }] });
  if (url.pathname === "/api/colleague-drafts") {
    if (method === "GET") return json(saved);
    if (method === "POST") { saved.push({ id: "fixture-draft", ...(body as object), invitationStatus: "draft" }); notify(); return json({ id: "fixture-draft" }, 201); }
  }
  throw new Error("Unexpected API call in isolated colleague-import test: " + method + " " + url.pathname);
};
Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", { configurable: true, value: async () => {
  const stream = canvas.captureStream(10); const track = stream.getVideoTracks()[0]; tracks.push(track);
  Object.defineProperty(track, "getSettings", { value: () => ({ displaySurface: "browser" }) });
  Object.defineProperty(track, "label", { value: "Sample colleague Experience (test pixels)" });
  notify(); return stream;
} });
document.addEventListener("click", event => { if ((event.target as HTMLElement).closest('a[target="_blank"]')) event.preventDefault(); });
function Harness() {
  const [state, setState] = useState("");
  useEffect(() => {
    const update = () => setState(JSON.stringify({ tracks: tracks.map(track => track.readyState), calls, savedDrafts: saved.length }, null, 2));
    window.addEventListener("fixture-state", update); return () => window.removeEventListener("fixture-state", update);
  }, []);
  return <><aside className="mx-auto max-w-5xl p-4 text-sm"><h1 className="font-semibold">Colleague import regression — sample data</h1><p>The shared tab and draft API are simulated. OCR uses the real local engine. No records are written to the application database.</p><button className="pilot-button-secondary mt-2" onClick={notify}>Check test state</button><details><summary>Test state</summary><pre aria-label="Isolated import test state">{state}</pre></details></aside>
    <MemoryRouter initialEntries={["/professional-search-discovery?q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fsample-colleague%2F"]}><ProfessionalSearchDiscovery /></MemoryRouter></>;
}
createRoot(document.querySelector("#root")!).render(<Harness />);
