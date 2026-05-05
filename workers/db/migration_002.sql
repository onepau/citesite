-- Migration 002: Add PDF and email tracking columns
-- Tracks PDF generation and email delivery status

ALTER TABLE orders ADD COLUMN pdf_url TEXT;
ALTER TABLE orders ADD COLUMN pdf_generated_at TEXT;
ALTER TABLE orders ADD COLUMN email_sent_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';

-- Status flow: pending → pdf_generated → email_sent → delivered
-- pending: order created, awaiting payment
-- pdf_generated: PDF created and stored
-- email_sent: delivery email sent to customer
-- delivered: customer received email with report link
