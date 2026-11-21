import type { Ref } from "react";
import { Check, ChevronDown, FileUp, Monitor, Upload, X } from "lucide-react";
import LinkedInTabImport, { type LinkedInTabProfile } from "../../components/LinkedInTabImport";
import type { WorkEntry } from "../../utils/api";
import { matchLinkedInPosition, workNameKey, type LinkedInPosition } from "../../utils/linkedinPositions";

export type EntryFields = LinkedInPosition["entry"];
export type ImportMode = "file" | "tab";
export const maxImportRoles = 100;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const dateLabel = (value: string) => dateFormat.format(new Date(value));
export const workDates = (start: string, end: string | null) => `${dateLabel(start)} – ${end ? dateLabel(end) : "Present"}`;

export function workFieldsIssue(entry: EntryFields, today: string, endRequired = false) {
  if (!entry.company.trim() || !entry.title.trim()) return "Add a company and job title.";
  if (entry.company.trim().length > 120 || entry.title.trim().length > 120) return "Use up to 120 characters for each company and title.";
  if (!entry.start || (endRequired && !entry.end)) return "Enter the missing dates.";
  if (entry.start > today || entry.end > today) return "Use dates no later than today.";
  if (entry.end && entry.end < entry.start) return "The end date must be on or after the start date.";
  return "";
}

export function WorkFields({ entry, today, endRequired, companyRef, onChange }: {
  entry: EntryFields; today: string; endRequired?: boolean; companyRef?: Ref<HTMLInputElement>;
  onChange: (key: keyof EntryFields, value: string) => void;
}) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="min-w-0 text-sm font-medium">Company
      <input ref={companyRef} className="pilot-field mt-1" value={entry.company} maxLength={120} required onChange={event => onChange("company", event.target.value)} />
    </label>
    <label className="min-w-0 text-sm font-medium">Job title
      <input className="pilot-field mt-1" value={entry.title} maxLength={120} required onChange={event => onChange("title", event.target.value)} />
    </label>
    <label className="min-w-0 text-sm font-medium">Start date
      <input className="pilot-field mt-1" type="date" value={entry.start} max={today} required onChange={event => onChange("start", event.target.value)} />
    </label>
    <label className="min-w-0 text-sm font-medium">End date
      <input className="pilot-field mt-1" type="date" value={entry.end} min={entry.start || undefined} max={today} required={endRequired} onChange={event => onChange("end", event.target.value)} />
    </label>
  </div>;
}

