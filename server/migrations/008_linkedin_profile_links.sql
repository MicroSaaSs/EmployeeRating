ALTER TABLE users ADD COLUMN linkedin_profile_url text;

CREATE INDEX users_linkedin_profile_url_idx
    ON users (linkedin_profile_url) WHERE linkedin_profile_url IS NOT NULL;
