CREATE TABLE colleague_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linkedin_profile_url text NOT NULL,
    name text NOT NULL,
    history jsonb NOT NULL,
    invitation_requested_at timestamptz,
    invitation_id uuid REFERENCES invites(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (owner_id, linkedin_profile_url)
);

CREATE INDEX colleague_drafts_requests_idx ON colleague_drafts (invitation_requested_at)
    WHERE invitation_requested_at IS NOT NULL;
