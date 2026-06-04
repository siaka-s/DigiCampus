CREATE TYPE equipment_status AS ENUM (
    'disponible',
    'attribue',
    'en_location'
);

CREATE TABLE equipment (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    status      equipment_status NOT NULL DEFAULT 'disponible',
    assigned_to UUID REFERENCES users(id),
    return_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
