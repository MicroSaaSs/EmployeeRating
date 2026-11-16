ALTER TABLE reports
    DROP CONSTRAINT reports_rating_id_key,
    ADD COLUMN rating_snapshot jsonb;

CREATE UNIQUE INDEX reports_one_open_per_rating_idx ON reports (rating_id) WHERE status = 'open';
CREATE INDEX reports_rating_history_idx ON reports (rating_id, created_at DESC, id DESC);
CREATE INDEX moderation_actions_report_history_idx ON moderation_actions (report_id, id DESC);

UPDATE reports p
SET rating_snapshot = jsonb_build_object('overall', r.overall, 'feedback', r.feedback, 'eligibility', r.eligibility)
FROM ratings r
WHERE p.rating_id = r.id AND (p.status IN ('open', 'hidden') OR r.updated_at <= p.created_at);
