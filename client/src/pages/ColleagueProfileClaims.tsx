import { useState, type FormEvent } from "react";
import { message, send, useResource } from "../utils/api";

interface Claim {
  id: string;
  name: string;
  claimantName: string;
  linkedinProfileUrl: string;
}

function ClaimReview({ claim, onReview }: { claim: Claim; onReview: (notice: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function review(observedCode: string | null) {
    setPending(true);
    setError("");
    try {
      await send("/pilot/colleague-claims/" + claim.id, "PUT", { code: observedCode });
      onReview(observedCode === null ? "Verification declined." : "Profile ownership approved.");
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void review(code.trim());
  }

  return <li className="pilot-card">
    <h3 className="font-semibold">{claim.name}</h3>
    <p className="mt-1 text-sm text-slate-600">Claim requested by {claim.claimantName}</p>
    <a className="pilot-link mt-2 inline-block text-sm" href={claim.linkedinProfileUrl} rel="noreferrer" target="_blank">Open LinkedIn profile</a>
    <form className="mt-4" onSubmit={approve}>
      <label className="block text-sm font-medium">Code shown in the LinkedIn About section
        <input className="pilot-field mt-1 max-w-xs font-mono" required minLength={20} maxLength={20} value={code}
          onChange={event => setCode(event.target.value)} autoComplete="off" />
      </label>
      <div className="mt-3 flex flex-wrap gap-3">
        <button className="pilot-button" disabled={pending}>Approve ownership</button>
        <button type="button" className="pilot-button-secondary" disabled={pending} onClick={() => void review(null)}>Decline</button>
      </div>
    </form>
    {error && <p className="mt-3 text-red-800" role="alert">{error}</p>}
  </li>;
}

export default function ColleagueProfileClaims() {
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const queue = useResource<{ claims: Claim[]; hasMore: boolean }>("/pilot/colleague-claims?page=" + page);

  return <section className="mt-6" aria-labelledby="profile-claims-heading">
    <h2 className="text-xl font-semibold" id="profile-claims-heading">Profile ownership requests</h2>
    <p className="mt-2 text-slate-600">Open the LinkedIn profile and enter the verification code you see in its About section. Approval gives the claimant control of the work history and access to their private ratings.</p>
    {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
    {queue.error && <p className="mt-4 text-red-800" role="alert">{queue.error}</p>}
    {!queue.data && !queue.error && <p className="mt-4" role="status">Loading requests…</p>}
    {queue.data?.claims.length === 0 && <p className="pilot-card mt-4">No requests awaiting review.</p>}
    <ul className="mt-4 space-y-3">
      {queue.data?.claims.map(claim => <ClaimReview key={claim.id} claim={claim} onReview={result => {
        setNotice(result);
        queue.refresh();
      }} />)}
    </ul>
    {(page > 1 || queue.data?.hasMore) && <nav className="mt-4 flex items-center gap-3" aria-label="Ownership request pages">
      <button type="button" className="pilot-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button type="button" className="pilot-button-secondary" disabled={!queue.data?.hasMore} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </section>;
}
