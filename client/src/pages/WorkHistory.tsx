import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { message, send, useResource, type WorkEntry } from "../utils/api";

const empty = { company: "", title: "", start: "", end: "" };

export default function WorkHistory() {
  const work = useResource<{ history: WorkEntry[]; visible: boolean }>("/work-history");
  const [entry, setEntry] = useState(empty);
  const [editing, setEditing] = useState<string>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function change(run: () => Promise<void>, success: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await run();
      setNotice(success);
      work.refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void change(async () => {
      await send(editing ? "/work-history/" + editing : "/work-history", editing ? "PUT" : "POST", {
        ...entry, end: entry.end || null,
      });
      setEntry(empty);
      setEditing(undefined);
    }, "Work history saved.");
  }

  return (
    <main className="pilot-main">
      <h1 className="pilot-title">My work history</h1>
      <p className="mt-2 text-slate-600">Add the companies and dates you want to use to find eligible colleagues. Your entries are self-reported and stay out of the pilot directory.</p>
      {(error || work.error) && <p className="mt-4 text-red-800" role="alert">{error || work.error}</p>}
      {notice && <p className="mt-4 text-success-800" role="status">{notice}</p>}
      {work.data && work.data.history.length > 0 && <Link className="pilot-button mt-5" to="/professional-search-discovery?eligible=1">
        Find eligible colleagues
      </Link>}
      <div className="grid gap-5 mt-7 md:grid-cols-2">
        <form className="pilot-card" onSubmit={save}>
          <fieldset disabled={pending} className="space-y-4">
            <legend className="text-lg font-semibold mb-3">{editing ? "Edit an entry" : "Add an entry"}</legend>
            <label className="block">Company <input className="pilot-field mt-1" value={entry.company} required maxLength={120} onChange={(e) => setEntry({ ...entry, company: e.target.value })} /></label>
            <label className="block">Job title <input className="pilot-field mt-1" value={entry.title} required maxLength={120} onChange={(e) => setEntry({ ...entry, title: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">Start date <input className="pilot-field mt-1" type="date" value={entry.start} required onChange={(e) => setEntry({ ...entry, start: e.target.value })} /></label>
              <label className="block">End date <input className="pilot-field mt-1" type="date" value={entry.end} min={entry.start} onChange={(e) => setEntry({ ...entry, end: e.target.value })} /></label>
            </div>
            <p className="text-sm text-slate-600">Leave the end date blank if you still work there.</p>
            <div className="flex gap-3">
              <button className="pilot-button">Save entry</button>
              {editing && <button type="button" className="pilot-button-secondary" onClick={() => { setEditing(undefined); setEntry(empty); }}>Cancel</button>}
            </div>
          </fieldset>
        </form>
        <div className="space-y-4">
          <section className="pilot-card">
            <h2 className="text-lg font-semibold">Pilot directory</h2>
            {work.data && <label className="mt-3 flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={work.data.visible} disabled={pending} onChange={(e) => {
                const visible = e.target.checked;
                void change(() => send("/directory-visibility", "PUT", { visible }), "Directory setting saved.");
              }} />
              <span>Let invited participants find me by name and check whether they can rate me.</span>
            </label>}
          </section>
          <section className="pilot-card">
            <h2 className="text-lg font-semibold">Your entries</h2>
            {!work.data && !work.error && <p className="mt-3" role="status">Loading work history…</p>}
            {work.data?.history.length === 0 && <p className="mt-3 text-slate-600">You haven’t added any entries yet.</p>}
            <ul className="divide-y divide-border">
              {work.data?.history.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="font-semibold">{item.company}</p>
                  <p>{item.title}</p>
                  <p className="text-sm text-slate-600">{item.start} to {item.end || "present"}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="pilot-button-secondary" disabled={pending} onClick={() => {
                      setEditing(item.id);
                      setEntry({ company: item.company, title: item.title, start: item.start, end: item.end || "" });
                    }}>Edit</button>
                    <button className="pilot-button-secondary" disabled={pending} onClick={() => {
                      if (!window.confirm("Remove this work history entry?")) return;
                      void change(async () => {
                        await send("/work-history/" + item.id, "DELETE");
                        if (editing === item.id) { setEditing(undefined); setEntry(empty); }
                      }, "Work history entry removed.");
                    }}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
