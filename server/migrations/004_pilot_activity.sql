ALTER TABLE invites
    ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    ADD COLUMN revoked_at timestamptz;

ALTER TABLE oauth_attempts ADD COLUMN counted boolean NOT NULL DEFAULT false;

ALTER TABLE ratings ADD COLUMN first_opened_at timestamptz;

ALTER TABLE reports ADD COLUMN responded_at timestamptz;

UPDATE reports p
SET responded_at = (
    SELECT min(a.created_at) FROM moderation_actions a
    WHERE a.report_id = p.id AND a.created_at >= p.created_at
);

CREATE TABLE pilot_activity_counts (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    measured_from timestamptz NOT NULL DEFAULT now(),
    sign_ins_started bigint NOT NULL DEFAULT 0,
    sign_ins_completed bigint NOT NULL DEFAULT 0,
    invites_issued bigint NOT NULL DEFAULT 0,
    invites_redeemed bigint NOT NULL DEFAULT 0
);

INSERT INTO pilot_activity_counts (invites_issued, invites_redeemed)
SELECT count(*), count(redeemed_at) FROM invites;
