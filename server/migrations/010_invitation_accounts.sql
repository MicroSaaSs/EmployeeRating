ALTER TABLE invites ADD COLUMN redeemed_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX invites_redeemed_by_idx ON invites (redeemed_by) WHERE redeemed_by IS NOT NULL;
