CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'worker')),
  actor_id UUID NOT NULL,
  kind TEXT NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message TEXT,
  link TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_actor_created_at
  ON notifications (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_actor_read
  ON notifications (actor_type, actor_id, read);
