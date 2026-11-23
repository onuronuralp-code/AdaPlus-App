-- Extend users table for forum
ALTER TABLE users
    ADD COLUMN user_type      VARCHAR(20) NOT NULL DEFAULT 'TOURIST',
    ADD COLUMN terms_accepted BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN kvkk_accepted  BOOLEAN     NOT NULL DEFAULT TRUE;

-- Forum posts (top-level posts and replies in one table)
CREATE TABLE posts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    category    VARCHAR(50) NOT NULL,
    parent_id   UUID        REFERENCES posts(id) ON DELETE CASCADE,
    anonymous   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id    ON posts(user_id);
CREATE INDEX idx_posts_parent_id  ON posts(parent_id);
CREATE INDEX idx_posts_category   ON posts(category);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
