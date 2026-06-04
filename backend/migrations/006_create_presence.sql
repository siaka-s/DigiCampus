CREATE TABLE presence (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    space_id    UUID NOT NULL REFERENCES spaces(id),
    date        DATE NOT NULL,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, space_id, date)
);
