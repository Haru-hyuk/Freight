-- Backfill legacy matches.version rows that remained NULL after version column rollout.
UPDATE matches
SET version = 0
WHERE version IS NULL;
