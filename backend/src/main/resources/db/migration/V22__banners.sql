CREATE TABLE IF NOT EXISTS banners (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    body         TEXT,
    image_url    VARCHAR(500),
    action_url   VARCHAR(500),
    action_label VARCHAR(100),
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);
