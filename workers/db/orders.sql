-- Migration: create orders table used by checkout and webhook workers
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT,
  url TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TEXT,
  updated_at TEXT
);
