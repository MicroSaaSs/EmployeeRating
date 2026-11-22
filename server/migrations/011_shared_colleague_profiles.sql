CREATE TABLE colleague_profiles (
    id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    linkedin_profile_url text NOT NULL UNIQUE,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    revision integer NOT NULL DEFAULT 1,
    claimed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    claimed_at timestamptz,
    CHECK (claimed_by <> id)
);

CREATE INDEX colleague_profiles_claimed_by_idx ON colleague_profiles (claimed_by) WHERE claimed_by IS NOT NULL;

ALTER TABLE invites ADD COLUMN colleague_profile_id uuid REFERENCES colleague_profiles(id) ON DELETE CASCADE;
ALTER TABLE invites ADD COLUMN invited_by uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX invites_colleague_profile_idx ON invites (colleague_profile_id) WHERE colleague_profile_id IS NOT NULL;

CREATE TABLE colleague_profile_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES colleague_profiles(id) ON DELETE CASCADE,
    claimant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code text NOT NULL,
    expires_at timestamptz NOT NULL,
    submitted_at timestamptz,
    submitted_revision integer,
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved boolean,
    UNIQUE (profile_id, claimant_id)
);

CREATE INDEX colleague_profile_claims_pending_idx ON colleague_profile_claims (submitted_at)
    WHERE submitted_at IS NOT NULL AND reviewed_at IS NULL;
