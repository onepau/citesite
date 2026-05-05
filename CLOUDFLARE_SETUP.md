# CiteSite Cloudflare Deployment Guide

## Overview

CiteSite uses multiple Cloudflare Workers:
- **citesite-api** (`workers/audit-api/`) — Main audit engine
- **citesite-checkout** (`workers/checkout/`) — Stripe checkout integration
- **citesite-webhook** (`workers/stripe-webhook/`) — Stripe webhook handler
- **citesite-oauth** (`workers/oauth-proxy/`) — OAuth proxy for authentication
- **D1 Database** — Shared orders table for checkout/webhook

---

## Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Domain** registered with Cloudflare DNS
3. **Stripe Account** with API keys
4. **Anthropic API Key** for audit analysis
5. **Wrangler CLI** installed: `npm install -g @cloudflare/wrangler`

---

## Step 1: Set Up D1 Database

### 1.1 Create Database (if not already done)

```bash
npx wrangler d1 create citesite-db
```

This returns a `database_id`. Update all `wrangler.toml` files with this ID (already configured to `c3773f9a-5b71-4095-9b48-2131eea61eaf`).

### 1.2 Initialize Database Schema

```bash
npx wrangler d1 execute citesite-db --file workers/db/orders.sql
```

This creates the `orders` table used by checkout and webhook workers.

### 1.3 Verify Schema

```bash
npx wrangler d1 execute citesite-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected output: `orders` table exists.

---

## Step 2: Set Worker Secrets

Secrets are environment variables that should not be stored in code. Set them using Wrangler:

### 2.1 Stripe Secrets

```bash
# Get these from https://dashboard.stripe.com/apikeys
npx wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_test_...

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_test_...
```

### 2.2 Anthropic API Key

```bash
# Get from https://console.anthropic.com/
npx wrangler secret put ANTHROPIC_API_KEY
# Paste: sk-ant-...
```

### 2.3 Admin Key (for /admin-audit access)

```bash
# Generate a random, secure key
npx wrangler secret put ADMIN_KEY
# Paste: a-secure-random-string
```

### 2.4 Cloudflare Access (Optional, if using Zero Trust)

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
# Paste: your-team-name

npx wrangler secret put CF_ACCESS_AUD
# Paste: your-app-aud-tag-from-zero-trust-dashboard
```

---

## Step 3: Deploy Workers

Deploy each worker individually or use a script:

### 3.1 Deploy Audit API

```bash
cd workers/audit-api
npx wrangler publish
```

Output should show: `Published citesite-api`

### 3.2 Deploy Checkout

```bash
cd workers/checkout
npx wrangler publish
```

### 3.3 Deploy Webhook

```bash
cd workers/stripe-webhook
npx wrangler publish
```

### 3.4 Deploy OAuth Proxy (if using)

```bash
cd workers/oauth-proxy
npx wrangler publish
```

---

## Step 4: Configure Routes & Triggers

### 4.1 Set Up Routes

If not using routes in `wrangler.toml`, configure in Cloudflare dashboard:

- **citesite-api**: Route pattern `api.citesite.net/api/*`
- **citesite-checkout**: Route pattern `api.citesite.net/api/checkout`
- **citesite-webhook**: Route pattern `webhook.citesite.net/*`

### 4.2 Configure Stripe Webhook

1. Go to **Stripe Dashboard** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://webhook.citesite.net/`
3. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy the webhook secret and set it as `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Configure Cloudflare Access (Optional)

If protecting `/admin-audit` with Cloudflare Access:

1. Go to **Zero Trust Dashboard**
2. Create an Application pointing to `admin-api.citesite.net`
3. Set up authentication (email, SAML, OAuth)
4. Copy the Audience tag
5. Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` as secrets

---

## Step 6: Update Frontend Configuration

In `src/App.jsx`, the API base is set to:

```javascript
const API_BASE = "https://citesite-api.onepau.workers.dev";
```

Update this to your deployed worker URL if different. For production:

```javascript
const API_BASE = "https://api.citesite.net";
```

---

## Step 7: Deploy Frontend

```bash
npm run build
npx wrangler pages publish dist --project-name citesite
```

---

## Verification Checklist

- [ ] D1 database created and schema initialized
- [ ] All secrets set in Wrangler
- [ ] All workers deployed
- [ ] Routes configured in Cloudflare
- [ ] Stripe webhook endpoint registered
- [ ] Frontend API_BASE updated
- [ ] Frontend deployed
- [ ] Test free audit: Should work without payment
- [ ] Test paid checkout: Should redirect to Stripe
- [ ] Test webhook: Should update order status after payment

---

## Troubleshooting

### Workers not finding database

Check `wrangler.toml` has correct `database_id`:

```bash
npx wrangler d1 list
```

### Secrets not being read

Verify secrets are set:

```bash
npx wrangler secret list
```

### Stripe errors in checkout

Check `STRIPE_SECRET_KEY` is set and correct:

```bash
# Test the secret
curl -u sk_test_...: https://api.stripe.com/v1/customers
```

### CORS errors in frontend

Ensure `checkout` and `audit-api` workers include CORS headers:

```javascript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, Cf-Access-Jwt-Assertion",
};
```

---

## Local Development

### Start dev server with workers

```bash
npm run dev
```

Then in another terminal:

```bash
npx wrangler dev --local
```

Access at `http://localhost:8787`

### Test checkout locally

Set admin key in browser console:

```javascript
localStorage.setItem("adminKey", "your-admin-key");
```

Then visit `/admin-audit` to test full results.

---

## Production Checklist

- [ ] All secrets set correctly
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Stripe production keys configured (not test keys)
- [ ] Frontend deployed to production domain
- [ ] SSL certificate configured
- [ ] WAF rules configured (optional)
- [ ] Email notifications for webhook failures set up
