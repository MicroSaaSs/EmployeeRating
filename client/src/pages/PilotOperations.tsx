import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { message, send, useResource } from "../utils/api";
import PilotAccounts from "./PilotAccounts";
import PilotCompanies from "./PilotCompanies";

type Invite = {
  id: string;
  role: "participant" | "operator";
  expiresAt: string;
  status: "active" | "redeemed" | "expired" | "revoked";
};

type IssuedInvite = Pick<Invite, "id" | "expiresAt"> & { url: string };

type Metrics = {
  signInsMeasuredFrom: string;
  signInsStarted: number;
  signInsCompleted: number;
  invitesIssued: number;
  invitesRedeemed: number;
  accounts: number;
  accountsWithHistory: number;
  directoryParticipants: number;
  accountsWithEligibleColleague: number;
  ratings: number;
  ratingsOpened: number;
  distinctRatedPairs: number;
  reports: number;
  openReports: number;
  averageReportResponseSeconds: number | null;
};

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function responseTime(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return "Under 1 minute";
  if (seconds < 3600) return Math.round(seconds / 60) + " min";
  return (seconds / 3600).toFixed(1) + " h";
}

function Activity({ data }: { data: Metrics }) {
  const groups = [
    { title: "Onboarding", rows: [
      ["Invitations redeemed", `${data.invitesRedeemed} of ${data.invitesIssued}`],
      ["Sign-ins completed", `${data.signInsCompleted} of ${data.signInsStarted}`],
      ["Participants with work history", `${data.accountsWithHistory} of ${data.accounts}`],
      ["Participants in the directory", `${data.directoryParticipants} of ${data.accounts}`],
      ["Participants with an eligible colleague", `${data.accountsWithEligibleColleague} of ${data.accounts}`],
    ] },
    { title: "Ratings and moderation", rows: [
      ["Ratings opened in Received", `${data.ratingsOpened} of ${data.ratings}`],
      ["Colleague pairs with a rating", data.distinctRatedPairs],
      ["Open reports", `${data.openReports} of ${data.reports}`],
      ["Average time to first decision", responseTime(data.averageReportResponseSeconds)],
    ] },
  ];

  return <>
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map(({ title, rows }) => <section key={title} className="pilot-card">
        <h3 className="text-lg font-semibold">{title}</h3>
        <dl className="mt-3 divide-y divide-border">
          {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-slate-700">{label}</dt>
            <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
          </div>)}
        </dl>
      </section>)}
    </div>
    <p className="mt-3 text-sm text-slate-600">Sign-in counts began {dateTime.format(new Date(data.signInsMeasuredFrom))}.</p>
  </>;
}

function Invitations({ onIssued }: { onIssued: () => void }) {
  const invites = useResource<Invite[]>("/pilot/invitations");
  const [issued, setIssued] = useState<IssuedInvite>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      setIssued(await send<IssuedInvite>("/pilot/invitations", "POST"));
      invites.refresh();
      onIssued();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await send("/pilot/invitations/" + id, "DELETE");
      setIssued((current) => current?.id === id ? undefined : current);
      setNotice("Invitation revoked.");
    } catch (failure) {
      setError(message(failure));
    } finally {
      invites.refresh();
      setPending(false);
    }
  }

  async function copy(url: string) {
    setNotice("");
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Invitation link copied.");
    } catch {
      setError("Copy the link from the invitation field.");
    }
  }

  return <section className="pilot-card mt-8" aria-labelledby="invitations-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="invitations-heading" className="text-xl font-semibold">Invitations</h2>
      <button type="button" className="pilot-button" disabled={pending} onClick={create}>Create participant invitation</button>
    </div>
    {issued && <div className="mt-4 rounded-lg bg-primary-50 p-4">
      <label className="block font-medium" htmlFor="pilot-invite-link">New invitation link</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="pilot-invite-link" readOnly value={issued.url} className="pilot-field min-w-0 flex-1" />
        <button type="button" className="pilot-button-secondary" onClick={() => void copy(issued.url)}>Copy link</button>
      </div>
      <p className="mt-2 text-sm text-slate-700">Share it privately with one colleague. Copy this link before leaving the page.</p>
    </div>}
    {(error || invites.error) && <p className="mt-3 text-red-800" role="alert">{error || invites.error}</p>}
    {notice && <p className="mt-3 text-success-800" role="status">{notice}</p>}
    {!invites.data && !invites.error && <p className="mt-4" role="status">Loading invitations…</p>}
    {invites.data?.length === 0 && <p className="mt-4 text-slate-600">There are no invitations yet.</p>}
    {invites.data && invites.data.length > 0 && (
      <ul className="mt-4 divide-y divide-border">
        {invites.data.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="font-medium capitalize">{invite.role} invitation · {invite.status}</p>
            <p className="text-sm text-slate-600">Expiry {dateTime.format(new Date(invite.expiresAt))}</p>
          </div>
          {invite.status === "active" && <button type="button" className="pilot-button-secondary" disabled={pending} onClick={() => void revoke(invite.id)}>
            Revoke
          </button>}
        </li>)}
      </ul>
    )}
  </section>;
}

function Overview() {
  const metrics = useResource<Metrics>("/pilot/metrics");
  return <>
    <section className="mt-6" aria-labelledby="activity-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="activity-heading" className="text-xl font-semibold">Pilot activity</h2>
        <button type="button" className="pilot-button-secondary" onClick={metrics.refresh}>Refresh activity</button>
      </div>
      {metrics.error && <p className="text-red-800" role="alert">{metrics.error}</p>}
      {!metrics.data && !metrics.error && <p role="status">Loading pilot activity…</p>}
      {metrics.data && <Activity data={metrics.data} />}
    </section>
    <Invitations onIssued={metrics.refresh} />
  </>;
}

function Operations() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = requested === "accounts" || requested === "companies" ? requested : "overview";
  return <main className="pilot-main">
    <h1 className="pilot-title">Pilot operations</h1>
    <nav className="mt-5 flex flex-wrap gap-2" aria-label="Pilot operations views">
      {(["overview", "accounts", "companies"] as const).map(view => <button key={view} type="button"
        className={(tab === view ? "pilot-button" : "pilot-button-secondary") + " capitalize"}
        aria-pressed={tab === view} onClick={() => setParams(view === "overview" ? {} : { tab: view })}>{view}</button>)}
    </nav>
    {tab === "accounts" ? <PilotAccounts /> : tab === "companies" ? <PilotCompanies /> : <Overview />}
  </main>;
}

export default function PilotOperations() {
  const { session } = useAuth();
  return session?.user.role === "operator" ? <Operations /> : <Navigate to="/dashboard-home" replace />;
}
