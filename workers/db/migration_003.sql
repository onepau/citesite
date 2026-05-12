-- Migration 003: Stripe webhook idempotency
-- Stores Stripe event IDs we've already processed so retried webhooks
-- don't double-charge, double-email, or double-update orders.

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
