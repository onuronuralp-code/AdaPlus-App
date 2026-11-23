CREATE TABLE delivery_demand_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    options     VARCHAR(255) NOT NULL,
    other_text  VARCHAR(500),
    island      VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_delivery_vote_user UNIQUE (user_id)
);