export function ImportSource({ mode, profileUrl, reading, disabled, error, onMode, onClose, onUrl, onFile, onProfile }: {
  mode: ImportMode; profileUrl: string; reading: boolean; disabled: boolean; error: string;
  onMode: (mode: ImportMode) => void; onClose: () => void; onUrl: (url: string) => void;
  onFile: (file: File) => void; onProfile: (profile: LinkedInTabProfile) => void;
}) {
  return <section id="work-import-source" className="pilot-card scroll-mt-5" aria-labelledby="import-source-title">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 id="import-source-title" className="text-xl font-semibold" tabIndex={-1}>Import LinkedIn experience</h2>
        <p className="mt-1 text-sm text-slate-600">Choose a source to prepare your roles. The file or shared tab is read in your browser.</p>
      </div>
      <button type="button" className="pilot-button-secondary shrink-0" aria-label="Close import" disabled={reading} onClick={onClose}><X size={17} aria-hidden="true" /></button>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2" role="group" aria-label="Import method">
      {([
        { id: "file", icon: FileUp, name: "Upload a file", description: "Profile PDF or Positions CSV" },
        { id: "tab", icon: Monitor, name: "Share a LinkedIn tab", description: "Read the visible Experience section" },
      ] as const).map(({ id, icon: Icon, name, description }) => (
        <button key={id} type="button" aria-pressed={mode === id} disabled={reading || disabled} onClick={() => onMode(id)}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 ${mode === id ? "border-primary bg-primary-50" : "border-border hover:bg-slate-50"}`}>
          <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-primary">{name}</span><span className="block text-xs text-slate-600">{description}</span></span>
          {mode === id && <Check size={17} className="shrink-0 text-primary" aria-hidden="true" />}
        </button>
      ))}
    </div>
    {mode === "file" ? <div className="mt-5">
      <label className="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-dark bg-slate-50 p-4 text-center hover:bg-primary-50 focus-within:ring-2 focus-within:ring-primary">
        <input className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" type="file"
          accept=".pdf,application/pdf,.csv,text/csv" aria-label="Choose LinkedIn profile PDF or Positions CSV"
          disabled={disabled || reading} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) onFile(file);
          }} />
        <Upload size={20} className="text-primary" aria-hidden="true" />
        <span className="font-semibold text-primary" role="status">{reading ? "Reading your file…" : "Choose a file"}</span>
        <span className="text-xs text-slate-600">PDF or CSV · Up to 2 MB</span>
      </label>
      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-primary">How do I get a file from LinkedIn?</summary>
        <p className="mt-2">On your LinkedIn profile, open <strong>More</strong> or <strong>Resources</strong> and select <strong>Save to PDF</strong>. You can also use <strong>Positions.csv</strong> from your LinkedIn data export.</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <a className="pilot-link" href="https://www.linkedin.com/help/linkedin/answer/a541960/" target="_blank" rel="noreferrer">Save a profile PDF</a>
          <a className="pilot-link" href="https://www.linkedin.com/help/linkedin/answer/a1339364/" target="_blank" rel="noreferrer">Download LinkedIn data</a>
        </div>
      </details>
    </div> : <div className="mt-5">
      <label className="block text-sm font-medium">LinkedIn profile link
        <input className="pilot-field mt-1" value={profileUrl} maxLength={512} inputMode="url" autoCapitalize="none" spellCheck={false}
          placeholder="https://www.linkedin.com/in/your-name/" disabled={disabled} onChange={event => onUrl(event.target.value)} />
      </label>
      <LinkedInTabImport url={profileUrl} disabled={disabled} onImported={onProfile} compact />
    </div>}
    {error && <p className="mt-4 text-sm text-red-800" role="alert">{error}</p>}
  </section>;
}

export function matchesSavedRole(position: LinkedInPosition, saved: WorkEntry) {
  const { entry } = position;
  return matchLinkedInPosition(position, saved) ||
    (workNameKey(saved.company) === workNameKey(entry.company) && workNameKey(saved.title) === workNameKey(entry.title) &&
      saved.start === entry.start && (saved.end ?? "") === entry.end);
}

export function ImportReview({ positions, selected, saved, source, today, pending, onSelect, onSelectReady, onClearSelection, onEdit, onSave, onClear }: {
  positions: LinkedInPosition[]; selected: ReadonlySet<number>; saved: WorkEntry[]; source: string; today: string; pending: boolean;
  onSelect: (id: number, checked: boolean) => void; onSelectReady: () => void; onClearSelection: () => void;
  onEdit: (id: number, key: keyof EntryFields, value: string) => void; onSave: () => void; onClear: () => void;
}) {
  const rows = positions.map(position => ({ position, alreadySaved: saved.some(item => matchesSavedRole(position, item)), issue: workFieldsIssue(position.entry, today, position.endRequired) }));
  const duplicateCount = rows.filter(row => row.alreadySaved).length;
  const hasReady = rows.some(row => !row.alreadySaved && !row.issue && !row.position.needsReview);
  const hasEstimates = rows.some(row => !row.alreadySaved && row.position.estimatedDates);
  return <section className="pilot-card scroll-mt-5" aria-labelledby="review-history-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="break-words text-xs font-medium text-slate-600">{source}</p>
        <h2 id="review-history-title" className="mt-1 text-xl font-semibold" tabIndex={-1}>Review imported roles</h2>
        <p className="mt-1 text-sm text-slate-600">Edit or exclude any role, then save your selection together.</p>
      </div>
      <button type="button" className="pilot-link text-sm" onClick={onClear} disabled={pending}>Clear review</button>
    </div>
    {hasEstimates && <p className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm text-slate-700">Dates listed only by month or year are estimated. Open a role to adjust its dates.</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <p className="text-sm font-medium" aria-live="polite">{selected.size} selected{duplicateCount > 0 && <span className="font-normal text-slate-600"> · {duplicateCount} already saved</span>}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {hasReady && <button type="button" className="pilot-link text-sm" onClick={onSelectReady} disabled={pending}>Select ready roles</button>}
        {selected.size > 0 && <button type="button" className="pilot-link text-sm" onClick={onClearSelection} disabled={pending}>Clear selection</button>}
      </div>
    </div>
    <fieldset disabled={pending} className="min-w-0" aria-label="Imported roles">
      <ul className="divide-y divide-border">
        {rows.map(({ position, alreadySaved, issue }) => {
          const { id, entry } = position;
          const roleLabel = `${entry.title || "Role"} at ${entry.company || "missing company"}`;
          const status = alreadySaved ? "Already saved" : issue ? "Needs details" : position.needsReview ? "Check capture" : "";
          return <li key={id} className="flex items-start gap-3 py-3">
            <input className="mt-1.5 rounded border-border-dark text-primary focus:ring-primary" type="checkbox"
              aria-label={`Include ${roleLabel}`} checked={selected.has(id)} disabled={alreadySaved || Boolean(issue)}
              onChange={event => onSelect(id, event.target.checked)} />
            <details className="group min-w-0 flex-1">
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-x-3 gap-y-1 rounded px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 break-words">
                  <span className="block font-semibold text-primary">{entry.title || "Job title missing"}</span>
                  <span className="block text-sm text-slate-700">{entry.company || "Company missing"}</span>
                  <span className="block text-xs text-slate-600">{entry.start && !issue ? workDates(entry.start, entry.end) : `${position.originalStart || "No start date"} – ${position.originalEnd || "Present"}`}</span>
                </span>
                <span className="flex items-center gap-2">
                  {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${alreadySaved ? "bg-green-50 text-success-800" : "bg-amber-50 text-amber-900"}`}>{status}</span>}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">{alreadySaved ? "Details" : "Edit"}<ChevronDown size={15} className="group-open:rotate-180" aria-hidden="true" /></span>
                </span>
              </summary>
              <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3 sm:p-4">
                <p className="text-sm text-slate-600">Source dates · {position.originalStart || "Missing start date"} – {position.originalEnd || "Present"}</p>
                {!alreadySaved && <>
                  <WorkFields entry={entry} today={today} endRequired={position.endRequired} onChange={(key, value) => onEdit(id, key, value)} />
                  {(issue || position.needsReview) && <p className="text-sm text-amber-900">{issue || "Check the captured details and select this role to include it."}</p>}
                </>}
              </div>
            </details>
          </li>;
        })}
      </ul>
    </fieldset>
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-white py-3">
      {selected.size > maxImportRoles && <p className="mr-auto text-sm text-amber-900">Select up to {maxImportRoles} roles per save.</p>}
      <button type="button" className="pilot-button" onClick={onSave} disabled={pending || selected.size === 0 || selected.size > maxImportRoles}>
        {pending ? "Saving…" : `Save ${selected.size} selected ${selected.size === 1 ? "role" : "roles"}`}
      </button>
    </div>
  </section>;
}
