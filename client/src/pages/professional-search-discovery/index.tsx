import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useResource, type Colleague } from "../../utils/api";
import ColleagueDrafts from "../ColleagueDrafts";
import { linkedInTabUrl } from "../../utils/linkedinTabCapture";

type Directory = {
  professionals: Array<Colleague & { eligible: boolean }>;
  hasWorkHistory: boolean;
  hasMore: boolean;
};

export default function ProfessionalSearchDiscovery() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const linkSearch = /^(?:https?:\/\/|(?:[\w-]+\.)?linkedin\.com\/)/i.test(query.trim());
  const eligibleOnly = params.get("eligible") === "1";
  const page = Number(params.get("page") ?? "1");
  const [name, setName] = useState(query);
  const nameInput = useRef<HTMLInputElement>(null);
  const importPanel = useRef<HTMLElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  useEffect(() => { if (importOpen) importPanel.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [importOpen, importUrl]);
  useEffect(() => setName(query), [query]);
  const directoryQuery = new URLSearchParams({ q: query, eligible: eligibleOnly ? "1" : "0", page: String(page) });
  const result = useResource<Directory>("/professionals/search?" + directoryQuery);

  function search(event: FormEvent) {
    event.preventDefault();
    show(name.trim(), eligibleOnly, 1);
  }

  function show(term: string, onlyEligible: boolean, nextPage: number) {
    const next = new URLSearchParams();
    if (term) next.set("q", term);
    if (onlyEligible) next.set("eligible", "1");
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
      <p className="mt-2 text-slate-600">Only members who opted into the directory appear here.</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" className="pilot-button-secondary" onClick={() => openImport(name)}>Import colleague from LinkedIn</button>
        <Link className="pilot-link text-sm" to="/colleague-drafts">My private colleague drafts</Link>
      </div>
      {result.data && !result.data.hasWorkHistory && <section className="pilot-card mt-5">
        <h2 className="font-semibold">Add your work history to check eligibility</h2>
        <p className="mb-3 mt-1 text-slate-600">A rating requires overlapping employment dates at the same company.</p>
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
                show("", eligibleOnly, 1);
                nameInput.current?.focus();
              }}>
              <X size={18} aria-hidden="true" />
            </button>}
          </div>
        </div>
        <button className="pilot-button">Search</button>
      </form>
      <p id="colleague-search-help" className="mt-2 text-sm text-slate-600">Profile links match the links participants have added to their accounts.</p>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Directory results">
        <button type="button" className={eligibleOnly ? "pilot-button-secondary" : "pilot-button"}
          aria-pressed={!eligibleOnly} onClick={() => show(query, false, 1)}>All colleagues</button>
        <button type="button" className={eligibleOnly ? "pilot-button" : "pilot-button-secondary"}
          aria-pressed={eligibleOnly} onClick={() => show(query, true, 1)}>Eligible to rate</button>
      </nav>
      {result.error && <p role="alert" className="mt-5 text-red-800">{result.error}</p>}
      {!result.data && !result.error && <p role="status" className="mt-5">Loading colleagues…</p>}
      {result.data?.professionals.length === 0 && <section className="pilot-card mt-5">
        <h2 className="font-semibold">{eligibleOnly ? "No eligible colleagues found" : "No colleagues found"}</h2>
        {linkSearch && <>
          <p className="mt-2 text-sm text-slate-600">No visible participant matches this link{eligibleOnly ? " with overlapping work dates" : ""}. Read their LinkedIn tab or import a saved PDF to review shared work dates and prepare a private draft.</p>
          <button type="button" className="pilot-button-secondary mt-3" onClick={() => openImport(query)}>Import LinkedIn profile</button>
        </>}
        {eligibleOnly && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          <button type="button" className="pilot-link" onClick={() => show(query, false, 1)}>Browse all colleagues</button>
          {result.data.hasWorkHistory && <Link className="pilot-link" to="/work-history">Review your work dates</Link>}
        </div>}
      </section>}
      {importOpen && <section ref={importPanel} className="pilot-card mt-6 scroll-mt-5" aria-labelledby="colleague-tab-import-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="colleague-tab-import-heading" className="text-lg font-semibold">Import colleague from LinkedIn</h2>
          <button type="button" className="pilot-button-secondary" onClick={() => { setImportOpen(false); nameInput.current?.focus(); }}>Close import</button>
        </div>
        <ColleagueDrafts key={importUrl} embedded initialUrl={importUrl} />
      </section>}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {result.data?.professionals.map((person) => {
          const path = "/professionals/" + person.id;
          const state = { directorySearch: params.toString() };
          return <li key={person.id} className="pilot-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link className="pilot-link" to={path} state={state}>{person.name}</Link>
              {result.data?.hasWorkHistory && <p className="mt-1 text-sm text-slate-600">
                {person.eligible ? "Eligible to rate" : "No work-history overlap"}
              </p>}
            </div>
            {person.eligible && <Link className="pilot-button-secondary" to={path + "/rate"} state={state}
              aria-label={"Rate " + person.name}>Rate</Link>}
          </li>;
        })}
      </ul>
      {(page > 1 || result.data?.hasMore) && <nav className="mt-5 flex flex-wrap items-center gap-3" aria-label="Directory pages">
        <button type="button" className="pilot-button-secondary" disabled={page <= 1}
          onClick={() => show(query, eligibleOnly, page - 1)}>Previous</button>
        <span className="text-sm text-slate-600">Page {page}</span>
        <button type="button" className="pilot-button-secondary" disabled={!result.data?.hasMore}
          onClick={() => show(query, eligibleOnly, page + 1)}>Next</button>
      </nav>}
    </main>
  );
}
