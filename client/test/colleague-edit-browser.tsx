/** Isolated browser regression: seeded sample drafts, in-memory API, no application records. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import ColleagueDrafts from "../src/pages/ColleagueDrafts";

const drafts = [
  { id: "editable", name: "Sample Colleague", linkedinProfileUrl: "https://www.linkedin.com/in/sample-colleague/", invitationStatus: "draft",
    history: [{ company: "Example Company", title: "Engineer", start: "2021-02-17", end: null },
      { company: "Earlier Company", title: "Developer", start: "2018-03-12", end: "2020-11-26" }] },
  { id: "requested", name: "Requested Colleague", linkedinProfileUrl: "https://www.linkedin.com/in/requested-colleague/", invitationStatus: "requested",
    history: [{ company: "Other Company", title: "Engineer", start: "2020-01-01", end: null }] },
];
const calls: Array<{ path: string; method: string; body?: unknown }> = [];
let conflict = false;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, options);
  const method = options?.method ?? "GET";
  const body = typeof options?.body === "string" ? JSON.parse(options.body) : undefined;
  calls.push({ path: url.pathname, method, body });
  const json = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }));
  if (url.pathname === "/api/colleague-drafts/overlap" && method === "POST") return json({ matches: [{ company: "Example Company", start: body.history[0].start, end: "2022-12-31" }] });
  if (url.pathname === "/api/colleague-drafts") {
    if (method === "GET") return json(drafts);
    if (method === "POST") {
      if (conflict) return json({ message: "This colleague already has an invitation request. View the saved draft." }, 409);
      const draft = drafts.find(item => item.linkedinProfileUrl === body.linkedinProfileUrl);
      if (!draft) throw Error("Editing must update the existing profile, not insert another draft.");
      Object.assign(draft, body);
      return json({ id: draft.id }, 201);
    }
  }
  throw Error("Unexpected API write in isolated draft editor: " + method + " " + url.pathname);
};

function Harness() {
  const [state, setState] = useState("");
  return <><aside className="mx-auto max-w-5xl p-4 text-sm">
    <h1 className="font-semibold">Private draft editing regression — sample data</h1>
    <p>All API requests use in-memory fixtures. No application database writes, invitations or native tab sharing.</p>
    <div className="mt-2 flex gap-3">
      <button className="pilot-button-secondary" onClick={() => setState(JSON.stringify({ drafts, calls }, null, 2))}>Show test state</button>
      <button className="pilot-button-secondary" onClick={() => { conflict = !conflict; setState("Invitation conflict: " + conflict); }}>Toggle invitation conflict</button>
    </div><pre aria-label="Draft editing test state" className="mt-3 whitespace-pre-wrap">{state}</pre>
  </aside><MemoryRouter><ColleagueDrafts /></MemoryRouter></>;
}
createRoot(document.querySelector("#root")!).render(<Harness />);
