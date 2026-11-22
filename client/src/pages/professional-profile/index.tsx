import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { message, send, useResource, type Colleague, type SharedColleagueDraft } from "../../utils/api";
import SharedWorkDatesTag from "../../components/SharedWorkDatesTag";
import ColleagueInvitationLink from "../../components/ColleagueInvitationLink";

function SharedDraft({ id, fromInvitation }: { id: string; fromInvitation: boolean }) {
  const path = "/colleague-profiles/" + id;
  const draft = useResource<SharedColleagueDraft>(path);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function act(action: "start" | "submit", revision: number) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (action === "start") await send(path + "/claim", "POST");
      else await send(path + "/claim", "PUT", { revision });
      draft.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(success);
      setError("");
    } catch {
      setError("Select and copy the text manually.");
    }
  }

  if (!draft.data) return <p className="mt-5" role={draft.error ? "alert" : "status"}>{draft.error ?? "Loading shared work history…"}</p>;
  const { name, history, linkedinProfileUrl, claim, revision, invitedBy, overlappingRoleIds, shared, canInvite, canClaim } = draft.data;

  return <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    {shared !== false && <section className="pilot-card" aria-labelledby="shared-work-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="shared-work-heading" className="text-lg font-semibold">Draft work history</h2>
        <Link to={"/colleague-drafts?edit=" + id} className="pilot-button-secondary">Edit draft</Link>
      </div>
      <p className="mt-2 text-sm text-slate-600">Members can correct these roles and dates until {name} claims the profile.</p>
      {history.length ? <ul className="mt-3 divide-y divide-border">
        {history.map(role => <li className="py-3" key={role.id}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{role.title}</p>
            {overlappingRoleIds?.includes(role.id) && <SharedWorkDatesTag />}
          </div>
          <p>{role.company}</p>
          <p className="text-sm text-slate-600">{role.start} to {role.end || "present"}</p>
        </li>)}
      </ul> : <p className="mt-4 text-slate-600">No work roles added yet.</p>}
    </section>}
    <div className="space-y-4">
      {canClaim !== false && <section className="pilot-card" aria-labelledby="claim-draft-heading">
        <h2 id="claim-draft-heading" className="text-lg font-semibold">Claim this profile</h2>
        {invitedBy && <p className="mt-2 text-sm font-medium">Invited by {invitedBy}</p>}
        <p className="mt-2 text-sm text-slate-600">{shared === false
          ? "Verify your LinkedIn profile to receive your private ratings."
          : "If this is your LinkedIn profile, verify ownership to take over the work history and receive your private ratings."}</p>
        {claim ? claim.submitted ? <>
          <p className="mt-3 font-medium" role="status">Verification is awaiting review.</p>
          <p className="mt-1 text-sm text-slate-600">Leave the code in your LinkedIn About section until the review is complete.</p>
          <button className="pilot-button-secondary mt-3" type="button" onClick={() => window.location.reload()}>Check status</button>
        </> : <>
          <label className="mt-3 block text-sm font-medium">Your verification code
            <input className="pilot-field mt-1 font-mono" readOnly value={claim.code} onFocus={event => event.currentTarget.select()} />
          </label>
          <p className="mt-2 text-sm text-slate-600">{shared === false
            ? "Add this code to your LinkedIn About section, then submit for approval."
            : "Add this code to the About section of the LinkedIn profile linked below. Review the draft roles, then submit for approval. Those roles will be added to your work history when approved."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="pilot-button-secondary" onClick={() => void copy(claim.code, "Verification code copied.")}>Copy code</button>
            <button type="button" className="pilot-button" disabled={pending} onClick={() => void act("submit", revision)}>Submit for approval</button>
          </div>
        </> : <button type="button" className={fromInvitation ? "pilot-button mt-3" : "pilot-button-secondary mt-3"} disabled={pending}
          onClick={() => void act("start", revision)}>Verify my LinkedIn profile</button>}
        <a className="pilot-link mt-3 block text-sm" href={linkedinProfileUrl} target="_blank" rel="noreferrer">Open LinkedIn profile</a>
      </section>}
      {canInvite !== false && <section className="pilot-card" aria-labelledby="send-invite-heading">
        <h2 id="send-invite-heading" className="text-lg font-semibold">Invite {name}</h2>
        <div className="mt-2">
          <ColleagueInvitationLink endpoint={path + "/invitations"} profile={linkedinProfileUrl} />
        </div>
      </section>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {notice && <p role="status" className="text-success-800">{notice}</p>}
    </div>
  </div>;
}

export default function ProfessionalProfile() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const state = useLocation().state as { directorySearch?: string; draftNotice?: string } | null;
  const directory = "/professional-search-discovery" + (state?.directorySearch ? "?" + state.directorySearch : "");
  const result = useResource<Colleague>("/professionals/" + id);
  const person = result.data;
  const fromInvitation = params.get("claim") === "1";

  return (
    <main className="pilot-main">
      <Link className="pilot-link" to={directory}>Back to colleagues</Link>
      {result.error && <p role="alert" className="mt-6 text-red-800">{result.error}</p>}
      {!person && !result.error && <p role="status" className="mt-6">Loading profile…</p>}
      {person && <>
        <section className="pilot-card mt-6">
          {state?.draftNotice && person.draft && <p role="status" className="mb-2 text-sm text-success-800">{state.draftNotice}</p>}
          <h1 className="pilot-title">{person.name}</h1>
          {person.draft && <p className="mt-2 text-sm font-medium text-slate-600">{person.privateDraft ? "Private draft" : "Shared draft"} · awaiting owner</p>}
          <p className="mt-3 text-slate-600">{person.claimedByViewer
            ? person.privateDraft ? "You claimed this profile. Your private ratings are now in your account."
              : "You claimed this profile. Its work history and private ratings are now in your account."
            : person.eligible ? "Your saved work dates overlap at the same company. You can leave a private rating."
              : person.draft && fromInvitation ? "Verify your LinkedIn profile to claim this invitation."
              : "A rating requires overlapping work dates at the same company."}</p>
          {person.eligible ? <Link className="pilot-button mt-5" to={"/professionals/" + person.id + "/rate"} state={state}>Open rating form</Link>
            : !(person.draft && fromInvitation) && <Link className="pilot-link mt-5 inline-block" to="/work-history">{person.claimedByViewer ? "Open my work history" : "Review my work history"}</Link>}
        </section>
        {person.draft && <SharedDraft key={id} id={id} fromInvitation={fromInvitation} />}
      </>}
    </main>
  );
}
