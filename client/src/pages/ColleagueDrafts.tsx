import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { message, send, useResource, type SharedColleagueDraft } from "../utils/api";
import { linkedInPosition, type LinkedInPosition } from "../utils/linkedinPositions";
import { clearBrowserImport, pendingBrowserImport } from "../utils/browserImport";
import LinkedInTabImport, { type LinkedInTabProfile } from "../components/LinkedInTabImport";
import SharedWorkDatesTag from "../components/SharedWorkDatesTag";
import ColleagueInvitationLink from "../components/ColleagueInvitationLink";

interface Draft {
  id: string;
  name: string;
  linkedinProfileUrl: string;
  history: Array<{ company: string; title: string; start: string; end: string | null }>;
  overlappingRoleIndexes?: number[];
  canEdit?: boolean;
  invitationId?: string | null;
  invitationStatus: "draft" | "requested" | "issued" | "redeemed" | "expired" | "revoked";
}

const statusLabels = {
  draft: "Private draft",
  requested: "Private draft",
  issued: "Invitation link created",
  redeemed: "Invitation accepted",
  expired: "Invitation link expired",
  revoked: "Invitation link revoked",
};

function DraftEditor({ id }: { id: string }) {
  const draft = useResource<SharedColleagueDraft>("/colleague-profiles/" + id);
  if (draft.data) return <ColleagueDrafts key={id} sharedDraft={draft.data} />;
  return <main className="pilot-main">
    <Link className="pilot-link" to={"/professionals/" + id}>Back to profile</Link>
    <p className="mt-4" role={draft.error ? "alert" : "status"}>{draft.error ?? "Loading draft…"}</p>
  </main>;
}

export default function ColleagueDraftsPage(props: { embedded?: boolean; initialUrl?: string }) {
  const [params] = useSearchParams();
  const draftId = params.get("edit");
  if (!props.embedded && draftId && /^[a-f0-9-]{36}$/i.test(draftId)) return <DraftEditor id={draftId} />;
  return <ColleagueDrafts {...props} />;
}

