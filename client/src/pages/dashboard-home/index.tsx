import { Link } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { useResource } from "../../utils/api";
import { pendingBrowserImport } from "../../utils/browserImport";

interface DashboardSummary {
  workHistoryCount: number;
  directoryVisible: boolean;
  eligibleColleagueCount: number;
  unopenedRatingCount: number;
}

const workHistory = "/work-history";
const colleagues = "/professional-search-discovery";
const ratings = "/my-ratings-dashboard?tab=received";

function nextStep({ workHistoryCount, eligibleColleagueCount }: DashboardSummary) {
  if (!workHistoryCount) return {
    title: "Start with your work history",
    detail: "Add a role or import your LinkedIn experience so E-ProRate can check whether your work dates overlap with a colleague’s.",
    label: "Add work history",
    destination: workHistory,
  };
  if (!eligibleColleagueCount) return {
    title: "No eligible colleagues yet",
    detail: "A colleague needs overlapping dates at the same company and must be visible in the directory. Review your dates or browse the directory.",
    label: "Browse colleagues",
    destination: colleagues,
  };
  return {
    title: eligibleColleagueCount === 1 ? "1 eligible colleague" : `${eligibleColleagueCount} eligible colleagues`,
    detail: "Your reported work dates overlap with these colleagues. You can give them private feedback.",
    label: "Find eligible colleagues",
    destination: colleagues + "?eligible=1",
  };
}

function DashboardCards({ summary }: { summary: DashboardSummary }) {
  const { workHistoryCount, directoryVisible, unopenedRatingCount } = summary;
  const next = nextStep(summary);
  return <>
    <section className="mt-7 rounded-xl border border-primary-100 bg-primary-50 p-5 sm:p-6" aria-labelledby="dashboard-next">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-lg">
          <h2 id="dashboard-next" className="text-xl font-semibold text-primary">{next.title}</h2>
          <p className="mt-2 text-slate-700">{next.detail}</p>
        </div>
        <Link className="pilot-button" to={next.destination}>{next.label}</Link>
      </div>
    </section>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <section className="pilot-card">
        <h2 className="text-lg font-semibold">Work history</h2>
        <p className="mt-2 text-slate-600">{workHistoryCount === 1 ? "1 role added" : `${workHistoryCount} roles added`}</p>
        {workHistoryCount > 0 && <Link className="pilot-link mt-3 inline-block" to={workHistory}>Manage work history</Link>}
      </section>
      <section className="pilot-card">
        <h2 className="text-lg font-semibold">Directory visibility</h2>
        <p className="mt-2 text-slate-600">{directoryVisible ? "Pilot participants can find you by name." : "Your profile is hidden from the pilot directory."}</p>
        <Link className="pilot-link mt-3 inline-block" to={workHistory + "#directory-visibility"}>Change directory visibility</Link>
      </section>
      <section className="pilot-card">
        <h2 className="text-lg font-semibold">My ratings</h2>
        <p className="mt-2 text-slate-600">{unopenedRatingCount === 1 ? "1 new rating to read" :
          unopenedRatingCount ? `${unopenedRatingCount} new ratings to read` : "No new ratings"}</p>
        <Link className="pilot-link mt-3 inline-block" to={ratings}>{unopenedRatingCount ? "Read feedback" : "Open my ratings"}</Link>
      </section>
    </div>
  </>;
}

export default function DashboardHome() {
  const { session } = useAuth();
  const summary = useResource<DashboardSummary>("/dashboard");
  const imported = pendingBrowserImport();

  return <main className="pilot-main">
    <h1 className="pilot-title">Welcome, {session?.user.name}</h1>
    {imported && <section className="pilot-card mt-5">
      <h2 className="text-lg font-semibold">LinkedIn profile ready to review</h2>
      <p className="mt-2 text-slate-600">{imported.profile.name || "Your imported colleague"} · Imported from your browser</p>
      <Link className="pilot-button mt-3" to={"/colleague-drafts?import=" + imported.token}>Review imported profile</Link>
    </section>}
    {summary.error && <div className="mt-5 flex flex-wrap items-center gap-3">
      <p className="text-red-800" role="alert">{summary.error}</p>
      <button type="button" className="pilot-button-secondary" onClick={summary.refresh}>Try again</button>
    </div>}
    {!summary.data && !summary.error && <p className="mt-5 text-slate-600" role="status">Loading your dashboard…</p>}
    {summary.data && <DashboardCards summary={summary.data} />}
    <details className="mt-6 text-sm text-slate-600">
      <summary className="cursor-pointer">Account reference for support</summary>
      <p className="mt-2 break-all"><code>{session?.user.id}</code></p>
    </details>
  </main>;
}
