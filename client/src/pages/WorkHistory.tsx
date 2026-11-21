import { useRef, useState, type FormEvent } from "react";
import { ChevronDown, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { message, send, useResource, type WorkEntry } from "../utils/api";
import { linkedInPosition, parseLinkedInPositions, type LinkedInPosition } from "../utils/linkedinPositions";
import type { LinkedInTabProfile } from "../components/LinkedInTabImport";
import { ImportReview, ImportSource, WorkFields, matchesSavedRole, maxImportRoles, workDates, workFieldsIssue,
  type EntryFields, type ImportMode } from "./work-history/WorkHistoryImport";

const empty = { company: "", title: "", start: "", end: "" };

function LinkedInProfileField({ savedUrl, disabled, onSaved }: {
  savedUrl: string | null; disabled: boolean; onSaved: () => void;
}) {
  const [url, setUrl] = useState(savedUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      await send("/linkedin-profile", "PUT", { url: url.trim() || null });
      setNotice(url.trim() ? "LinkedIn profile link saved." : "LinkedIn profile link removed.");
      onSaved();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  return <form className="mt-5 border-t border-border pt-4" onSubmit={save}>
    <label className="block text-sm font-medium">Your LinkedIn profile link
      <input className="pilot-field mt-1" value={url} maxLength={512} inputMode="url" autoCapitalize="none"
        placeholder="https://www.linkedin.com/in/your-name/" disabled={disabled || pending}
        aria-describedby="linkedin-profile-help" onChange={event => {
          setUrl(event.target.value);
          setError("");
          setNotice("");
        }} />
    </label>
    <p id="linkedin-profile-help" className="mt-2 text-sm text-slate-600">Members can search for this link when your profile is visible. Clear the field to remove the link.</p>
    <button className="pilot-button-secondary mt-3" disabled={disabled || pending}>{pending ? "Saving…" : "Save profile link"}</button>
    {error && <p className="mt-2 text-sm text-red-800" role="alert">{error}</p>}
    {notice && <p className="mt-2 text-sm text-success-800" role="status">{notice}</p>}
  </form>;
}

function focusSection(id: string) {
  requestAnimationFrame(() => {
    const section = document.getElementById(id);
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: "nearest" });
  });
}

