CREATE TABLE rating_categories (
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name_key text NOT NULL,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    PRIMARY KEY (owner_id, name_key)
);
