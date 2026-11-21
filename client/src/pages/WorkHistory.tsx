import { useRef, useState, type FormEvent } from "react";
import { message, send, useResource, type WorkEntry } from "../utils/api";
import { linkedInPosition, matchLinkedInPosition, parseLinkedInPositions, workNameKey, type LinkedInPosition } from "../utils/linkedinPositions";
import LinkedInTabImport, { type LinkedInTabProfile } from "../components/LinkedInTabImport";

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
    <p id="linkedin-profile-help" className="mt-2 text-sm text-slate-600">Add your own profile link so colleagues can search for it when you appear in the directory. This link is self-reported. Leave it blank to remove it.</p>
    <button className="pilot-button-secondary mt-3" disabled={disabled || pending}>{pending ? "Saving…" : "Save profile link"}</button>
    {error && <p className="mt-2 text-sm text-red-800" role="alert">{error}</p>}
    {notice && <p className="mt-2 text-sm text-success-800" role="status">{notice}</p>}
  </form>;
}

export default function WorkHistory() {
  const work = useResource<{ history: WorkEntry[]; visible: boolean; linkedinProfileUrl: string | null }>("/work-history");
  const [entry, setEntry] = useState(empty);
  const [editing, setEditing] = useState<string>();
  const [positions, setPositions] = useState<LinkedInPosition[]>([]);
  const [reviewing, setReviewing] = useState<LinkedInPosition>();
  const [importFileName, setImportFileName] = useState("");
  const [profileUrl, setProfileUrl] = useState<string>();
  const [importedUrl, setImportedUrl] = useState("");
  const [reading, setReading] = useState(false);
  const [importError, setImportError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const companyField = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  function resetEntry() {
    setEntry(empty);
    setEditing(undefined);
    setReviewing(undefined);
  }

  function acceptLinkedInProfile(imported: LinkedInTabProfile) {
    const roles = imported.positions.map((role, index) => ({ ...linkedInPosition(index, role.company, role.title, role.start, role.end), needsReview: role.needsReview ?? false }));
    setPositions(roles);
    setImportedUrl(imported.linkedinProfileUrl);
    setImportFileName("");
    setImportError("");
    const firstNew = roles.find(role => !work.data?.history.some(saved => matchLinkedInPosition(role, saved)));
    if (firstNew) review(firstNew);
    else resetEntry();
  }

  async function readPositions(file: File) {
    setReading(true);
    setImportError("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose a file smaller than 2 MB.");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const imported = isPdf
        ? await (await import("../utils/linkedinProfile")).readLinkedInProfile(file)
        : parseLinkedInPositions(await file.text());
      setPositions(imported);
      setImportFileName(file.name);
      setImportedUrl("");
      if (reviewing) resetEntry();
    } catch (failure) {
      setImportError(message(failure));
    } finally {
      setReading(false);
    }
  }

  function review(position: LinkedInPosition) {
    setEditing(undefined);
    setReviewing(position);
    setEntry(position.entry);
    setError("");
    setNotice("");
    companyField.current?.focus();
  }

  function editSaved(item: WorkEntry) {
    setReviewing(undefined);
    setEditing(item.id);
    setEntry({ company: item.company, title: item.title, start: item.start, end: item.end || "" });
    setError("");
    setNotice("");
    companyField.current?.focus();
  }

  async function change(run: () => Promise<void>, success: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await run();
      setNotice(success);
      work.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (reviewing && work.data?.history.some(item =>
      matchLinkedInPosition(reviewing, item) ||
      (workNameKey(item.company) === workNameKey(entry.company) && workNameKey(item.title) === workNameKey(entry.title) &&
        item.start === entry.start && (item.end ?? "") === entry.end)
    )) {
      setError("This entry is already in your work history.");
      setNotice("");
      return;
    }
    void change(async () => {
      await send(editing ? "/work-history/" + editing : "/work-history", editing ? "PUT" : "POST", {
        ...entry, end: entry.end || null,
        ...(reviewing && { linkedinSource: reviewing.source }),
      });
      if (reviewing) setPositions(current => current.filter(position => position.id !== reviewing.id));
      resetEntry();
    }, "Work history saved.");
  }

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">My work history</h1>
      <p className="mt-2 text-slate-600">Add the companies and dates you want to use to find eligible colleagues. Your entries are self-reported and stay out of the pilot directory.</p>
      {(error || work.error) && <p className="mt-4 text-red-800" role="alert">{error || work.error}</p>}
      {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
      <div className="mt-7 grid items-start gap-5 md:grid-cols-2">
        <form className="pilot-card min-w-0" onSubmit={save}>
          <h2 id="work-history-editor" className="text-lg font-semibold">{reviewing ? "Review LinkedIn entry" : editing ? "Edit an entry" : "Add an entry"}</h2>
          <fieldset disabled={pending || reading} aria-labelledby="work-history-editor" className="mt-4 min-w-0 space-y-4">
            {reviewing && <div className="space-y-1 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-slate-700">
              <p><span className="font-semibold">Dates from LinkedIn</span> · {reviewing.originalStart || "No start date"} to {reviewing.originalEnd || "present"}</p>
              {reviewing.estimatedDates && <p>Estimated dates use the start or end of the month or year shown. Check them before saving.</p>}
              {reviewing.needsReview && <p className="font-medium text-amber-900">This heading was unclear in the capture. Check the company, job title and dates before saving.</p>}
              {(!reviewing.entry.start || reviewing.endRequired) && <p>Enter any missing dates before saving.</p>}
            </div>}
            <label className="block text-sm font-medium">Company <input ref={companyField} className="pilot-field mt-1" value={entry.company} required maxLength={120} onChange={(e) => setEntry({ ...entry, company: e.target.value })} /></label>
            <label className="block text-sm font-medium">Job title <input className="pilot-field mt-1" value={entry.title} required maxLength={120} onChange={(e) => setEntry({ ...entry, title: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Start date <input className="pilot-field mt-1" type="date" value={entry.start} max={today} required onChange={(e) => setEntry({ ...entry, start: e.target.value })} /></label>
              <label className="block text-sm font-medium">End date <input className="pilot-field mt-1" type="date" value={entry.end} min={entry.start} max={today} required={reviewing?.endRequired} onChange={(e) => setEntry({ ...entry, end: e.target.value })} /></label>
            </div>
            <p className="text-sm text-slate-600">Leave the end date blank if you still work there.</p>
            <div className="flex gap-3">
              <button className="pilot-button">Save entry</button>
              {(editing || reviewing) && <button type="button" className="pilot-button-secondary" onClick={resetEntry}>Cancel</button>}
            </div>
          </fieldset>
        </form>
        <div className="min-w-0 space-y-4">
          <section className="pilot-card">
            <h2 className="text-lg font-semibold">Import LinkedIn experience</h2>
            <div className="mt-4">
              <label className="block text-sm font-medium" htmlFor="linkedin-import-url">LinkedIn profile URL</label>
              <input id="linkedin-import-url" className="pilot-field mt-1" value={profileUrl ?? work.data?.linkedinProfileUrl ?? ""}
                required maxLength={512} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="https://www.linkedin.com/in/your-name/" aria-describedby="linkedin-import-help"
                disabled={pending || reading} onChange={event => setProfileUrl(event.target.value)} />
              <p id="linkedin-import-help" className="mt-2 text-sm text-slate-600">Open your Experience page, then share that tab to prepare your work history for review.</p>
              <LinkedInTabImport url={profileUrl ?? work.data?.linkedinProfileUrl ?? ""} disabled={pending || reading || !work.data}
                onImported={acceptLinkedInProfile} />
            </div>
            {importedUrl && <div className="mt-4 rounded-lg bg-primary-50 p-3 text-sm" role="status">
              <p className="font-semibold">LinkedIn roles ready to review</p>
              <a className="pilot-link mt-1 inline-block break-all" href={importedUrl} target="_blank" rel="noreferrer">{importedUrl}</a>
              <p className="mt-1 text-slate-600">This may be a partial history. Check your profile for missing roles. Matching saved entries are marked below.</p>
            </div>}
            <h3 className="mt-5 border-t border-border pt-4 text-sm font-semibold">Or import a saved file</h3>
            <p className="mt-2 text-sm text-slate-600">On your LinkedIn profile, choose <strong>More</strong> or <strong>Resources</strong>, then <strong>Save to PDF</strong>. You can also use the Positions CSV from your data export.</p>
            <p className="mt-2 text-sm text-slate-600">Your browser reads the file. Review each role before saving it.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a className="pilot-link" href="https://www.linkedin.com/help/linkedin/answer/a541960/" target="_blank" rel="noreferrer">Save your profile as a PDF</a>
              <a className="pilot-link" href="https://www.linkedin.com/help/linkedin/answer/a1339364/" target="_blank" rel="noreferrer">Download your LinkedIn data</a>
            </div>
            <label className="mt-4 block text-sm font-medium">
              <span id="linkedin-file-label">LinkedIn profile PDF or Positions CSV</span>
              <span className="pilot-file mt-1">
                <input className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" type="file"
                  accept=".pdf,application/pdf,.csv,text/csv" aria-labelledby="linkedin-file-label" aria-describedby="linkedin-file-status"
                  disabled={pending || reading} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void readPositions(file);
                  }} />
                <span aria-hidden="true" className="shrink-0 rounded-md bg-primary-50 px-2.5 py-2 font-semibold text-primary peer-hover:bg-primary-100 peer-disabled:opacity-50">
                  {importFileName ? "Replace file" : "Choose file"}
                </span>
                <span id="linkedin-file-status" className="min-w-0 truncate pr-2 font-normal text-slate-600" title={importFileName} role="status">
                  {reading ? "Reading positions…" : importFileName || "No file selected"}
                </span>
              </span>
            </label>
            {importError && <p className="mt-2 text-sm text-red-800" role="alert">{importError}</p>}
            {positions.length > 0 && <ul className="mt-3 divide-y divide-border" aria-label="Imported LinkedIn positions">
              {positions.map(position => {
                const matches = work.data?.history.filter(item => matchLinkedInPosition(position, item)) ?? [];
                const active = reviewing?.id === position.id;
                return <li key={position.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 break-words text-sm">
                    <p className="font-semibold">{position.entry.title || "Job title missing"}</p>
                    <p>{position.entry.company || "Company missing"}</p>
                    <p className="text-slate-600">{position.originalStart || "No start date"} to {position.originalEnd || "present"}</p>
                    {position.needsReview && <p className="text-xs font-medium text-amber-900">Unclear capture — needs review</p>}
                    {matches.length > 0 && <p className="mt-1 font-medium text-success-800">Already saved</p>}
                  </div>
                  {matches.length > 1
                    ? <a className="pilot-link text-sm" href="#saved-work-entries">View saved entries</a>
                    : <button type="button" className="pilot-button-secondary" disabled={pending || reading || !work.data || active}
                        aria-label={`${matches.length ? "Edit saved" : "Review"} ${position.entry.title || "position"} at ${position.entry.company || "company missing"}`}
                        onClick={() => matches.length ? editSaved(matches[0]) : review(position)}>
                        {matches.length ? "Edit saved" : active ? "In form" : "Review"}
                      </button>}
                </li>;
              })}
            </ul>}
          </section>
          <section id="directory-visibility" className="pilot-card scroll-mt-5" aria-labelledby="directory-visibility-title">
            <h2 id="directory-visibility-title" className="text-lg font-semibold">Pilot directory</h2>
            {work.data && <label className="mt-3 flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={work.data.visible} disabled={pending} onChange={(e) => {
                const visible = e.target.checked;
                void change(() => send("/directory-visibility", "PUT", { visible }), "Directory setting saved.");
              }} />
              <span>Let invited participants find me by name and check whether they can rate me.</span>
            </label>}
            {work.data && <LinkedInProfileField savedUrl={work.data.linkedinProfileUrl} disabled={pending || reading} onSaved={work.refresh} />}
          </section>
          <section className="pilot-card" id="saved-work-entries">
            <h2 className="text-lg font-semibold">Your entries</h2>
            {!work.data && !work.error && <p className="mt-3" role="status">Loading work history…</p>}
            {work.data?.history.length === 0 && <p className="mt-3 text-slate-600">You haven’t added any entries yet.</p>}
            <ul className="divide-y divide-border">
              {work.data?.history.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="font-semibold">{item.company}</p>
                  <p>{item.title}</p>
                  <p className="text-sm text-slate-600">{item.start} to {item.end || "present"}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="pilot-button-secondary" disabled={pending || reading} onClick={() => editSaved(item)}>Edit</button>
                    <button className="pilot-button-secondary" disabled={pending} onClick={() => {
                      if (!window.confirm("Remove this work history entry?")) return;
                      void change(async () => {
                        await send("/work-history/" + item.id, "DELETE");
                        if (editing === item.id) { setEditing(undefined); setEntry(empty); }
                      }, "Work history entry removed.");
                    }}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
