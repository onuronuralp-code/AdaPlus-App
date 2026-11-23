CREATE TABLE poll_options (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID         NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    text       VARCHAR(255) NOT NULL,
    sort_order INT          NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE poll_votes (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    poll_option_id UUID        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    post_id        UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

CREATE INDEX idx_poll_options_post_id       ON poll_options(post_id);
CREATE INDEX idx_poll_votes_poll_option_id  ON poll_votes(poll_option_id);
