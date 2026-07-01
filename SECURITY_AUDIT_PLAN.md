# CiteSite Security Audit & Remediation Plan

**Date:** 2026-07-01
**Scope:** Full codebase — frontend worker (`index.js`), `workers/audit-api`, `workers/checkout`, `workers/stripe-webhook`, `workers/oauth-proxy`, D1 schemas, React frontend (`src/`), build scripts, Decap CMS admin, CI/deploy tooling.

---

## Summary

The codebase is in decent shape for its size: SQL is parameterized everywhere, the Stripe webhook verifies signatures with a timing-safe compare, timestamp tolerance and idempotency, prices are server-controlled, blog HTML is sanitized at build time with `sanitize-html`, JSON-LD is escaped with `safeJSON`, the OAuth proxy has CSRF state protection and pins its `postMessage` origin, and no secrets are committed to the repo.

The dominant risk theme is **unauthenticated, un-rate-limited endpoints that spend money** (Anthropic API calls, Resend emails, D1 writes). One endpoint (`/api/audit/schema-forge`) is effectively a free, public proxy to the Anthropic API whose only gate is a client-side `sessionStorage` flag. The second theme is the **admin surface**: a static admin key held in `localStorage`, and a CMS admin page that loads an unpinned third-party bundle with no CSP and handles a broad-scope GitHub token.

Findings are ordered by priority; within each priority, by ease of implementation (easiest first).

---

## P0 — Critical: unmetered spend on public endpoints

### 1. `/api/audit/schema-forge` has no server-side gate and no rate limit
**File:** `workers/audit-api/index.js` (~line 1277)
**Vulnerability:** The endpoint calls the Anthropic API (with the `web_search` tool, which bills per search) for any POST with a URL. The "unlock" gate is purely client-side (`sessionStorage.getItem("schemaForgeUnlocked")` in `src/App.jsx`); the server checks nothing. Anyone can script unlimited calls and drain the Anthropic budget. It also skips `validateAuditUrl()` — only `new URL()` is applied.
**Fix (easy):**
- Add a Cloudflare rate-limit binding to `workers/audit-api/wrangler.toml` (same pattern as `CHECKOUT_RATE_LIMITER` in the checkout worker) and enforce it per `CF-Connecting-IP` on this route.
- Enforce the newsletter-signup unlock server-side: require the email in the request body and check it exists in `newsletter_subscribers` (or require a signed token issued by `/api/newsletter`).
- Run `validateAuditUrl()` on the submitted URL.

### 2. `/api/audit` (free tier) has no rate limit
**File:** `workers/audit-api/index.js` (~line 1473 onward)
**Vulnerability:** Each free audit triggers 4+ outbound fetches and a streamed Claude Haiku call, then a D1 insert. The "one free audit per URL" dedup keys on the exact normalized URL, so an attacker varies the path/query string (`?x=1`, `?x=2`, …) for unlimited unique audits — unbounded Anthropic spend plus unbounded `audits` table growth.
**Fix (easy):** Add the same rate-limit binding as above and check it at the top of the audit POST handler, keyed on `CF-Connecting-IP`. Consider a secondary per-hostname cap (e.g. max N audits per target origin per day) so query-string variation stops working.

### 3. `/api/coupon/validate` has no rate limit → promo-code brute force
**File:** `workers/checkout/index.js` (~line 52)
**Vulnerability:** The `CHECKOUT_RATE_LIMITER` check happens *after* the coupon branch returns, so promo-code validation is unlimited. An attacker can enumerate active Stripe promotion codes (and each guess costs a Stripe API call).
**Fix (easy):** Move the `env.CHECKOUT_RATE_LIMITER.limit()` call above the coupon branch so both routes share it, or add a dedicated limiter for coupon validation.

### 4. `/api/newsletter` and `/api/contact` have no rate limit
**File:** `workers/audit-api/index.js` (~lines 1334, 1367)
**Vulnerability:** Unlimited D1 inserts (`newsletter_subscribers`, `contacts`) and, for contact, one Resend email to `ADMIN_EMAIL` per request — spam/flood vector and Resend quota burn. Also enables subscribing arbitrary third-party addresses (no double opt-in).
**Fix (easy):** Apply the shared rate limiter per IP. Longer-term: double opt-in confirmation email for newsletter signups.

---

## P1 — High: admin & supply-chain sur