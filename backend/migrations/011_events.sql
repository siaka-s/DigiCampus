CREATE TYPE event_type AS ENUM ('formation', 'atelier', 'conference', 'reunion', 'autre');

CREATE TABLE events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT,
  date         DATE        NOT NULL,
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  location     TEXT,
  type         event_type  NOT NULL DEFAULT 'autre',
  created_by   UUID        NOT NULL REFERENCES users(id),
  is_published BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON events(date, is_published);
CREATE INDEX ON events(created_by);
