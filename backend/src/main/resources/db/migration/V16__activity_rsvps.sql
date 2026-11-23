CREATE TABLE activity_rsvps (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id UUID        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_activity_rsvp UNIQUE (user_id, activity_id)
);

CREATE INDEX idx_activity_rsvps_activity_id ON activity_rsvps(activity_id);
