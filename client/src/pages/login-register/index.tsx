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
    ? "Your E-ProRate account is suspended."
    : callbackError === "invite" ? "This invitation could not be applied. You can still continue with LinkedIn."
    : "Sign-in could not be completed. Please try again.";
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
          <p className="mt-5 text-lg text-slate-600">Add your work history and exchange private feedback with colleagues whose time at the same company overlaps with yours.</p>
        </div>
        <section className="pilot-card">
          <h2 className="text-xl font-semibold">{invite ? "Accept your invitation" : "Get started with E-ProRate"}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {invite ? "Continue with LinkedIn to link this invitation to your account." : "Use LinkedIn to create an account or sign in."}
          </p>
          {session && !invite ? (
            <Link className="pilot-button mt-5" to="/dashboard-home">Open your dashboard</Link>
          ) : (
            <button type="button" className="pilot-button mt-5" disabled={pending} onClick={signIn}>
              <Linkedin aria-hidden="true" size={18} /> {pending ? "Opening LinkedIn…" : "Continue with LinkedIn"}
            </button>
          )}
          {invite && <Link className="pilot-link ml-3 inline-block text-sm" to="/login-register">Continue without invitation</Link>}
          {(error || callbackError) && <p role="alert" className="mt-3 text-sm text-red-800">
            {error || callbackMessage}
          </p>}
          <p className="mt-5 text-sm text-slate-600">
            Read the <Link className="pilot-link" to="/terms">community rules</Link> and <Link className="pilot-link" to="/privacy">privacy notice</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}

export function PilotPolicy({ privacy = false }: { privacy?: boolean }) {
  return <><PublicHeader /><main className="pilot-main max-w-3xl">
    <h1 className="pilot-title">{privacy ? "Privacy notice" : "Community rules"}</h1>
    <div className="pilot-card mt-6 space-y-4 leading-relaxed">
      {privacy ? <>
        <p>We use your LinkedIn account identifier and display name for sign-in. If you accept an invitation, we record that it was used by your account. E-ProRate uses the work dates you save to find colleagues who worked at the same company at the same time. Those colleagues can find your profile and give you private feedback. Your saved employment dates stay private.</p>
        <p>Members can add and update a shared draft using a public LinkedIn profile link. Signed-in members can find shared drafts and view their draft roles. Your previously saved private drafts are searchable only by you. You can leave feedback from a private draft when your work dates overlap.</p>
        <p>Ratings are private to the author and recipient. Feedback for a shared draft becomes available to the colleague who verifies ownership. Anonymous mode hides your name from the recipient. Authorized administrators can review reported feedback, authorship, and the recorded date overlap.</p>
        <p>Administrators can see aggregate activity, including how often received ratings are opened and how long report decisions take.</p>
        <p>Contact E-ProRate support to request access to or removal of your account data.</p>
      </> : <>
        <p>Enter work history accurately. Use public professional information for shared drafts. Keep ratings relevant to your time working together and base feedback on your own experience.</p>
        <p>Use the report action for harassment, impersonation, or sensitive personal information. An operator can hide a rating while handling a report.</p>
        <p>Administrators can suspend accounts. Contact E-ProRate support if you believe your account was suspended in error.</p>
      </>}
      {supportEmail && <p>For support, email <a className="pilot-link" href={"mailto:" + supportEmail}>{supportEmail}</a>.</p>}
      <Link className="pilot-link" to="/">Back to E-ProRate</Link>
    </div>
  </main></>;
}
