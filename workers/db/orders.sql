-- Migration: create orders and audits tables
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

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  url TEXT NOT NULL,
  results_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audits_order_id ON audits(order_id);
CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(url);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at);
