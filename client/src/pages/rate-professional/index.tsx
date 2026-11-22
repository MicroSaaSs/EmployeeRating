import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { message, preparePrivateDraftRating, ratingCategoryLabel, send, useResource, type Colleague, type Rating } from "../../utils/api";
import { RatingStarInput } from "../../components/RatingStars";
import CategoryPicker from "./CategoryPicker";

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
      <RatingStarInput label="Overall rating" value={overall} required onChange={setOverall} />
      <section className="space-y-3 border-t border-border pt-4" aria-labelledby="rating-category-heading">
        <h2 className="font-semibold" id="rating-category-heading">Categories <span className="ml-1 text-sm font-normal text-slate-600">Optional</span></h2>
        {Object.keys(scores).length < 20
          ? <CategoryPicker selected={Object.keys(scores)} onSelect={name => setScores(current => ({ ...current, [name]: 0 }))} />
          : <p className="text-sm text-slate-600">You’ve added 20 categories.</p>}
        {Object.keys(scores).length > 0 && <ul className="divide-y divide-border rounded-lg border border-border">
          {Object.entries(scores).map(([name, score]) => <li key={name} className="flex items-center gap-2 px-3 py-1">
            <RatingStarInput label={ratingCategoryLabel(name)} value={score} compact
              onChange={value => setScores(current => ({ ...current, [name]: value }))} />
            <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={"Remove " + ratingCategoryLabel(name)} onClick={() => setScores(current => {
                const next = { ...current };
                delete next[name];
                return next;
              })}>
              <X size={16} aria-hidden="true" />
            </button>
          </li>)}
        </ul>}
      </section>
      <label className="block font-semibold">Written feedback <span className="ml-1 text-sm font-normal text-slate-600">Optional</span>
        <textarea className="pilot-field mt-1 font-normal" maxLength={2000} rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share an example from your work together" />
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

function LegacyDraftRating({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    preparePrivateDraftRating(id, controller.signal).then(recipient => {
      if (!controller.signal.aborted) navigate("/professionals/" + recipient.id + "/rate", { replace: true, state });
    }).catch(failure => {
      if (!controller.signal.aborted) setError(message(failure));
    });
    return () => controller.abort();
  }, [id, navigate, state]);

  return <main className="pilot-main max-w-3xl">
    <Link className="pilot-link" to={"/colleague-drafts#draft-" + id}>Back to saved draft</Link>
    <p className="mt-5" role={error ? "alert" : "status"}>{error || "Opening rating form…"}</p>
  </main>;
}

export default function RateProfessional() {
  const { id = "" } = useParams();
  const { state } = useLocation();
  const person = useResource<Colleague>("/professionals/" + id);
  const previous = useResource<{ rating: Rating | null }>("/ratings/for/" + id);
  const error = person.error || previous.error;
  if (person.data?.legacyDraft && person.data.eligible) return <LegacyDraftRating key={id} id={id} />;
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
