-- Départements
CREATE TABLE IF NOT EXISTS departments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL DEFAULT 'interne' CHECK (category IN ('interne', 'externe', 'partenaire')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liaison bureau partagé ↔ départements (many-to-many)
CREATE TABLE IF NOT EXISTS space_departments (
  space_id      UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (space_id, department_id)
);

-- Localisation physique sur les espaces
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

-- Seed
INSERT INTO departments (name, category) VALUES
  ('IT',                   'interne'),
  ('Programmes',           'interne'),
  ('Marketing',            'interne'),
  ('ADEC',                 'partenaire'),
  ('Fineo',                'partenaire'),
  ('Collaborateur externe','externe')
ON CONFLICT (name) DO NOTHING;
