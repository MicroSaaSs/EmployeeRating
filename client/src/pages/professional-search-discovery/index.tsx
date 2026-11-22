import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useResource, type Colleague } from "../../utils/api";
import ColleagueDrafts from "../ColleagueDrafts";
import RatePrivateDraftButton from "../../components/RatePrivateDraftButton";
import { linkedInTabUrl } from "../../utils/linkedinTabCapture";

type Directory = {
  professionals: Colleague[];
  hasWorkHistory: boolean;
  hasMore: boolean;
};

export default function ProfessionalSearchDiscovery() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const linkSearch = /^(?:https?:\/\/|(?:[\w-]+\.)?linkedin\.com\/)/i.test(query.trim());
  const page = Number(params.get("page") ?? "1");
  const [name, setName] = useState(query);
  const nameInput = useRef<HTMLInputElement>(null);
  const importPanel = useRef<HTMLElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  useEffect(() => { if (importOpen) importPanel.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [importOpen, importUrl]);
  useEffect(() => setName(query), [query]);
  const directoryQuery = new URLSearchParams({ q: query, page: String(page) });
  const result = useResource<Directory>("/professionals/search?" + directoryQuery);

  function search(event: FormEvent) {
    event.preventDefault();
    show(name.trim(), 1);
  }

  function show(term: string, nextPage: number) {
    const next = new URLSearchParams();
    if (term) next.set("q", term);
    if (nextPage > 1) next.set("page", String(nextPage));
    setParams(next);
  }

  function openImport(term: string) {
    let url = "";
    try { url = linkedInTabUrl(term); } catch { /* The import has its own profile-link field. */ }
    setImportUrl(url); setImportOpen(true);
  }

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">Find colleagues</h1>
      <p className="mt-2 text-slate-600">Find colleagues you worked with, including people you’ve saved in a draft.</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" className="pilot-button-secondary" onClick={() => openImport(name)}>Add a colleague</button>
        <Link to="/colleague-drafts#saved-drafts-heading" className="pilot-link text-sm">Previously saved drafts</Link>
      </div>
      {result.data && !result.data.hasWorkHistory && <section className="pilot-card mt-5">
        <h2 className="font-semibold">Add your work history to find colleagues</h2>
        <p className="mb-3 mt-1 text-slate-600">E-ProRate uses your saved companies and dates to find people you worked with.</p>
        <Link className="pilot-link" to="/work-history">Add work history</Link>
      </section>}
      <form className="mt-6 grid max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={search}>
        <div className="min-w-0">
          <label htmlFor="colleague-name" className="block text-sm font-medium">Name or LinkedIn profile link</label>
          <div className="relative mt-1">
            <input id="colleague-name" ref={nameInput} className="pilot-field pr-11" value={name} maxLength={512}
              placeholder="Name or https://www.linkedin.com/in/…" aria-describedby="colleague-search-help"
              onChange={(e) => setName(e.target.value)} />
            {(name || query) && <button type="button" aria-label="Clear search"
              className="absolute inset-y-0 right-1 my-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-primary-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                setName("");
                show("", 1);
                nameInput.current?.focus();
              }}>
              <X size={18} aria-hidden="true" />
            </button>}
          </div>
        </div>
        <button className="pilot-button">Search</button>
      </form>
      <p id="colleague-search-help" className="mt-2 text-sm text-slate-600">Results include your private drafts, shared drafts, and members with overlapping work dates.</p>
      {result.error && <p role="alert" className="mt-5 text-red-800">{result.error}</p>}
      {!result.data && !result.error && <p role="status" className="mt-5">Loading colleagues…</p>}
      {result.data && (result.data.hasWorkHistory || query) && !result.data.professionals.length && <section className="pilot-card mt-5">
        <h2 className="font-semibold">No matching colleagues yet</h2>
        {linkSearch ? <>
          <p className="mt-2 text-sm text-slate-600">If this colleague hasn’t joined, add their LinkedIn profile and share an invitation.</p>
          <button type="button" className="pilot-button-secondary mt-3" onClick={() => openImport(query)}>Add this colleague</button>
        </> : <>
          <p className="mt-2 text-sm text-slate-600">Your results include members with overlapping work dates and shared drafts you searched for.</p>
          <Link className="pilot-link mt-2 inline-block text-sm" to="/work-history">Review your work dates</Link>
        </>}
      </section>}
      {importOpen && <section ref={importPanel} className="pilot-card mt-6 scroll-mt-5" aria-labelledby="colleague-tab-import-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="colleague-tab-import-heading" className="text-lg font-semibold">Add a colleague</h2>
          <button type="button" className="pilot-button-secondary" onClick={() => { setImportOpen(false); nameInput.current?.focus(); }}>Close form</button>
        </div>
        <ColleagueDrafts key={importUrl} embedded initialUrl={importUrl} />
      </section>}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {result.data?.professionals.map((person) => {
          const path = person.privateDraft ? "/colleague-drafts#draft-" + person.id : "/professionals/" + person.id;
          const state = { directorySearch: params.toString() };
          return <li key={person.id} className="pilot-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link className="pilot-link" to={path} state={state}>{person.name}</Link>
              {person.draft && <p className="mt-1 text-sm text-slate-600">Shared draft</p>}
              {person.privateDraft && <p className="mt-1 text-sm text-slate-600">Your private draft</p>}
              {person.eligible && <p className="mt-1 text-sm text-slate-600">Shared work dates</p>}
            </div>
            {person.eligible && (person.privateDraft
              ? <RatePrivateDraftButton id={person.id} name={person.name} directorySearch={state.directorySearch} />
              : <Link className="pilot-button-secondary" to={path + "/rate"} state={state}
                aria-label={"Rate " + person.name}>Rate</Link>)}
          </li>;
        })}
      </ul>
      {(page > 1 || result.data?.hasMore) && <nav className="mt-5 flex flex-wrap items-center gap-3" aria-label="Directory pages">
        <button type="button" className="pilot-button-secondary" disabled={page <= 1}
          onClick={() => show(query, page - 1)}>Previous</button>
        <span className="text-sm text-slate-600">Page {page}</span>
        <button type="button" className="pilot-button-secondary" disabled={!result.data?.hasMore}
          onClick={() => show(query, page + 1)}>Next</button>
      </nav>}
    </main>
  );
}
