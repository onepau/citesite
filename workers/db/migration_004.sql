-- Migration 004: Reconcile prod orders schema with code expectations
-- The original orders.sql and migration_002.sql were never applied in prod.
-- This adds the columns the checkout + stripe-webhook + audit-api workers
-- already reference. ADD COLUMN is non-destructive; existing rows get NULL.

ALTER TABLE orders ADD COLUMN amount INTEGER;
ALTER TABLE orders ADD COLUMN currency TEXT;
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN updated_at TEXT;
ALTER TABLE orders ADD COLUMN pdf_url TEXT;
ALTER TABLE orders ADD COLUMN pdf_generated_at TEXT;
ALTER TABLE orders ADD COLUMN email_sent_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
