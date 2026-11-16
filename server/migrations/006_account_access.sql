ALTER TABLE users ADD COLUMN suspended_at timestamptz;

CREATE TABLE account_access_actions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operator_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('suspend', 'restore')),
    note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX account_access_actions_history_idx ON account_access_actions (user_id, id DESC);
