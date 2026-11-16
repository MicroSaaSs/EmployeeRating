CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer text NOT NULL,
    subject text NOT NULL,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
    role text NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'operator')),
    directory_visible boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (issuer, subject)
);

CREATE TABLE invites (
    digest text PRIMARY KEY,
    role text NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'operator')),
    expires_at timestamptz NOT NULL,
    redeemed_at timestamptz
);

CREATE TABLE oauth_attempts (
    state_digest text PRIMARY KEY,
    browser_digest text NOT NULL,
    invite_digest text,
    expires_at timestamptz NOT NULL
);

CREATE TABLE sessions (
    digest text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE rate_limits (
    bucket text NOT NULL,
    window_start timestamptz NOT NULL,
    hits integer NOT NULL,
    PRIMARY KEY (bucket, window_start)
);
