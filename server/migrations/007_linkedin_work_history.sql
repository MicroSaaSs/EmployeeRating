ALTER TABLE work_history ADD COLUMN linkedin_source jsonb;

CREATE UNIQUE INDEX work_history_linkedin_source_idx
    ON work_history (user_id, linkedin_source) WHERE linkedin_source IS NOT NULL;
