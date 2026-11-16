// In eligibility queries, a and r are the author's and recipient's work entries.
export const overlapStart = "greatest(a.start_date, r.start_date)";
export const overlapEnd = `least(
  coalesce(a.end_date, (now() AT TIME ZONE 'UTC')::date),
  coalesce(r.end_date, (now() AT TIME ZONE 'UTC')::date)
)`;
