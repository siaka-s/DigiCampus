CREATE TYPE request_type AS ENUM (
    'interne',
    'location_externe'
);

CREATE TYPE request_status AS ENUM (
    'en_attente',
    'validee',
    'refusee',
    'cloturee'
);

CREATE TABLE equipment_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    type         request_type NOT NULL,
    mission      TEXT,
    location     TEXT,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    status       request_status NOT NULL DEFAULT 'en_attente',
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
