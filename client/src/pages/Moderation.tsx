import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { message, send, useResource } from "../utils/api";

type Action = "hide" | "dismiss" | "reinstate";
const actionLabels = { hide: "Hide rating", dismiss: "Keep rating", reinstate: "Restore rating" };
type Report = {
  id: string;
  reason: string;
  status: "open" | "hidden" | "dismissed";
  feedback: string | null;
  author: string;
  recipient: string;
  eligibility: { company: string; start: string; end: string } | null;
  createdAt: string;
  respondedAt: string | null;
};

function DecisionHistory({ reportId }: { reportId: string }) {
  const history = useResource<Array<{
    id: string;
    action: Action;
    note: string;
    createdAt: string;
    operator: string | null;
  }>>("/moderation/" + reportId + "/history");

  if (history.error) return <p className="text-red-800" role="alert">{history.error}</p>;
  if (!history.data) return <p role="status">Loading decision history…</p>;
  if (!history.data.length) return <p className="text-sm text-slate-600">There are no decisions for this report yet.</p>;
  return <ol className="space-y-3 border-l border-border pl-4">
    {history.data.map((entry) => <li key={entry.id}>
      <h3 className="font-medium">{actionLabels[entry.action]}</h3>
      <p className="text-sm text-slate-600">{entry.operator ?? "Former operator"} · <time dateTime={entry.createdAt}>
        {new Date(entry.createdAt).toLocaleString()}
      </time></p>
      <p className="mt-1 whitespace-pre-wrap break-words">{entry.note}</p>
    </li>)}
  </ol>;
}

function Reports() {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [page, setPage] = useState(1);
  const [historyId, setHistoryId] = useState<string>();
  const queue = useResource<{ reports: Report[]; paused: boolean; hasMore: boolean }>(
    `/moderation?status=${filter}&page=${page}`,
  );
  const [decision, setDecision] = useState<{ id: string; action: Action }>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function change(run: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await run();
      setDecision(undefined);
      setNote("");
      queue.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function decide(event: FormEvent) {
    event.preventDefault();
    if (!decision) return;
    void change(() => send("/moderation/" + decision.id, "POST", { action: decision.action, note }));
  }

  function show(nextFilter: typeof filter, nextPage: number) {
    setFilter(nextFilter);
    setPage(nextPage);
    setDecision(undefined);
    setNote("");
    setHistoryId(undefined);
    setError("");
  }

  return <main className="pilot-main">
    <div className="flex flex-wrap gap-3 justify-between items-center">
      <h1 className="pilot-title">Moderation</h1>
      {queue.data && <button className="pilot-button-secondary" disabled={pending} onClick={() => {
        void change(() => send("/moderation/submissions", "PUT", { paused: !queue.data?.paused }));
      }}>{queue.data.paused ? "Resume submissions" : "Pause submissions"}</button>}
    </div>
    <nav aria-label="Report status" className="mt-5 flex flex-wrap gap-2">
      {(["open", "resolved"] as const).map((status) => <button key={status} type="button"
        className={filter === status ? "pilot-button" : "pilot-button-secondary"} aria-pressed={filter === status}
        disabled={pending} onClick={() => show(status, 1)}>
        {status === "open" ? "Open reports" : "Resolved reports"}
      </button>)}
      <button type="button" className="pilot-button-secondary" onClick={queue.refresh} disabled={pending}>Refresh</button>
    </nav>
    {(error || queue.error) && <p role="alert" className="mt-4 text-red-800">{error || queue.error}</p>}
    {!queue.data && !queue.error && <p role="status" className="mt-4">Loading reports…</p>}
    {queue.data?.paused && <p role="status" className="mt-4">New rating submissions are paused.</p>}
    {queue.data?.reports.length === 0 && <p className="pilot-card mt-5">There are no {filter} reports on this page.</p>}
    <ul className="space-y-4 mt-5">
      {queue.data?.reports.map((report) => <li key={report.id} className="pilot-card space-y-3">
        <h2 className="font-semibold">{report.author} → {report.recipient}</h2>
        <p className="capitalize text-sm text-slate-600">{report.status}</p>
        <p className="text-sm text-slate-600">
          Filed <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
          {report.respondedAt && <> · First decision <time dateTime={report.respondedAt}>{new Date(report.respondedAt).toLocaleString()}</time></>}
        </p>
        <p className="break-words"><strong>Report reason</strong><br />{report.reason}</p>
        <p className="whitespace-pre-wrap break-words"><strong>Feedback at the time of reporting</strong><br />
          {report.feedback ?? "A snapshot is unavailable for this older report."}
        </p>
        {report.eligibility && <p className="text-sm text-slate-600">
          Recorded overlap at {report.eligibility.company} from {report.eligibility.start} to {report.eligibility.end}
        </p>}
        <div className="flex flex-wrap gap-2">
          {(report.status === "open" ? ["hide", "dismiss"] as const : report.status === "hidden" ? ["reinstate"] as const : []).map((action) => (
            <button key={action} className="pilot-button-secondary capitalize" disabled={pending} onClick={() => {
              setDecision({ id: report.id, action });
              setNote("");
            }}>{actionLabels[action]}</button>
          ))}
          <button type="button" className="pilot-button-secondary" aria-expanded={historyId === report.id}
            onClick={() => setHistoryId(historyId === report.id ? undefined : report.id)}>
            {historyId === report.id ? "Close decision history" : "View decision history"}
          </button>
        </div>
        {decision?.id === report.id && <form className="space-y-3" onSubmit={decide}>
          <label className="block">Internal decision note
            <textarea className="pilot-field mt-1" value={note} onChange={(e) => setNote(e.target.value)}
              minLength={3} maxLength={1000} required disabled={pending} />
          </label>
          <button className="pilot-button" disabled={pending}>{actionLabels[decision.action]}</button>
        </form>}
        {historyId === report.id && <DecisionHistory key={report.id + ":" + report.status} reportId={report.id} />}
      </li>)}
    </ul>
    {(page > 1 || queue.data?.hasMore) && <nav aria-label="Report pages" className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" className="pilot-button-secondary" disabled={page === 1 || pending}
        onClick={() => show(filter, page - 1)}>Previous</button>
      <span className="text-sm text-slate-600">Page {page}</span>
      <button type="button" className="pilot-button-secondary" disabled={!queue.data?.hasMore || pending}
        onClick={() => show(filter, page + 1)}>Next</button>
    </nav>}
  </main>;
}

export default function Moderation() {
  const { session } = useAuth();
  return session?.user.role === "operator" ? <Reports /> : <Navigate to="/dashboard-home" replace />;
}
