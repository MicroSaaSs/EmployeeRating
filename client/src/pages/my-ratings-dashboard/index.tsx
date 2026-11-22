import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { message, ratingCategoryLabel, send, useResource, type Rating } from "../../utils/api";
import { RatingStars } from "../../components/RatingStars";

const ratingTabs = [
  { id: "given", label: "Given" },
  { id: "received", label: "Received" },
  { id: "reports", label: "My reports" },
] as const;

const reportOutcomes = {
  open: "Under review",
  hidden: "Rating hidden",
  kept: "Rating kept",
  restored: "Rating restored",
};

function FiledReports() {
  const reports = useResource<Array<{
    id: string;
    reason: string;
    createdAt: string;
    decidedAt: string | null;
    outcome: keyof typeof reportOutcomes;
  }>>("/ratings/reports/mine");

  if (reports.error) return <p className="mt-5 text-red-800" role="alert">{reports.error}</p>;
  if (!reports.data) return <p className="mt-5" role="status">Loading reports…</p>;
  if (!reports.data.length) return <p className="pilot-card mt-5">You haven’t reported any ratings yet.</p>;

  return <ul className="mt-5 space-y-4">
    {reports.data.map((report) => <li className="pilot-card" key={report.id}>
      <h2 className="font-semibold">{reportOutcomes[report.outcome]}</h2>
      <p className="mt-1 text-sm text-slate-600">
        Filed <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
      </p>
      {report.decidedAt && <p className="text-sm text-slate-600">
        Decision updated <time dateTime={report.decidedAt}>{new Date(report.decidedAt).toLocaleString()}</time>
      </p>}
      <p className="mt-3 text-sm font-medium">Your report</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{report.reason}</p>
    </li>)}
  </ul>;
}

function ReportForm({ id, cancel, onSent }: { id: string; cancel: () => void; onSent: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function report(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await send("/ratings/" + id + "/report", "POST", { reason });
      onSent();
    } catch (failure) {
      setError(message(failure));
      setPending(false);
    }
  }

  return <form className="mt-4 space-y-3" onSubmit={report}>
    <label className="block">Reason for reporting
      <textarea className="pilot-field mt-1" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
        minLength={5} maxLength={1000} disabled={pending} required />
    </label>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <div className="flex gap-2">
      <button className="pilot-button" disabled={pending}>Send report</button>
      <button type="button" className="pilot-button-secondary" onClick={cancel} disabled={pending}>Cancel</button>
    </div>
  </form>;
}

export default function MyRatingsDashboard() {
  const [params, setParams] = useSearchParams();
  const state = useLocation().state as { saved?: boolean } | null;
  const [reportId, setReportId] = useState<string>();
  const [notice, setNotice] = useState("");
  const ratings = useResource<{ given: Rating[]; received: Rating[] }>("/ratings/mine");
  const tab = ratingTabs.find(({ id }) => id === params.get("tab"))?.id ?? "received";
  const given = tab === "given";
  const items = given ? ratings.data?.given : ratings.data?.received;

  useEffect(() => {
    if (tab !== "received" || !items) return;
    const unopened = items.filter((rating) => !rating.opened).map((rating) => rating.id);
    for (let offset = 0; offset < unopened.length; offset += 250) {
      void send("/ratings/received/opened", "POST", { ids: unopened.slice(offset, offset + 250) }).catch(() => {
        // Viewing feedback remains available if recording the first open fails.
      });
    }
  }, [tab, items]);

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">My ratings</h1>
      <nav aria-label="Rating views" className="mt-5 flex flex-wrap gap-2">
        {ratingTabs.map(({ id, label }) => (
          <button key={id} type="button" className={tab === id ? "pilot-button" : "pilot-button-secondary"}
            aria-pressed={tab === id} onClick={() => {
              setParams(id === "received" ? {} : { tab: id });
              setReportId(undefined);
              setNotice("");
            }}>{label}</button>
        ))}
      </nav>
      {(notice || (given && state?.saved)) && <p className="mt-4 text-success-800" role="status">{notice || "Rating saved."}</p>}
      {tab === "reports" ? <FiledReports /> : <>
        {ratings.error && <p className="mt-4 text-red-800" role="alert">{ratings.error}</p>}
        {!items && !ratings.error && <p className="mt-5" role="status">Loading ratings…</p>}
        {items?.length === 0 && <p className="pilot-card mt-5">{given ? "You haven’t submitted any ratings yet." : "You haven’t received any ratings yet."}</p>}
        <ul className="space-y-4 mt-5">
          {items?.map((rating) => <li key={rating.id} className="pilot-card">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{given ? "To" : "From"} {rating.name}</h2>
              <RatingStars value={rating.overall} />
            </div>
            {rating.feedback && <p className="mt-3 whitespace-pre-wrap break-words">{rating.feedback}</p>}
            {!!Object.keys(rating.categories).length && <dl className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-slate-600">
              {Object.entries(rating.categories).map(([name, score]) => <div key={name} className="flex flex-wrap items-center gap-x-2">
                <dt className="break-all">{ratingCategoryLabel(name)}</dt><dd><RatingStars value={score} /></dd>
              </div>)}
            </dl>}
            {given && <>
              <p className="mt-3 text-sm text-slate-600">{rating.hidden ? "Hidden by moderation" : rating.anonymous ? "Name hidden from recipient" : "Name visible to recipient"}</p>
              {rating.canOpenProfile && !rating.hidden && <Link className="pilot-link mt-2 inline-block" to={"/professionals/" + rating.personId + "/rate"}>Edit rating</Link>}
            </>}
            {!given && rating.reportStatus === "open" && <p className="mt-3 text-sm text-slate-600">Report under review</p>}
            {!given && rating.reportStatus !== "open" && (reportId === rating.id ? (
              <ReportForm id={rating.id} cancel={() => setReportId(undefined)} onSent={() => {
                setReportId(undefined);
                setNotice("Your report was sent for review.");
                ratings.refresh();
              }} />
            ) : <button className="pilot-button-secondary mt-4" onClick={() => setReportId(rating.id)}>Report rating</button>)}
          </li>)}
        </ul>
      </>}
    </main>
  );
}
