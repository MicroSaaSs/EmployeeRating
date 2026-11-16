import { Link, useLocation, useParams } from "react-router-dom";
import { useResource, type Colleague } from "../../utils/api";

export default function ProfessionalProfile() {
  const { id } = useParams();
  const state = useLocation().state as { directorySearch?: string } | null;
  const directory = "/professional-search-discovery" + (state?.directorySearch ? "?" + state.directorySearch : "");
  const result = useResource<Colleague & { eligible: boolean }>("/professionals/" + id);

  return (
    <main className="pilot-main">
      <Link className="pilot-link" to={directory}>Back to colleagues</Link>
      {result.error && <p role="alert" className="mt-6 text-red-800">{result.error}</p>}
      {!result.data && !result.error && <p role="status" className="mt-6">Loading profile…</p>}
      {result.data && <section className="pilot-card mt-6">
        <h1 className="pilot-title">{result.data.name}</h1>
        <p className="mt-3 text-slate-600">{result.data.eligible
          ? "Your reported dates overlap at the same company. You can leave a private rating."
          : "A rating requires overlapping dates at the same company."}</p>
        {result.data.eligible ? <Link className="pilot-button mt-5" to={"/professionals/" + id + "/rate"} state={state}>Open rating form</Link>
          : <Link className="pilot-link mt-5 inline-block" to="/work-history">Review your work history</Link>}
      </section>}
    </main>
  );
}
