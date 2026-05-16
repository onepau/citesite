-- Migration 006: Contact form submissions and newsletter subscribers

CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  inquiry_type TEXT NOT NULL,   -- 'general' | 'issue' | 'services'
  message      TEXT NOT NULL,
  subscribed   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email           TEXT PRIMARY KEY,
  subscribed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  bounced_at      TEXT,
  complained_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at
  ON newsletter_subscribers(subscribed_at);
