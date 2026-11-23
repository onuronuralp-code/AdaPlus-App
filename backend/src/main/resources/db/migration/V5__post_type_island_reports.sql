-- Post type and island fields
ALTER TABLE posts
    ADD COLUMN post_type  VARCHAR(20)  DEFAULT 'DISCUSSION',
    ADD COLUMN island     VARCHAR(20),
    ADD COLUMN image_url  VARCHAR(500);

-- Reports (one per user per post)
CREATE TABLE post_reports (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

CREATE INDEX idx_post_reports_post_id ON post_reports(post_id);
