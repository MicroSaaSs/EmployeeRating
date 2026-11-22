import { useState } from "react";
import { message, send } from "../utils/api";

export default function ColleagueInvitationLink({ endpoint, profile, replaceId, disabled, onCreated }: {
  endpoint: string;
  profile: string;
  replaceId?: string | null;
  disabled?: boolean;
  onCreated?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function create() {
    setPending(true);
    setError("");
    try {
      const invitation = await send<{ url: string }>(endpoint, "POST", replaceId ? { replaceId } : undefined);
      setUrl(invitation.url);
      onCreated?.();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      setError("Select the invitation link and copy it manually.");
    }
  }

  return <div className="space-y-3">
    <p className="text-sm text-slate-600">{replaceId && !url
      ? "Creating a replacement expires the previous link. Copy the new one before leaving this page."
      : "Copy the single-use link before leaving this page and send it privately by LinkedIn message or email. It expires in seven days."}</p>
    {url ? <>
      <label className="block text-sm font-medium">Invitation link
        <input className="pilot-field mt-1" readOnly value={url} onFocus={event => event.currentTarget.select()} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="pilot-button" onClick={() => void copy()}>Copy invitation link</button>
        <a className="pilot-link text-sm" href={profile} target="_blank" rel="noreferrer">Open LinkedIn to send</a>
        {copied && <span role="status" className="text-sm text-success-800">Link copied</span>}
      </div>
    </> : <button type="button" className="pilot-button-secondary" disabled={pending || disabled} onClick={() => void create()}>
      {pending ? "Creating link…" : replaceId ? "Replace invitation link" : "Create invitation link"}
    </button>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
  </div>;
}
