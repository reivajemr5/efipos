-- Migration v11: Atomic document counters (per business)
CREATE TABLE IF NOT EXISTS "counters" (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);