export default function WorkHistory() {
  const work = useResource<{ history: WorkEntry[]; visible: boolean; linkedinProfileUrl: string | null }>("/work-history");
  const { hash } = useLocation();
  const [entry, setEntry] = useState(empty);
  const [editing, setEditing] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("file");
  const [positions, setPositions] = useState<LinkedInPosition[]>([]);
  const [selection, setSelection] = useState<ReadonlyMap<number, boolean>>(new Map());
  const [source, setSource] = useState("");
  const [profileUrl, setProfileUrl] = useState<string>();
  const [reading, setReading] = useState(false);
  const [importError, setImportError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const companyField = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const saved = work.data?.history ?? [];
  const selected = new Set(positions.filter(role =>
    !workFieldsIssue(role.entry, today, role.endRequired) && !saved.some(item => matchesSavedRole(role, item)) &&
    (selection.get(role.id) ?? !role.needsReview)).map(role => role.id));

  function resetEntry() {
    setEntry(empty);
    setEditing(undefined);
    setEditorOpen(false);
  }

  function openEditor(item?: WorkEntry) {
    setEditing(item?.id);
    setEntry(item ? { company: item.company, title: item.title, start: item.start, end: item.end ?? "" } : empty);
    setEditorOpen(true);
    setError("");
    setNotice("");
    requestAnimationFrame(() => companyField.current?.focus());
  }

  function openImport() {
    setImportOpen(true);
    setImportError("");
    focusSection("import-source-title");
  }

  function acceptPositions(roles: LinkedInPosition[], label: string) {
    setPositions(roles);
    setSource(label);
    setSelection(new Map());
    setImportError("");
    setError("");
    setNotice("");
    setImportOpen(false);
    focusSection("review-history-title");
  }

  function acceptLinkedInProfile(imported: LinkedInTabProfile) {
    const roles = imported.positions.map((role, index) => ({
      ...linkedInPosition(index, role.company, role.title, role.start, role.end), needsReview: role.needsReview ?? false,
    }));
    acceptPositions(roles, "Shared LinkedIn tab");
  }

  async function readPositions(file: File) {
    setReading(true);
    setImportError("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose a file smaller than 2 MB.");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const roles = isPdf
        ? await (await import("../utils/linkedinProfile")).readLinkedInProfile(file)
        : parseLinkedInPositions(await file.text());
      acceptPositions(roles, file.name);
    } catch (failure) {
      setImportError(message(failure));
    } finally {
      setReading(false);
    }
  }

  async function change(run: () => Promise<string>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      setNotice(await run());
      work.refresh();
    } catch (failure) {
      setError(message(failure));
      focusSection("work-history-error");
    } finally {
      setPending(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const issue = workFieldsIssue(entry, today);
    if (issue) {
      setError(issue);
      return;
    }
    void change(async () => {
      await send(editing ? "/work-history/" + editing : "/work-history", editing ? "PUT" : "POST", { ...entry, end: entry.end || null });
      resetEntry();
      focusSection("saved-work-heading");
      return editing ? "Role updated." : "Role added.";
    });
  }

  function saveImported() {
    if (!work.data || !selected.size || selected.size > maxImportRoles || pending) return;
    const entries = positions.filter(role => selected.has(role.id)).map(role => {
      const { source } = role;
      const linkedinSource = source.company.length <= 240 && source.title.length <= 240 ? source : undefined;
      return { ...role.entry, end: role.entry.end || null, linkedinSource };
    });
    void change(async () => {
      const result = await send<{ saved: number; skipped: number }>("/work-history/import", "POST", { entries });
      setPositions(current => current.filter(role => !selected.has(role.id)));
      focusSection("saved-work-heading");
      const added = `${result.saved} ${result.saved === 1 ? "role" : "roles"} added.`;
      return result.skipped ? `${added} ${result.skipped} already saved.` : added;
    });
  }

  function editPosition(id: number, key: keyof EntryFields, value: string) {
    setPositions(current => current.map(role => role.id === id ? { ...role, entry: { ...role.entry, [key]: value } } : role));
  }

  return <main className="pilot-main">
    <div className="flex flex-wrap items-end justify-between gap-x-7 gap-y-4">
      <div>
        <h1 className="pilot-title">My work history</h1>
        <p className="mt-2 max-w-xl text-slate-600">Your private work history helps E-ProRate find colleagues you worked with.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pilot-button" disabled={pending || reading || !work.data} aria-expanded={importOpen} onClick={openImport}>
          <FileUp size={17} aria-hidden="true" /> Import from LinkedIn
        </button>
        <button type="button" className="pilot-button-secondary" disabled={pending || reading || !work.data} aria-expanded={editorOpen} onClick={() => openEditor()}>
          <Plus size={17} aria-hidden="true" /> Add role
        </button>
      </div>
    </div>
    {(error || work.error) && <p id="work-history-error" tabIndex={-1} className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error || work.error}</p>}
    {notice && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-success-800" role="status">{notice}</p>}
    <div className="mt-6 space-y-4">
      {importOpen && <ImportSource mode={mode} profileUrl={profileUrl ?? work.data?.linkedinProfileUrl ?? ""}
        reading={reading} disabled={pending || !work.data} error={importError} onMode={next => { setMode(next); setImportError(""); }}
        onClose={() => setImportOpen(false)} onUrl={setProfileUrl} onFile={file => void readPositions(file)} onProfile={acceptLinkedInProfile} />}
      {positions.length > 0 && <ImportReview positions={positions} selected={selected} saved={saved} source={source} today={today}
        pending={pending || reading || !work.data} onSelect={(id, checked) => setSelection(current => new Map(current).set(id, checked))}
        onSelectReady={() => setSelection(new Map())} onClearSelection={() => setSelection(new Map(positions.map(role => [role.id, false])))}
        onEdit={editPosition} onSave={saveImported} onClear={() => { setPositions([]); focusSection("saved-work-heading"); }} />}
      {editorOpen && <form className="pilot-card scroll-mt-5" onSubmit={save}>
        <h2 id="work-history-editor" className="text-xl font-semibold">{editing ? "Edit role" : "Add a role"}</h2>
        <fieldset disabled={pending || reading} aria-labelledby="work-history-editor" className="mt-4 min-w-0 space-y-4">
          <WorkFields entry={entry} today={today} companyRef={companyField} onChange={(key, value) => setEntry(current => ({ ...current, [key]: value }))} />
          <p className="text-sm text-slate-600">Leave the end date blank if you still work there.</p>
          <div className="flex gap-2">
            <button className="pilot-button">{pending ? "Saving…" : "Save role"}</button>
            <button type="button" className="pilot-button-secondary" onClick={() => { resetEntry(); focusSection("saved-work-heading"); }}>Cancel</button>
          </div>
        </fieldset>
      </form>}
      <section className="pilot-card scroll-mt-5" id="saved-work-entries" aria-labelledby="saved-work-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="saved-work-heading" className="text-xl font-semibold" tabIndex={-1}>Saved roles</h2>
          {work.data && saved.length > 0 && <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary">{saved.length} {saved.length === 1 ? "role" : "roles"}</span>}
        </div>
        {!work.data && !work.error && <p className="mt-3 text-sm text-slate-600" role="status">Loading work history…</p>}
        {work.data && !saved.length && <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-50 p-5 sm:p-6">
          <p className="font-semibold text-primary">No roles saved yet</p>
          <p className="mt-1 text-sm text-slate-600">Import your LinkedIn experience or add a role by hand to get started.</p>
        </div>}
        <ul className="mt-2 divide-y divide-border">
          {saved.map(item => <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4 last:pb-0">
            <div className="min-w-0 break-words">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-primary">{item.title}</p>
                {!item.end && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-success-800">Current</span>}</div>
              <p className="mt-0.5 text-sm">{item.company}</p>
              <p className="mt-0.5 text-xs text-slate-600">{workDates(item.start, item.end)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="pilot-button-secondary" aria-label={`Edit ${item.title} at ${item.company}`} disabled={pending || reading} onClick={() => openEditor(item)}><Pencil size={14} aria-hidden="true" /> Edit</button>
              <button type="button" className="pilot-button-secondary" aria-label={`Remove ${item.title} at ${item.company}`} disabled={pending || reading} onClick={() => {
                if (!window.confirm("Remove this work history role?")) return;
                void change(async () => {
                  await send("/work-history/" + item.id, "DELETE");
                  if (editing === item.id) resetEntry();
                  return "Role removed.";
                });
              }}><Trash2 size={14} aria-hidden="true" /> Remove</button>
            </div>
          </li>)}
        </ul>
      </section>
      <details id="directory-visibility" className="pilot-card group scroll-mt-5" open={hash === "#directory-visibility" || undefined}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span><span className="block text-base font-semibold">Directory settings</span>{work.data && <span className="mt-1 block text-sm text-slate-600">{work.data.visible ? "Your profile is visible to other members." : "Your profile is hidden from the directory."}</span>}</span>
          <ChevronDown size={20} className="shrink-0 text-primary group-open:rotate-180" aria-hidden="true" />
        </summary>
        {work.data && <>
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 rounded border-border-dark text-primary focus:ring-primary" checked={work.data.visible} disabled={pending} onChange={event => {
            const visible = event.target.checked;
            void change(async () => { await send("/directory-visibility", "PUT", { visible }); return "Directory setting saved."; });
          }} />
          <span>Let members find me by name and check whether they can rate me.</span>
        </label>
        <LinkedInProfileField savedUrl={work.data.linkedinProfileUrl} disabled={pending || reading} onSaved={work.refresh} />
        </>}
      </details>
    </div>
  </main>;
}
