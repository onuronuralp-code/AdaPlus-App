CREATE TABLE IF NOT EXISTS delivery_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id       VARCHAR(50) NOT NULL,
    provider_name     VARCHAR(200) NOT NULL,
    items_summary     TEXT NOT NULL,
    note              VARCHAR(500),
    delivery_address  VARCHAR(500),
    whatsapp_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_id ON delivery_orders (user_id);
