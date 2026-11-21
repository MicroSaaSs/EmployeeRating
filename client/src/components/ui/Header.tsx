import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { message } from "../../utils/api";

const links = [
  ["/dashboard-home", "Dashboard"],
  ["/work-history", "Work history"],
  ["/professional-search-discovery", "Colleagues"],
  ["/my-ratings-dashboard", "My ratings"],
];

export default function Header() {
  const { session, logout } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signOut() {
    setError("");
    setPending(true);
    try {
      await logout();
    } catch (failure) {
      setError(message(failure));
      setPending(false);
    }
  }

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-x-6 gap-y-3 items-center">
        <Link to="/dashboard-home" className="flex gap-2 items-center font-semibold text-primary"><Users aria-hidden="true" size={19} /> E-ProRate</Link>
        <nav aria-label="Main" className="order-last sm:order-none w-full sm:flex-1 flex flex-wrap gap-1">
          {[...links, ...(session?.user.role === "operator"
            ? [["/moderation", "Moderation"], ["/administration", "Administration"]]
            : [])].map(([path, label]) =>
            <NavLink key={path} to={path} className={({ isActive }) =>
              "px-2.5 py-1.5 rounded-md text-sm " + (isActive ? "bg-primary-50 text-primary font-semibold" : "text-slate-600 hover:bg-slate-50")
            }>{label}</NavLink>,
          )}
        </nav>
        <button className="pilot-button-secondary ml-auto" onClick={signOut} disabled={pending}>Sign out</button>
      </div>
      {error && <p className="max-w-6xl mx-auto px-5 pb-3 text-red-800" role="alert">{error}</p>}
    </header>
  );
}
