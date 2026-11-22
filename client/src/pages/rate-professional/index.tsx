import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { categories, message, send, useResource, type Colleague, type Rating } from "../../utils/api";

function Score({ label, value, required, setValue }: { label: string; value: number; required?: boolean; setValue: (value: number) => void }) {
  return <label className="block capitalize">
    {label}
    <select className="pilot-field mt-1" value={value || ""} required={required} onChange={(e) => setValue(Number(e.target.value))}>
      <option value="">Choose a score</option>
      {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} / 5</option>)}
    </select>
  </label>;
}

function RatingForm({ id, rating }: { id: string; rating: Rating | null }) {
  const [overall, setOverall] = useState(rating?.overall ?? 0);
  const [scores, setScores] = useState<Rating["categories"]>(rating?.categories ?? {});
  const [feedback, setFeedback] = useState(rating?.feedback ?? "");
  const [anonymous, setAnonymous] = useState(rating?.anonymous ?? true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const selected = Object.fromEntries(Object.entries(scores).filter(([, score]) => score > 0));
    try {
      await send("/ratings/for/" + id, "PUT", { overall, categories: selected, feedback, anonymous });
      navigate("/my-ratings-dashboard?tab=given", { replace: true, state: { saved: true } });
    } catch (failure) {
      setError(message(failure));
      setPending(false);
    }
  }

  return <form onSubmit={save} className="pilot-card mt-6">
    <fieldset className="space-y-5" disabled={pending || rating?.hidden}>
      <Score label="Overall" value={overall} required setValue={setOverall} />
      <fieldset>
        <legend className="font-semibold">Category scores</legend>
        <p className="mt-1 text-sm text-slate-600">Score at least three categories.</p>
        <div className="grid gap-3 mt-3 sm:grid-cols-2">
          {categories.map((category) => <Score key={category} label={category} value={scores[category] ?? 0}
            setValue={(score) => setScores({ ...scores, [category]: score })} />)}
        </div>
      </fieldset>
      <label className="block" >Written feedback
        <textarea className="pilot-field mt-1" required minLength={20} maxLength={2000} rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <span className="text-sm text-slate-600">20 to 2,000 characters. Use examples from your work together.</span>
      </label>
      <fieldset className="space-y-2">
        <legend className="font-semibold">How should your name appear?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="rating-attribution" checked={anonymous} onChange={() => setAnonymous(true)} />
          <span>Anonymous</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="rating-attribution" checked={!anonymous} onChange={() => setAnonymous(false)} />
          <span>Show my name to this colleague</span>
        </label>
        <p className="text-sm text-slate-600">The rating is private. Authorized administrators can see the author when reviewing a report.</p>
      </fieldset>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {rating?.hidden && <p role="status">This rating is hidden by moderation.</p>}
      <button className="pilot-button">{pending ? "Saving…" : rating ? "Save changes" : "Submit private rating"}</button>
    </fieldset>
  </form>;
}

export default function RateProfessional() {
  const { id = "" } = useParams();
  const { state } = useLocation();
  const person = useResource<Colleague>("/professionals/" + id);
  const previous = useResource<{ rating: Rating | null }>("/ratings/for/" + id);
  const error = person.error || previous.error;
  if (person.data && person.data.id !== id) {
    const target = person.data.eligible ? "/professionals/" + person.data.id + "/rate" : "/professionals/" + id;
    return <Navigate to={target} state={state} replace />;
  }
  return <main className="pilot-main max-w-3xl">
    <Link className="pilot-link" to={"/professionals/" + id} state={state}>Back to profile</Link>
    {error && <p className="mt-5 text-red-800" role="alert">{error}</p>}
    {(!person.data || !previous.data) && !error && <p className="mt-5" role="status">Loading rating form…</p>}
    {person.data && <h1 className="pilot-title mt-5">Rate {person.data.name}</h1>}
    {person.data?.draft && person.data.eligible && <p className="mt-2 text-slate-600">This private rating will be available to your colleague after they verify ownership of the draft.</p>}
    {person.data && !person.data.eligible && <p className="mt-4">A rating requires overlapping dates at the same company.</p>}
    {person.data?.eligible && previous.data && <RatingForm key={id} id={id} rating={previous.data.rating} />}
  </main>;
}
