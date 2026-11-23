-- ── Topics ──────────────────────────────────────────────────────────────────
CREATE TABLE topics (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_by UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_name ON topics(name);

-- ── Migrate posts: drop category, add topic_id ───────────────────────────────
ALTER TABLE posts DROP COLUMN category;
ALTER TABLE posts ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX idx_posts_topic_id ON posts(topic_id);

-- ── Listings ─────────────────────────────────────────────────────────────────
CREATE TABLE listings (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    description  TEXT         NOT NULL,
    category     VARCHAR(20)  NOT NULL,
    island       VARCHAR(100),
    price        NUMERIC(10,2),
    price_label  VARCHAR(50),
    image_url    VARCHAR(500),
    contact_info VARCHAR(255),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_active   ON listings(active);
