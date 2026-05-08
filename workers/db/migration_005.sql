-- Migration 005: Indexes on commonly queried order columns
-- The webhook looks up orders by stripe_session_id and stripe_payment_intent_id;
-- the audit-api looks them up by id (already PK); admin queries filter by status
-- and email. Without these indexes every webhook does a full table scan.
-- UNIQUE on stripe_session_id also makes idempotent UPSERTs trivial later.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
