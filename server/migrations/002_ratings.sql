CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    name_key text NOT NULL UNIQUE
);

CREATE TABLE work_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id),
    title text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX work_history_user_id_idx ON work_history (user_id);
CREATE INDEX work_history_company_id_idx ON work_history (company_id);

CREATE TABLE ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
    categories jsonb NOT NULL,
    feedback text NOT NULL,
    anonymous boolean NOT NULL,
    eligibility jsonb NOT NULL,
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (author_id <> recipient_id),
    UNIQUE (author_id, recipient_id)
);

CREATE INDEX ratings_recipient_id_idx ON ratings (recipient_id);

CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rating_id uuid NOT NULL UNIQUE REFERENCES ratings(id) ON DELETE CASCADE,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hidden', 'dismissed')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation_actions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    operator_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('hide', 'reinstate', 'dismiss')),
    note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pilot_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    submissions_paused boolean NOT NULL DEFAULT false
);

INSERT INTO pilot_settings DEFAULT VALUES;
