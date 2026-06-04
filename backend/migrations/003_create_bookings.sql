CREATE TYPE booking_status AS ENUM (
    'en_attente',
    'validee',
    'refusee',
    'annulee'
);

CREATE TABLE bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id     UUID NOT NULL REFERENCES spaces(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    program      TEXT NOT NULL,
    start_time   TIMESTAMPTZ NOT NULL,
    duration     INTEGER NOT NULL,
    participants INTEGER NOT NULL,
    status       booking_status NOT NULL DEFAULT 'en_attente',
    is_urgent    BOOLEAN NOT NULL DEFAULT FALSE,
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
