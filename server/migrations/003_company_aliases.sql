CREATE TABLE company_aliases (
    name_key text PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id)
);
