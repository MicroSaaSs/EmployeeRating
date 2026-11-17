import { useState, type FormEvent } from "react";
import { message, send, useResource } from "../utils/api";

type Company = { id: string; name: string; aliases: string[] };
type AliasResult = { affectedEntries: number; alreadyLinked: boolean };
type AliasPreview = AliasResult & { canonical: string; alias: string };

function entryCount(count: number) {
  return count === 1 ? "1 work history entry" : `${count} work history entries`;
}

export default function PilotCompanies() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [company, setCompany] = useState<Company>();
  const [alias, setAlias] = useState("");
  const [preview, setPreview] = useState<AliasPreview>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const catalog = useResource<{ companies: Company[]; hasMore: boolean }>(
    "/pilot/companies?" + new URLSearchParams({ q: term, page: String(page) }),
  );

  function select(next: Company) {
    setCompany(next);
    setAlias("");
    setPreview(undefined);
    setNotice("");
    setError("");
  }

  async function previewAlias(event: FormEvent) {
    event.preventDefault();
    if (!company) return;
    setPending(true);
    setError("");
    setNotice("");
    setPreview(undefined);
    try {
      setPreview(await send<AliasPreview>("/pilot/companies/aliases/preview", "POST", {
        canonical: company.name, alias,
      }));
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function linkAlias() {
    if (!preview || preview.alreadyLinked) return;
    setPending(true);
    setError("");
    try {
      const result = await send<AliasResult>("/pilot/companies/aliases", "POST", {
        canonical: preview.canonical, alias: preview.alias,
      });
      setNotice(result.alreadyLinked
        ? `${preview.alias} is already linked to ${preview.canonical}.`
        : `${preview.alias} is now linked to ${preview.canonical}. Updated ${entryCount(result.affectedEntries)}.`);
      setAlias("");
      setPreview(undefined);
      catalog.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  return <section className="mt-6" aria-labelledby="pilot-companies-heading">
    <h2 id="pilot-companies-heading" className="text-xl font-semibold">Company names</h2>
    <p className="mt-2 text-slate-600">Link spelling variants for the same employer so their work histories count together when checking rating eligibility.</p>
    <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
      <section className="pilot-card min-w-0" aria-label="Company search">
        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => {
          event.preventDefault();
          setTerm(search.trim());
          setPage(1);
        }}>
          <label className="block text-sm font-medium">Company name or alias
            <input className="pilot-field mt-1" value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button className="pilot-button">Search</button>
        </form>
        {catalog.error && <p className="mt-4 text-red-800" role="alert">{catalog.error}</p>}
        {!catalog.data && !catalog.error && <p className="mt-4" role="status">Loading companies…</p>}
        {catalog.data?.companies.length === 0 && <p className="mt-4 text-slate-600">No matching company names.</p>}
        <ul className="mt-3 divide-y divide-border">
          {catalog.data?.companies.map(item => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={item.id}>
            <div className="min-w-0 break-words">
              <h3 className="font-semibold">{item.name}</h3>
              {!!item.aliases.length && <p className="text-sm text-slate-600">Also known as {item.aliases.join(", ")}</p>}
            </div>
            <button type="button" className="pilot-button-secondary" disabled={pending} aria-pressed={company?.id === item.id}
              aria-label={`Use ${item.name} as the primary name`} onClick={() => select(item)}>Use this name</button>
          </li>)}
        </ul>
        {(page > 1 || catalog.data?.hasMore) && <nav className="mt-3 flex items-center gap-3" aria-label="Company result pages">
          <button type="button" className="pilot-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-sm text-slate-600">Page {page}</span>
          <button type="button" className="pilot-button-secondary" disabled={!catalog.data?.hasMore} onClick={() => setPage(page + 1)}>Next</button>
        </nav>}
      </section>
      <section className="pilot-card min-w-0" aria-labelledby="pilot-alias-heading">
        <h3 id="pilot-alias-heading" className="text-lg font-semibold">Link a company alias</h3>
        {!company && <p className="mt-2 text-sm text-slate-600">Choose the company name you want to keep from the search results.</p>}
        {company && <form className="mt-4 space-y-3" onSubmit={previewAlias}>
          <p className="break-words text-sm"><span className="font-semibold">Primary name</span> · {company.name}</p>
          <label className="block text-sm font-medium">Alias
            <input className="pilot-field mt-1" value={alias} maxLength={120} required disabled={pending} onChange={(event) => {
              setAlias(event.target.value);
              setPreview(undefined);
              setNotice("");
              setError("");
            }} />
          </label>
          <button className="pilot-button-secondary" disabled={pending || !alias.trim()}>Preview link</button>
        </form>}
        {error && <p className="mt-3 text-red-800" role="alert">{error}</p>}
        {notice && <p className="mt-3 break-words text-success-800" role="status">{notice}</p>}
        {preview && <div className="mt-4 space-y-3 break-words rounded-lg bg-primary-50 p-4 text-sm">
          {preview.alreadyLinked
            ? <p role="status"><strong>{preview.alias}</strong> is already linked to <strong>{preview.canonical}</strong>.</p>
            : <>
              <p><strong>{preview.alias}</strong> will be treated as <strong>{preview.canonical}</strong>. This will update {entryCount(preview.affectedEntries)} and apply to future entries.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="pilot-button" disabled={pending} onClick={() => void linkAlias()}>Link company names</button>
                <button type="button" className="pilot-button-secondary bg-white" disabled={pending} onClick={() => setPreview(undefined)}>Cancel</button>
              </div>
            </>}
        </div>}
      </section>
    </div>
  </section>;
}
