import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Linkedin, Users } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { message, send, supportEmail } from "../../utils/api";

function PublicHeader() {
  return <header className="max-w-5xl mx-auto px-6 py-7 flex items-center">
    <Link to="/" className="flex gap-2 items-center font-semibold text-primary"><Users aria-hidden="true" size={22} /> E-ProRate</Link>
  </header>;
}

export default function LoginRegister() {
  const { session } = useAuth();
  const location = useLocation();
  const invite = new URLSearchParams(location.hash.slice(1)).get("invite");
  const callbackError = new URLSearchParams(location.search).get("error");
  const callbackMessage = callbackError === "suspended"
    ? "This pilot account is suspended. See the privacy notice for the pilot support contact."
    : callbackError === "invite" ? "Open a valid invitation link to join the pilot."
    : "Sign-in could not be completed. Try again from your invitation if you have one.";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError("");
    try {
      const { url } = await send<{ url: string }>("/auth/linkedin/start", "POST", invite ? { invite } : {});
      window.location.assign(url);
    } catch (failure) {
      setError(message(failure));
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-6 py-14 sm:py-20 grid gap-10 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl leading-tight tracking-tight font-semibold text-primary">Private feedback from people you worked with</h1>
          <p className="mt-5 text-lg text-slate-600">E-ProRate is an invitation-only pilot. Add your work history and exchange ratings with colleagues whose time at the same company overlaps with yours.</p>
        </div>
        <section className="pilot-card">
          <h2 className="text-xl font-semibold">{invite ? "Join the pilot" : "Access the pilot"}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {invite ? "Sign in with LinkedIn to redeem this invitation." : "New participants join through an invitation link. Returning participants can sign in below."}
          </p>
          {session ? (
            <Link className="pilot-button mt-5" to="/dashboard-home">Open your dashboard</Link>
          ) : (
            <button type="button" className="pilot-button mt-5" disabled={pending} onClick={signIn}>
              <Linkedin aria-hidden="true" size={18} /> {pending ? "Opening LinkedIn…" : "Continue with LinkedIn"}
            </button>
          )}
          {(error || callbackError) && <p role="alert" className="mt-3 text-sm text-red-800">
            {error || callbackMessage}
          </p>}
          <p className="mt-5 text-sm text-slate-600">
            Read the <Link className="pilot-link" to="/terms">pilot rules</Link> and <Link className="pilot-link" to="/privacy">privacy notice</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}

export function PilotPolicy({ privacy = false }: { privacy?: boolean }) {
  return <><PublicHeader /><main className="pilot-main max-w-3xl">
    <h1 className="pilot-title">{privacy ? "Pilot privacy notice" : "Pilot rules"}</h1>
    <div className="pilot-card mt-6 space-y-4 leading-relaxed">
      {privacy ? <>
        <p>We use your LinkedIn account identifier and display name for sign-in. You enter your employer and dates. If you opt into the pilot directory, other signed-in participants can find you by name and see whether they are eligible to rate you.</p>
        <p>Ratings are private to the author and recipient. Anonymous mode hides your name from the recipient. Authorized operators can review reported feedback, authorship, and the recorded date overlap. Work history and feedback can identify people, so avoid naming others in a rating.</p>
        <p>Operators can see aggregate pilot activity, including how often received ratings are opened and how long report decisions take.</p>
        <p>Contact pilot support to request access to or removal of your account data.</p>
      </> : <>
        <p>Enter your own work history accurately. Keep ratings relevant to your time working together and base feedback on your own experience.</p>
        <p>Use the report action for harassment, impersonation, or sensitive personal information. An operator can hide a rating while handling a report.</p>
        <p>Operators can suspend pilot access. Contact pilot support if you believe your account was suspended in error.</p>
      </>}
      <p>For pilot support, {supportEmail ? <a className="pilot-link" href={"mailto:" + supportEmail}>{supportEmail}</a> : "contact the person who invited you"}.</p>
      <Link className="pilot-link" to="/">Back to E-ProRate</Link>
    </div>
  </main></>;
}
