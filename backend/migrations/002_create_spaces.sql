CREATE TYPE space_type AS ENUM (
    'salle_programme',
    'bureau_individuel',
    'bureau_partage'
);

CREATE TABLE spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            space_type NOT NULL,
    capacity        INTEGER NOT NULL DEFAULT 0,
    seats           INTEGER NOT NULL DEFAULT 0,
    equipment_fixed TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
