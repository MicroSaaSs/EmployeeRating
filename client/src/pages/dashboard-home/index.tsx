import { Link } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { useResource, type WorkEntry } from "../../utils/api";

export default function DashboardHome() {
  const { session } = useAuth();
  const { data, error } = useResource<{ history: WorkEntry[]; visible: boolean }>("/work-history");
  const needsHistory = data?.history.length === 0;

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">Welcome, {session?.user.name}</h1>
      {error && <p className="mt-4 text-red-800" role="alert">{error}</p>}
      <div className="grid gap-4 mt-7 sm:grid-cols-3">
        <section className="pilot-card">
          <h2 className="font-semibold text-lg">Work history</h2>
          <p className="mt-2 mb-4 text-slate-600">{needsHistory ? "Start by adding a company and the dates you worked there." : "Manage your employment dates and directory visibility."}</p>
          <Link className={needsHistory ? "pilot-button" : "pilot-link"} to="/work-history">{needsHistory ? "Add work history" : "Manage work history"}</Link>
        </section>
        <section className="pilot-card">
          <h2 className="font-semibold text-lg">Find colleagues</h2>
          <p className="mt-2 mb-4 text-slate-600">Find invited participants and see whether your work dates overlap.</p>
          {data && data.history.length > 0
            ? <Link className="pilot-link" to="/professional-search-discovery?eligible=1">Find eligible colleagues</Link>
            : <Link className="pilot-link" to="/professional-search-discovery">Open the directory</Link>}
        </section>
        <section className="pilot-card">
          <h2 className="font-semibold text-lg">My ratings</h2>
          <p className="mt-2 mb-4 text-slate-600">See your given and received ratings or report inappropriate feedback.</p>
          <Link className="pilot-link" to="/my-ratings-dashboard">Open my ratings</Link>
        </section>
      </div>
      <details className="mt-6 text-sm text-slate-600">
        <summary className="cursor-pointer">Account reference for support</summary>
        <p className="mt-2 break-all"><code>{session?.user.id}</code></p>
      </details>
    </main>
  );
}
