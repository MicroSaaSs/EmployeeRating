import { useId, useState } from "react";
import { Star } from "lucide-react";

const values = [1, 2, 3, 4, 5];

export function RatingStars({ value }: { value: number }) {
  return <span className="inline-flex items-center gap-2" role="img" aria-label={value + " out of 5 stars"}>
    <span className="flex gap-0.5" aria-hidden="true">
      {values.map(star => <Star key={star} size={16}
        className={star <= value ? "fill-amber-500 text-amber-700" : "text-slate-400"} />)}
    </span>
    <span className="text-sm font-semibold tabular-nums text-primary" aria-hidden="true">{value} / 5</span>
  </span>;
}

export function RatingStarInput({ label, value, onChange, required = false, compact = false }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  compact?: boolean;
}) {
  const name = useId();
  const [hover, setHover] = useState(0);

  return <fieldset className={compact ? "min-w-0 flex-1" : "min-w-0"} onMouseLeave={() => setHover(0)}>
    <legend className={compact ? "sr-only" : "break-words font-semibold"}>{label}</legend>
    <div className={compact ? "flex flex-wrap items-center justify-between gap-x-2" : "mt-1 flex flex-wrap items-center gap-x-3"}>
      {compact && <span className="min-w-0 flex-1 basis-24 break-words text-sm font-medium" aria-hidden="true">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="flex max-w-full flex-wrap" onPointerLeave={() => setHover(0)}>
          {values.map(star => <label key={star} className="cursor-pointer" onMouseEnter={() => setHover(star)}>
            <input type="radio" name={name} value={star} className="peer sr-only" checked={value === star}
              required={required} aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
              onChange={() => onChange(star)} />
            <span className={`flex items-center justify-center rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed ${compact ? "h-8 w-7" : "h-11 w-9 sm:w-11"}`}
              aria-hidden="true">
              <Star size={compact ? 17 : 25} className={star <= (hover || value) ? "fill-amber-500 text-amber-700" : "text-slate-400"} />
            </span>
          </label>)}
        </div>
        <span className={`tabular-nums text-slate-600 ${compact ? "w-8 text-right text-xs" : "text-sm"}`} aria-hidden="true">
          {value ? (compact ? value + "/5" : value + " / 5") : compact ? "–" : "Choose a score"}
        </span>
      </div>
    </div>
  </fieldset>;
}
