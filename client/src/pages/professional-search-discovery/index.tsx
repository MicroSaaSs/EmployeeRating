import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useResource, type Colleague } from "../../utils/api";

type Directory = {
  professionals: Array<Colleague & { eligible: boolean }>;
  hasWorkHistory: boolean;
  hasMore: boolean;
};

export default function ProfessionalSearchDiscovery() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const eligibleOnly = params.get("eligible") === "1";
  const page = Number(params.get("page") ?? "1");
  const [name, setName] = useState(query);
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

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">Find colleagues</h1>
      <p className="mt-2 text-slate-600">Only participants who opted into the pilot directory appear here.</p>
      {result.data && !result.data.hasWorkHistory && <section className="pilot-card mt-5">
        <h2 className="font-semibold">Add your work history to check eligibility</h2>
        <p className="mb-3 mt-1 text-slate-600">A rating requires overlapping employment dates at the same company.</p>
        <Link className="pilot-link" to="/work-history">Add work history</Link>
      </section>}
      <form className="flex gap-3 mt-6 items-end" onSubmit={search}>
        <label className="block max-w-md w-full">Name
          <input className="pilot-field mt-1" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="pilot-button">Search</button>
      </form>
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
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {query && <button type="button" className="pilot-link" onClick={() => show("", eligibleOnly, 1)}>Clear name search</button>}
          {eligibleOnly && <button type="button" className="pilot-link" onClick={() => show(query, false, 1)}>Browse all colleagues</button>}
          {eligibleOnly && result.data.hasWorkHistory && <Link className="pilot-link" to="/work-history">Review your work dates</Link>}
        </div>
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