function ColleagueDrafts({ embedded = false, initialUrl = "", sharedDraft }: {
  embedded?: boolean; initialUrl?: string; sharedDraft?: SharedColleagueDraft;
}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState(sharedDraft?.linkedinProfileUrl || initialUrl || params.get("link") || "");
  const [name, setName] = useState(sharedDraft?.name ?? "");
  const [positions, setPositions] = useState<LinkedInPosition[]>(() => sharedDraft?.history.map((role, index) =>
    linkedInPosition(index, role.company, role.title, role.start, role.end || "")) ?? []);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [matches, setMatches] = useState<Array<{ company: string; start: string; end: string }>>();
  const [sourceLabel, setSourceLabel] = useState(sharedDraft ? "Saved draft" : "PDF");
  const [editing, setEditing] = useState<Draft>();
  const formRef = useRef<HTMLFormElement>(null);
  const importToken = embedded || sharedDraft ? "" : params.get("import") ?? "";
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
    setNotice("Work history captured. Enter your colleague’s name and review the roles before saving.");
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
      const input = {
        name, linkedinProfileUrl: url,
        history: positions.map(position => ({ ...position.entry, end: position.entry.end || null })),
      };
      if (sharedDraft) {
        await send("/colleague-profiles/" + sharedDraft.id, "PUT", { ...input, revision: sharedDraft.revision });
        navigate("/professionals/" + sharedDraft.id, { replace: true });
        return;
      }
      if (!editing) {
        const result = await send<{ id: string; created: boolean }>("/colleague-profiles", "POST", input);
        if (importToken) clearBrowserImport(importToken);
        navigate("/professionals/" + result.id, {
          state: { draftNotice: result.created ? "Shared draft saved." : "A shared draft already exists. You can review or edit it here." },
        });
        return;
      }
      await send("/colleague-drafts", "POST", input);
      setPositions([]);
      setFileName("");
      setName("");
      setNotice("Private colleague draft updated.");
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

  async function updateDraft(draft: Draft, action: "remove" | "share") {
    const remove = action === "remove";
    if (remove && !window.confirm("Delete this private colleague draft?")) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (action === "share") {
        const result = await send<{ id: string; created: boolean }>("/colleague-profiles", "POST", {
          name: draft.name, linkedinProfileUrl: draft.linkedinProfileUrl, history: draft.history,
        });
        navigate("/professionals/" + result.id, {
          state: { draftNotice: result.created ? "Shared draft published." : "A shared draft already exists. Your private draft is still saved." },
        });
        return;
      }
      await send("/colleague-drafts/" + draft.id, "DELETE");
      setNotice("Private draft deleted.");
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

  function addRole() {
    setMatches(undefined);
    setPositions(current => [...current, { ...linkedInPosition(1 + Math.max(0, ...current.map(role => role.id)), "", "", "", ""), endRequired: false }]);
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
      <Link className="pilot-link" to={sharedDraft ? "/professionals/" + sharedDraft.id : "/professional-search-discovery"}>
        {sharedDraft ? "Back to profile" : "Back to colleagues"}
      </Link>
      <h1 className="pilot-title mt-5">{sharedDraft ? "Edit shared draft" : "Add a colleague"}</h1>
    </>}
    <p className="mt-2 max-w-2xl text-sm text-slate-600">Members can review and update shared drafts. After the colleague verifies ownership, their work history becomes private and only they can edit it.</p>
    {(error || drafts.error) && <p className="mt-4 text-red-800" role="alert">{error || drafts.error}</p>}
    {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
    <form ref={formRef} className={embedded ? "mt-4" : "pilot-card mt-6"} onSubmit={save}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <legend className="text-lg font-semibold">{editing ? "Edit private colleague draft" : "Colleague details"}</legend>
        {editing && <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Update {editing.name}’s details, then save your changes. The profile link stays attached to this draft.</p>
          <button type="button" className="pilot-button-secondary" onClick={cancelEdit}>Cancel editing</button>
        </div>}
        <label className="block text-sm font-medium">LinkedIn profile link
          <input className="pilot-field mt-1" value={url} maxLength={512} required inputMode="url" readOnly={!!editing || !!sharedDraft}
            placeholder="https://www.linkedin.com/in/your-colleague/" onChange={event => { setUrl(event.target.value); setMatches(undefined); }} />
        </label>
        {!editing && !sharedDraft && <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-medium">Import work history from LinkedIn</summary>
        <div className="mt-4 space-y-4">
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
        </div>
        </details>}
        <label className="block text-sm font-medium">Colleague name
          <input className="pilot-field mt-1" required value={name} maxLength={150} onChange={event => setName(event.target.value)} />
        </label>
        {positions.length > 0 && <>
          <p className="text-sm text-slate-600">Check the name and work dates. Estimated dates use the first or last day of the month or year shown in the source.</p>
          <div className="space-y-4">
            {positions.map(position => <div key={position.id} className="space-y-3 rounded-lg border border-border p-4">
              {position.originalStart && <p className="text-sm text-slate-600">{sourceLabel} dates · {position.originalStart} to {position.originalEnd || "present"}</p>}
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
        </>}
        <div className="flex flex-wrap gap-3">
          {!editing && positions.length < 50 && <button type="button" className="pilot-button-secondary" onClick={addRole}>Add work role</button>}
          {positions.length > 0 && <button type="button" className="pilot-button-secondary" onClick={event => void checkOverlap(event.currentTarget.form!)}>Check shared work dates</button>}
          <button className="pilot-button">{editing || sharedDraft ? "Save changes" : "Create shared draft"}</button>
        </div>
          {matches && <section className="rounded-lg bg-primary-50 p-4 text-sm" aria-labelledby="draft-overlap-heading">
            <h2 id="draft-overlap-heading" className="font-semibold">Shared work dates</h2>
            {matches.length ? <ul className="mt-2 space-y-2">{matches.map(match => <li key={match.company + match.start + match.end}>
              <p className="font-medium">{match.company}</p><p>{match.start} to {match.end}</p>
            </li>)}</ul> : <p className="mt-2">No overlapping work dates found. Check both the company names and dates.</p>}
            <p className="mt-2 text-slate-600">Based on your saved work history and the draft dates you reviewed.</p>
          </section>}
      </fieldset>
    </form>
    {!embedded && !sharedDraft && <section className="mt-7" aria-labelledby="saved-drafts-heading">
      <h2 id="saved-drafts-heading" className="text-xl font-semibold">Previously saved private drafts</h2>
      {!drafts.data && !drafts.error && <p className="mt-3" role="status">Loading drafts…</p>}
      {drafts.data?.length === 0 && <p className="mt-3 text-slate-600">You have no saved colleague drafts.</p>}
      <ul className="mt-3 space-y-4">
        {drafts.data?.map(draft => <li key={draft.id} className="pilot-card">
          <h3 className="text-lg font-semibold">{draft.name}</h3>
          <a className="pilot-link mt-1 inline-block break-all text-sm" href={draft.linkedinProfileUrl} rel="noreferrer" target="_blank">Open LinkedIn profile</a>
          <p className="mt-2 text-sm text-slate-600">{statusLabels[draft.invitationStatus]}</p>
          {draft.invitationStatus !== "redeemed" && <section className="mt-4 rounded-lg bg-primary-50 p-4">
            <ColleagueInvitationLink endpoint={"/colleague-drafts/" + draft.id + "/invitation-link"}
              profile={draft.linkedinProfileUrl} replaceId={draft.invitationStatus === "issued" ? draft.invitationId : null}
              disabled={pending} onCreated={drafts.refresh} />
          </section>}
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Reviewed work history</summary>
            <ul className="mt-2 space-y-2">{draft.history.map((role, index) => <li key={index}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-medium">{role.title} · {role.company}</p>
                {draft.overlappingRoleIndexes?.includes(index) && <SharedWorkDatesTag />}
              </div>
              <p className="text-slate-600">{role.start} to {role.end || "present"}</p>
            </li>)}</ul>
          </details>
          <div className="mt-4 flex flex-wrap gap-3">
            {(draft.canEdit ?? draft.invitationStatus === "draft") &&
              <button type="button" className="pilot-button-secondary" disabled={pending || positions.length > 0 || !!editing} onClick={() => editDraft(draft)}>Edit draft</button>}
            <button type="button" className="pilot-button-secondary" disabled={pending || !!editing} onClick={() => void updateDraft(draft, "share")}>Share draft with members</button>
            <button type="button" className="pilot-link text-sm" disabled={pending || !!editing} onClick={() => void updateDraft(draft, "remove")}>Delete private draft</button>
          </div>
        </li>)}
      </ul>
    </section>}
  </Container>;
}
