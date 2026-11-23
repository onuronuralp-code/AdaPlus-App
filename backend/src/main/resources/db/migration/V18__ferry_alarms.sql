CREATE TABLE ferry_alarms (
    id               UUID         NOT NULL PRIMARY KEY,
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_from       VARCHAR(100) NOT NULL,
    route_to         VARCHAR(100) NOT NULL,
    departure_time   VARCHAR(5)   NOT NULL,
    minutes_before   INTEGER      NOT NULL,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_fired_date  DATE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_ferry_alarm UNIQUE (user_id, route_from, route_to, departure_time, minutes_before)
);
