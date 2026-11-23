-- ── Forum: only two post types remain (MESSAGE, POLL) ───────────────────────
UPDATE posts SET post_type = 'MESSAGE' WHERE post_type IS NULL OR post_type <> 'POLL';
ALTER TABLE posts ALTER COLUMN post_type SET DEFAULT 'MESSAGE';

-- ── Forum: island selection removed from posts ──────────────────────────────
ALTER TABLE posts DROP COLUMN IF EXISTS island;

-- ── Activities: every field is optional ─────────────────────────────────────
ALTER TABLE activities
    ALTER COLUMN name              DROP NOT NULL,
    ALTER COLUMN start_date        DROP NOT NULL,
    ALTER COLUMN end_date          DROP NOT NULL,
    ALTER COLUMN organizer_name    DROP NOT NULL,
    ALTER COLUMN organizer_contact DROP NOT NULL;
