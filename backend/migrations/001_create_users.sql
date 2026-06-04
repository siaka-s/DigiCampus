CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'admin_it',
    'collaborateur_digifemmes',
    'collaborateur_partenaire'
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'collaborateur_digifemmes',
    department    TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
