import { useState, type FormEvent } from "react";
import { message, send, useResource } from "../utils/api";

type Account = {
  id: string;
  name: string;
  suspendedAt: string | null;
};

type AccessEvent = {
  id: string;
  action: "suspend" | "restore";
  note: string;
  createdAt: string;
  operator: string | null;
};

function AccessHistory({ accountId }: { accountId: string }) {
  const history = useResource<AccessEvent[]>("/pilot/accounts/" + accountId + "/history");
  if (history.error) return <p className="text-red-800" role="alert">{history.error}</p>;
  if (!history.data) return <p role="status">Loading access history…</p>;
  if (!history.data.length) return <p className="text-sm text-slate-600">No access changes have been recorded.</p>;
  return <ol className="space-y-3 border-l border-border pl-4">
    {history.data.map((entry) => <li key={entry.id}>
      <p className="font-medium">{entry.action === "suspend" ? "Access suspended" : "Access restored"}</p>
      <p className="text-sm text-slate-600">
        {entry.operator ?? "Former operator"} · <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
      </p>
      <p className="mt-1 break-words whitespace-pre-wrap">{entry.note}</p>
    </li>)}
  </ol>;
}

export default function PilotAccounts() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [suspendedOnly, setSuspendedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Account>();
  const [historyId, setHistoryId] = useState<string>();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const params = new URLSearchParams({ q: term, page: String(page) });
  if (suspendedOnly) params.set("suspended", "1");
  const result = useResource<{ accounts: Account[]; hasMore: boolean }>("/pilot/accounts?" + params);

  function show(nextTerm: string, onlySuspended: boolean, nextPage: number) {
    setTerm(nextTerm);
    setSuspendedOnly(onlySuspended);
    setPage(nextPage);
    setSelected(undefined);
    setHistoryId(undefined);
    setNote("");
    setNotice("");
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const suspended = !selected.suspendedAt;
    setPending(true);
    setNotice("");
    setError("");
    try {
      await send("/pilot/accounts/" + selected.id + "/access", "PUT", { suspended, note });
      setNotice(suspended ? "Account access suspended." : "Account access restored.");
      setSelected(undefined);
      setNote("");
    } catch (failure) {
      setError(message(failure));
    } finally {
      result.refresh();
      setPending(false);
    }
  }

  return <section className="mt-6" aria-labelledby="pilot-accounts-heading">
    <h2 id="pilot-accounts-heading" className="text-xl font-semibold">Participant accounts</h2>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault();
      show(input.trim(), suspendedOnly, 1);
    }}>
      <label className="block w-full max-w-md">Name or account reference
        <input className="pilot-field mt-1" value={input} maxLength={120} onChange={(event) => setInput(event.target.value)} />
      </label>
      <button className="pilot-button" disabled={pending}>Search</button>
    </form>
    <label className="mt-4 flex items-center gap-2">
      <input type="checkbox" checked={suspendedOnly} disabled={pending} onChange={(event) => show(term, event.target.checked, 1)} />
      Show suspended accounts only
    </label>
    {(error || result.error) && <p className="mt-4 text-red-800" role="alert">{error || result.error}</p>}
    {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
    {!result.data && !result.error && <p className="mt-4" role="status">Loading accounts…</p>}
    {result.data?.accounts.length === 0 && <p className="pilot-card mt-4">No matching participant accounts.</p>}
    <ul className="mt-4 space-y-3">
      {result.data?.accounts.map((account) => <li className="pilot-card space-y-3" key={account.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{account.name}</h3>
            <p className="text-sm text-slate-600">{account.suspendedAt ? "Suspended" : "Active"}</p>
            <p className="break-all text-sm text-slate-600"><code>{account.id}</code></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="pilot-button-secondary" disabled={pending} onClick={() => {
              setSelected(account);
              setNote("");
              setError("");
              setNotice("");
            }}>{account.suspendedAt ? "Restore access" : "Suspend access"}</button>
            <button type="button" className="pilot-button-secondary" aria-expanded={historyId === account.id}
              onClick={() => setHistoryId(historyId === account.id ? undefined : account.id)}>
              {historyId === account.id ? "Close history" : "View access history"}
            </button>
          </div>
        </div>
        {selected?.id === account.id && <form className="space-y-3" onSubmit={save}>
          <p className="text-sm text-slate-600">{selected.suspendedAt
            ? "This lets the participant sign in again."
            : "This signs the member out and takes them out of colleague search."}</p>
          <label className="block">Internal reason
            <textarea className="pilot-field mt-1" value={note} onChange={(event) => setNote(event.target.value)}
              minLength={3} maxLength={1000} required disabled={pending} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="pilot-button" disabled={pending}>{selected.suspendedAt ? "Confirm restoration" : "Confirm suspension"}</button>
            <button type="button" className="pilot-button-secondary" disabled={pending} onClick={() => setSelected(undefined)}>Cancel</button>
          </div>
        </form>}
        {historyId === account.id && <AccessHistory key={account.suspendedAt ?? "active"} accountId={account.id} />}
      </li>)}
    </ul>
    {(page > 1 || result.data?.hasMore) && <nav className="mt-4 flex flex-wrap items-center gap-3" aria-label="Account pages">
      <button type="button" className="pilot-button-secondary" disabled={page === 1 || pending}
        onClick={() => show(term, suspendedOnly, page - 1)}>Previous</button>
      <span className="text-sm text-slate-600">Page {page}</span>
      <button type="button" className="pilot-button-secondary" disabled={!result.data?.hasMore || pending}
        onClick={() => show(term, suspendedOnly, page + 1)}>Next</button>
    </nav>}
  </section>;
}
