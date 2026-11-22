// In eligibility queries, a and r are the author's and recipient's work entries.
export const overlapStart = "greatest(a.start_date, r.start_date)";
export const overlapEnd = `least(
  coalesce(a.end_date, (now() AT TIME ZONE 'UTC')::date),
  coalesce(r.end_date, (now() AT TIME ZONE 'UTC')::date)
)`;

export const overlapsWorkEntry = (viewer: string) => `EXISTS (
  SELECT 1 FROM work_history a WHERE a.user_id = ${viewer} AND a.company_id = r.company_id
    AND ${overlapStart} <= ${overlapEnd}
)`;

export const draftWorkEntries = (history: string) => `
  SELECT role.position, (role.entry->>'start')::date AS start_date, (role.entry->>'end')::date AS end_date,
    coalesce(alias.company_id, c.id) AS company_id
  FROM jsonb_array_elements(${history}) WITH ORDINALITY role(entry, position)
  LEFT JOIN company_aliases alias ON alias.name_key=lower(role.entry->>'company')
  LEFT JOIN companies c ON alias.company_id IS NULL AND c.name_key=lower(role.entry->>'company')
`;

export const overlapsDraftWork = (viewer: string, history: string) => `EXISTS (
  SELECT 1 FROM (${draftWorkEntries(history)}) r WHERE ${overlapsWorkEntry(viewer)}
)`;

// These checks use the current viewer and the canonical colleague profile alias p.
export const ownsPrivateDraft = (viewer: string) => `EXISTS (
  SELECT 1 FROM colleague_drafts d WHERE d.owner_id=${viewer} AND d.linkedin_profile_url=p.linkedin_profile_url
)`;
export const redeemedDraftInvite = (viewer: string) => `EXISTS (
  SELECT 1 FROM invites i WHERE i.redeemed_by=${viewer} AND i.colleague_profile_id=p.id
)`;
export const overlapsPrivateDraft = (viewer: string, recipient: string) => `EXISTS (
  SELECT 1 FROM colleague_profiles p JOIN colleague_drafts d ON d.linkedin_profile_url=p.linkedin_profile_url
  WHERE p.id=${recipient} AND p.claimed_at IS NULL AND d.owner_id=${viewer}
    AND ${overlapsDraftWork(viewer, "d.history")}
)`;
