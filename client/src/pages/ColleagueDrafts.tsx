import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { message, send, useResource } from "../utils/api";
import { linkedInPosition, type LinkedInPosition } from "../utils/linkedinPositions";
import { clearBrowserImport, pendingBrowserImport } from "../utils/browserImport";
import LinkedInTabImport, { type LinkedInTabProfile } from "../components/LinkedInTabImport";

interface Draft {
  id: string;
  name: string;
  linkedinProfileUrl: string;
  history: Array<{ company: string; title: string; start: string; end: string | null }>;
  invitationStatus: "draft" | "requested" | "issued" | "redeemed" | "expired" | "revoked";
}

const statusLabels = {
  draft: "Private draft",
  requested: "Invitation requested from a pilot operator",
  issued: "Invitation prepared by a pilot operator",
  redeemed: "Invitation redeemed",
  expired: "Invitation expired",
  revoked: "Invitation revoked",
};

export default function ColleagueDrafts({ embedded = false, initialUrl = "" }: { embedded?: boolean; initialUrl?: string }) {
  const [params, setParams] = useSearchParams();
  const [url, setUrl] = useState(initialUrl || params.get("link") || "");
  const [name, setName] = useState("");
  const [positions, setPositions] = useState<LinkedInPosition[]>([]);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [matches, setMatches] = useState<Array<{ company: string; start: string; end: string }>>();
  const [sourceLabel, setSourceLabel] = useState("PDF");
  const [editing, setEditing] = useState<Draft>();
  const formRef = useRef<HTMLFormElement>(null);
  const importToken = embedded ? "" : params.get("import") ?? "";
  const drafts = useResource<Draft[]>("/colleague-drafts");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!importToken) return;
    const imported = pendingBrowserImport(importToken);
    if (!imported) {
      setError("This browser import has expired. Import the LinkedIn profile again.");
      return;
    }
    setUrl(imported.profile.linkedinProfileUrl);
    setName(imported.profile.name);
    setPositions(imported.profile.positions.map((role, index) =>
      linkedInPosition(index, role.company, role.title, role.start, role.end)));
    setSourceLabel("LinkedIn browser import");
    setMatches(undefined);
    setError("");
  }, [importToken]);

  async function importPdf(file: File) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose a PDF smaller than 2 MB.");
      const { readLinkedInColleagueProfile } = await import("../utils/linkedinProfile");
      const imported = await readLinkedInColleagueProfile(file);
      if (imported.positions.length > 50) throw new Error("Choose a profile with up to 50 roles.");
      setName(imported.name);
      setPositions(imported.positions);
      setFileName(file.name);
      setSourceLabel("PDF");
      setMatches(undefined);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function acceptTabProfile(profile: LinkedInTabProfile) {
    setUrl(profile.linkedinProfileUrl);
    setName("");
    setPositions(profile.positions.map((role, index) => ({
      ...linkedInPosition(index, role.company, role.title, role.start, role.end), needsReview: role.needsReview ?? false,
    })));
    setFileName(""); setSourceLabel("Shared LinkedIn tab"); setMatches(undefined); setError("");
    setNotice("Work history captured. Enter your colleague’s name and review each role before checking shared dates or saving a private draft.");
  }

  function editDraft(draft: Draft) {
    setEditing(draft);
    setUrl(draft.linkedinProfileUrl);
    setName(draft.name);
    setPositions(draft.history.map((role, index) => linkedInPosition(index, role.company, role.title, role.start, role.end || "")));
    setFileName(""); setSourceLabel("Saved draft"); setMatches(undefined); setError(""); setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditing(undefined); setPositions([]); setName(""); setUrl("");
    setFileName(""); setMatches(undefined); setError(""); setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      await send("/colleague-drafts", "POST", {
        name, linkedinProfileUrl: url,
        history: positions.map(position => ({ ...position.entry, end: position.entry.end || null })),
      });
      setPositions([]);
      setFileName("");
      setName("");
      setNotice(editing ? "Private colleague draft updated." : embedded ? "Private colleague draft saved. Open My private colleague drafts to view it or request an invitation." : "Private colleague draft saved. You can request an invitation below.");
      setEditing(undefined);
      setMatches(undefined);
      if (importToken) {
        clearBrowserImport(importToken);
        setParams({});
      }
      drafts.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function updateDraft(draft: Draft, remove = false) {
    if (remove && !window.confirm("Delete this private colleague draft?")) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await send("/colleague-drafts/" + draft.id + (remove ? "" : "/invitation"), remove ? "DELETE" : "POST");
      setNotice(remove ? "Private draft deleted." : "Invitation requested. A pilot operator can prepare a link to share with your colleague.");
      drafts.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function changePosition(id: number, field: keyof LinkedInPosition["entry"], value: string) {
    setMatches(undefined);
    setPositions(current => current.map(position => position.id === id
      ? { ...position, entry: { ...position.entry, [field]: value } } : position));
  }

  async function checkOverlap(form: HTMLFormElement) {
    if (!form.reportValidity()) return;
    setPending(true);
    setError("");
    setMatches(undefined);
    try {
      const result = await send<{ matches: Array<{ company: string; start: string; end: string }> }>("/colleague-drafts/overlap", "POST", {
        name, linkedinProfileUrl: url, history: positions.map(position => ({ ...position.entry, end: position.entry.end || null })),
      });
      setMatches(result.matches);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  const Container = embedded ? "section" : "main";
  return <Container className={embedded ? "" : "pilot-main"}>
    {!embedded && <>
      <Link className="pilot-link" to="/professional-search-discovery">Back to colleagues</Link>
      <h1 className="pilot-title mt-5">Private colleague drafts</h1>
    </>}
    <p className="mt-2 max-w-2xl text-sm text-slate-600">Read a colleague’s LinkedIn tab or import their saved PDF, then review their details. Drafts are private to you. Checking shared dates uses the history you review; a draft does not make someone eligible to rate.</p>
    {(error || drafts.error) && <p className="mt-4 text-red-800" role="alert">{error || drafts.error}</p>}
    {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
    {embedded && <Link className="pilot-link mt-2 inline-block text-sm" to="/colleague-drafts">My private colleague drafts</Link>}
    <form ref={formRef} className={embedded ? "mt-4" : "pilot-card mt-6"} onSubmit={save}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <legend className="text-lg font-semibold">{editing ? "Edit private colleague draft" : "Import a colleague"}</legend>
        {editing && <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Update {editing.name}’s details, then save your changes. The profile link stays attached to this draft.</p>
          <button type="button" className="pilot-button-secondary" onClick={cancelEdit}>Cancel editing</button>
        </div>}
        <label className="block text-sm font-medium">LinkedIn profile link
          <input className="pilot-field mt-1" value={url} maxLength={512} required inputMode="url" readOnly={!!editing}
            placeholder="https://www.linkedin.com/in/your-colleague/" onChange={event => { setUrl(event.target.value); setMatches(undefined); }} />
        </label>
        {!editing && <>
        <LinkedInTabImport url={url} disabled={pending} subject="colleague" onImported={acceptTabProfile} />
        <h2 className="border-t border-border pt-4 text-sm font-semibold">Or import a saved PDF</h2>
        <p className="text-sm text-slate-600">Open their LinkedIn profile on desktop and choose More or Resources, then Save to PDF. The file is read in your browser.</p>
        <label className="block text-sm font-medium">
          <span id="colleague-pdf-label">Saved LinkedIn profile PDF</span>
          <span className="pilot-file mt-1">
            <input className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" accept=".pdf,application/pdf"
              aria-labelledby="colleague-pdf-label" onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importPdf(file);
              }} />
            <span aria-hidden="true" className="shrink-0 rounded-md bg-primary-50 px-3 py-2 font-semibold text-primary">
              {fileName ? "Replace PDF" : "Choose PDF"}
            </span>
            <span className="min-w-0 truncate text-slate-600" role="status">{pending ? "Working…" : fileName || "No PDF selected"}</span>
          </span>
        </label>
        </>}
        {positions.length > 0 && <>
          <label className="block text-sm font-medium">Colleague name
            <input className="pilot-field mt-1" required value={name} maxLength={150} onChange={event => setName(event.target.value)} />
          </label>
          <p className="text-sm text-slate-600">Check the name and work dates. Estimated dates use the first or last day of the month or year shown in the source.</p>
          <div className="space-y-4">
            {positions.map(position => <div key={position.id} className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm text-slate-600">{sourceLabel} dates · {position.originalStart || "Missing start"} to {position.originalEnd || "present"}</p>
              {position.needsReview && <p className="text-sm font-medium text-amber-900">This heading was unclear. Check the company, job title and dates before saving.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Company<input className="pilot-field mt-1" required maxLength={120} value={position.entry.company} onChange={event => changePosition(position.id, "company", event.target.value)} /></label>
                <label className="text-sm font-medium">Job title<input className="pilot-field mt-1" required maxLength={120} value={position.entry.title} onChange={event => changePosition(position.id, "title", event.target.value)} /></label>
                <label className="text-sm font-medium">Start date<input className="pilot-field mt-1" required type="date" max={today} value={position.entry.start} onChange={event => changePosition(position.id, "start", event.target.value)} /></label>
                <label className="text-sm font-medium">End date<input className="pilot-field mt-1" required={position.endRequired} type="date" min={position.entry.start} max={today} value={position.entry.end} onChange={event => changePosition(position.id, "end", event.target.value)} /></label>
              </div>
              {(!editing || positions.length > 1) && <button type="button" className="pilot-link text-sm" onClick={() => {
                setPositions(current => current.filter(item => item.id !== position.id));
                setMatches(undefined);
              }}>Exclude this role</button>}
            </div>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="pilot-button-secondary" onClick={event => void checkOverlap(event.currentTarget.form!)}>Check shared work dates</button>
            <button className="pilot-button">{editing ? "Save changes" : "Save private draft"}</button>
          </div>
          {matches && <section className="rounded-lg bg-primary-50 p-4 text-sm" aria-labelledby="draft-overlap-heading">
            <h2 id="draft-overlap-heading" className="font-semibold">Shared work dates</h2>
            {matches.length ? <ul className="mt-2 space-y-2">{matches.map(match => <li key={match.company + match.start + match.end}>
              <p className="font-medium">{match.company}</p><p>{match.start} to {match.end}</p>
            </li>)}</ul> : <p className="mt-2">No overlapping work dates found. Check both the company names and dates.</p>}
            <p className="mt-2 text-slate-600">Based on your saved work history and the draft dates you reviewed.</p>
          </section>}
        </>}
      </fieldset>
    </form>
    {!embedded && <section className="mt-7" aria-labelledby="saved-drafts-heading">
      <h2 id="saved-drafts-heading" className="text-xl font-semibold">Saved drafts</h2>
      {!drafts.data && !drafts.error && <p className="mt-3" role="status">Loading drafts…</p>}
      {drafts.data?.length === 0 && <p className="mt-3 text-slate-600">You have no saved colleague drafts.</p>}
      <ul className="mt-3 space-y-4">
        {drafts.data?.map(draft => <li key={draft.id} className="pilot-card">
          <h3 className="text-lg font-semibold">{draft.name}</h3>
          <a className="pilot-link mt-1 inline-block break-all text-sm" href={draft.linkedinProfileUrl} rel="noreferrer" target="_blank">Open LinkedIn profile</a>
          <p className="mt-2 text-sm text-slate-600">{statusLabels[draft.invitationStatus]}</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Reviewed work history</summary>
            <ul className="mt-2 space-y-2">{draft.history.map((role, index) => <li key={index}>
              <p className="font-medium">{role.title} · {role.company}</p>
              <p className="text-slate-600">{role.start} to {role.end || "present"}</p>
            </li>)}</ul>
          </details>
          <div className="mt-4 flex flex-wrap gap-3">
            {draft.invitationStatus === "draft" &&
              <button type="button" className="pilot-button-secondary" disabled={pending || positions.length > 0 || !!editing} onClick={() => editDraft(draft)}>Edit draft</button>}
            {["draft", "expired", "revoked"].includes(draft.invitationStatus) &&
              <button type="button" className="pilot-button-secondary" disabled={pending || !!editing} onClick={() => void updateDraft(draft)}>Request invitation</button>}
            <button type="button" className="pilot-link text-sm" disabled={pending || !!editing} onClick={() => void updateDraft(draft, true)}>Delete draft</button>
          </div>
        </li>)}
      </ul>
    </section>}
  </Container>;
}
