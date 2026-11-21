import { useState } from "react";
import { message, send, useResource } from "../utils/api";

interface InvitationRequest {
  id: string;
  name: string;
  linkedinProfileUrl: string;
  requestedBy: string;
  requestedAt: string;
}

export default function ColleagueInvitationRequests() {
  const [page, setPage] = useState(1);
  const [issued, setIssued] = useState<{ name: string; url: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requests = useResource<{ requests: InvitationRequest[]; hasMore: boolean }>("/pilot/colleague-invitations?page=" + page);

  async function issue(request: InvitationRequest) {
    setPending(true);
    setError("");
    try {
      const result = await send<{ url: string }>("/pilot/colleague-invitations/" + request.id, "POST");
      setIssued({ name: request.name, url: result.url });
      requests.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  return <section className="mt-6">
    <h2 className="text-xl font-semibold">Colleague invitation requests</h2>
    <p className="mt-2 text-slate-600">Participants requested invitations for these colleagues. Prepare a link and share it privately with the colleague or the requester.</p>
    {(error || requests.error) && <p className="mt-4 text-red-800" role="alert">{error || requests.error}</p>}
    {issued && <div className="pilot-card mt-4">
      <label className="block text-sm font-medium">Invitation for {issued.name}
        <input className="pilot-field mt-1" value={issued.url} readOnly onFocus={event => event.target.select()} />
      </label>
      <p className="mt-2 text-sm text-slate-600">Copy this single-use link before leaving. It expires in seven days.</p>
      <button type="button" className="pilot-button-secondary mt-3" onClick={() => setIssued(undefined)}>I have copied the link</button>
    </div>}
    {!requests.data && !requests.error && <p className="mt-4" role="status">Loading requests…</p>}
    {requests.data?.requests.length === 0 && <p className="pilot-card mt-4">No pending invitation requests.</p>}
    <ul className="mt-4 space-y-3">
      {requests.data?.requests.map(request => <li key={request.id} className="pilot-card flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{request.name}</h3>
          <a className="pilot-link mt-1 inline-block text-sm" href={request.linkedinProfileUrl} target="_blank" rel="noreferrer">Open LinkedIn profile</a>
          <p className="mt-2 text-sm text-slate-600">Requested by {request.requestedBy} · {new Date(request.requestedAt).toLocaleDateString()}</p>
        </div>
        <button type="button" className="pilot-button-secondary" disabled={pending || !!issued} onClick={() => void issue(request)}>Prepare invitation</button>
      </li>)}
    </ul>
    {(page > 1 || requests.data?.hasMore) && <nav className="mt-4 flex items-center gap-3" aria-label="Invitation request pages">
      <button type="button" className="pilot-button-secondary" disabled={page === 1 || pending} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="text-sm">Page {page}</span>
      <button type="button" className="pilot-button-secondary" disabled={!requests.data?.hasMore || pending} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </section>;
}
