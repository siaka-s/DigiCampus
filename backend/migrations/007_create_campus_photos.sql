CREATE TABLE IF NOT EXISTS campus_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    TEXT NOT NULL UNIQUE,
  caption     TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
