import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { browserImportToken, pendingBrowserImport, storeBrowserImport } from "../utils/browserImport";
import { message } from "../utils/api";

export default function BrowserImport() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const auth = useAuth();
  const [ready, setReady] = useState(() => browserImportToken.test(token) && !!pendingBrowserImport(token));
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ready || !browserImportToken.test(token)) return;
    let requests = 0;
    let complete = false;
    function receive(event: MessageEvent) {
      if (event.source !== window || event.origin !== location.origin ||
          event.data?.type !== "EPRORATE_IMPORT_RESULT" || event.data.token !== token || !event.data.ok || complete) return;
      try {
        storeBrowserImport(token, event.data.profile);
        complete = true;
        window.postMessage({ type: "EPRORATE_IMPORT_ACK", token }, location.origin);
        setReady(true);
      } catch (failure) {
        complete = true;
        setError(message(failure));
      }
    }
    function request() {
      if (complete) return;
      if (requests++ >= 20) {
        complete = true;
        setError("The browser import could not be received. Keep the extension enabled on E-ProRate and import the LinkedIn profile again.");
        return;
      }
      window.postMessage({ type: "EPRORATE_IMPORT_REQUEST", token }, location.origin);
    }
    window.addEventListener("message", receive);
    setError("");
    request();
    const timer = window.setInterval(request, 500);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", receive);
    };
  }, [token, ready, attempt]);

  if (ready && auth.session) return <Navigate to={"/colleague-drafts?import=" + token} replace />;
  return <main className="pilot-main max-w-2xl">
    <h1 className="pilot-title">LinkedIn browser import</h1>
    {!browserImportToken.test(token) && <p className="mt-4 text-red-800" role="alert">Open this page through the E-ProRate extension on a LinkedIn profile.</p>}
    {browserImportToken.test(token) && !ready && !error && <p className="mt-4" role="status">Receiving the profile from your browser…</p>}
    {(error || auth.error) && <div className="mt-4 space-y-3">
      <p className="text-red-800" role="alert">{error || auth.error}</p>
      <button type="button" className="pilot-button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button>
    </div>}
    {ready && !auth.isLoading && !auth.session && <section className="pilot-card mt-5">
      <h2 className="text-lg font-semibold">Sign in to review the profile</h2>
      <p className="mt-2 text-slate-600">Your import will be available on the dashboard after sign-in for 15 minutes.</p>
      <Link className="pilot-button mt-4" to="/login-register">Sign in to E-ProRate</Link>
    </section>}
  </main>;
}
