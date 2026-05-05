# CiteSite Workers Configuration Reference

## Quick Overview

| Worker | Purpose | Route | Database |
|--------|---------|-------|----------|
| **citesite-api** | GEO audit engine | `api.citesite.net/api/audit*` | ✓ D1 |
| **citesite-checkout** | Stripe payment creation | `api.citesite.net/api/checkout` | ✓ D1 |
| **citesite-webhook** | Stripe event handler | `webhook.citesite.net/*` | ✓ D1 |
| **citesite-oauth** | OAuth2 proxy | `oauth.citesite.net/*` | ✗ |

---

## Environment Variables & Secrets

### All Workers Require

| Secret | Value | Where to Get |
|--------|-------|--------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_test_...` | Stripe → Webhooks → Endpoint details |

### Audit API Only

| Secret | Value | Where to Get |
|--------|-------|--------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [Anthropic Console](https://console.anthropic.com) |
| `ADMIN_KEY` | Random secure string | Generate with `openssl rand -hex 32` |
| `CF_ACCESS_TEAM_DOMAIN` | `your-team-name` | Cloudflare Zero Trust (optional) |
| `CF_ACCESS_AUD` | Application AUD tag | Cloudflare Zero Trust (optional) |

### Environment Variables (in wrangler.toml)

| Variable | Value | Location |
|----------|-------|----------|
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | audit-api vars |
| `CITESITE_URL` | `https://citesite.net` | audit-api vars |
| `PRICE_CHF_CENTS` | `4999` | checkout vars |
| `PRICE_CURRENCY` | `chf` | checkout vars |
| `PUBLIC_SITE_URL` | `https://citesite.net` | checkout vars |
| `STRIPE_PRODUCT_NAME` | `CiteSite Full Report` | checkout vars |

---

## Database Configuration

### D1 Database Details

```
Name:      citesite-db
ID:        c3773f9a-5b71-4095-9b48-2131eea61eaf
Binding:   DB (in all workers)
Region:    (Auto-selected by Cloudflare)
```

### Orders Table Schema

```sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,              -- UUID from checkout
  email TEXT,                        -- Customer email
  url TEXT,                          -- URL being audited
  amount INTEGER,                    -- Price in cents (4999 = 49.99)
  currency TEXT,                     -- CHF, USD, EUR, etc.
  status TEXT,                       -- pending, paid, delivered
  stripe_session_id TEXT,            -- Checkout session ID
  stripe_payment_intent_id TEXT,     -- Payment intent from Stripe
  created_at TEXT,                   -- ISO 8601 timestamp
  updated_at TEXT                    -- ISO 8601 timestamp
);
```

---

## Secrets Setup Commands

### Quick Setup (Interactive)

```bash
# Use the deployment script
scripts/deploy.sh
# Select option 1 (Set up all secrets)
```

### Manual Setup

```bash
# Set Stripe secrets
npx wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_test_... (from Stripe Dashboard)

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_... (from Stripe Webhook settings)

# Set Anthropic API key
npx wrangler secret put ANTHROPIC_API_KEY
# Paste: sk-ant-... (from Anthropic Console)

# Set admin key (generate random)
npx wrangler secret put ADMIN_KEY
# Paste: <generate with: openssl rand -hex 32>

# Optional: Set Cloudflare Access (if using Zero Trust)
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
# Paste: your-team-name

npx wrangler secret put CF_ACCESS_AUD
# Paste: application-aud-tag
```

### Verify Secrets

```bash
npx wrangler secret list
```

---

## Deployment Commands

### Deploy Individual Workers

```bash
# Deploy audit API
cd workers/audit-api && wrangler publish

# Deploy checkout
cd workers/checkout && wrangler publish

# Deploy webhook
cd workers/stripe-webhook && wrangler publish

# Deploy OAuth proxy
cd workers/oauth-proxy && wrangler publish
```

### Deploy All Workers at Once

```bash
scripts/deploy.sh
# Select option 2 (Deploy all workers)
```

### Deploy Frontend

```bash
npm run build
npx wrangler pages publish dist --project-name citesite
```

---

## Database Management

### Initialize Database Schema

```bash
npx wrangler d1 execute citesite-db --file workers/db/orders.sql
```

### Verify Tables

```bash
npx wrangler d1 execute citesite-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Query Orders (local dev only)

```bash
npx wrangler d1 execute citesite-db --command "SELECT * FROM orders LIMIT 10;"
```

### Inspect Single Order

```bash
npx wrangler d1 execute citesite-db --command "SELECT * FROM orders WHERE id='YOUR_ORDER_ID';"
```

---

## Local Development

### Start Dev Server + Workers

```bash
# Terminal 1: Frontend dev server
npm run dev
# Access at http://localhost:5173

# Terminal 2: Workers in local mode
npx wrangler dev --local
# Workers available at http://localhost:8787
```

### Test Admin Mode Locally

In browser console:

```javascript
localStorage.setItem("adminKey", "your-admin-key-value");
```

Then visit: `http://localhost:5173/admin-audit`

### Test Checkout Locally

The checkout worker will try to call Stripe. For local testing, use Stripe test keys:
- Public: `pk_test_...`
- Secret: `sk_test_...`

---

## Cloudflare Routes Configuration

### Option A: In wrangler.toml (Recommended)

Already configured in each worker's `wrangler.toml`:

```toml
routes = [
  { pattern = "api.citesite.net/api/audit", zone_name = "citesite.net" }
]
```

### Option B: Dashboard

1. Go to Cloudflare Dashboard → Workers → Routes
2. Add routes for each worker:
   - `citesite-api`: `api.citesite.net/api/*`
   - `citesite-checkout`: `api.citesite.net/api/checkout`
   - `citesite-webhook`: `webhook.citesite.net/*`

---

## Stripe Webhook Configuration

### 1. Set Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://webhook.citesite.net/`
4. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy the signing secret and set as `STRIPE_WEBHOOK_SECRET`

### 2. Test Webhook Locally (Using Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhook events to local environment
stripe listen --forward-to http://localhost:8787

# Trigger a test event
stripe trigger charge.succeeded
```

---

## Monitoring & Logging

### View Worker Logs

```bash
npx wrangler tail
```

### View D1 Query Logs

```bash
# Logs are printed to worker stdout
# View them with:
npx wrangler tail citesite-api
```

### Monitor Stripe Webhooks

In Stripe Dashboard → Webhooks, click your endpoint to see:
- Event delivery status
- Response code
- Retry attempts

---

## Troubleshooting

### "Database not bound" Error

Check that `wrangler.toml` has:

```toml
[[d1_databases]]
binding = "DB"
database_name = "citesite-db"
database_id = "c3773f9a-5b71-4095-9b48-2131eea61eaf"
```

### "Secret not found" Error

```bash
npx wrangler secret list
# Verify the secret is listed. If not, set it:
npx wrangler secret put SECRET_NAME
```

### CORS Errors

Ensure worker response includes:

```javascript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, Cf-Access-Jwt-Assertion",
};
```

### Stripe Errors

- `invalid_request_error`: Check secret key is correct
- `authentication_error`: Credentials missing or invalid
- `rate_limit_error`: Too many requests to Stripe API

---

## File Structure

```
citesite/
├── workers/
│   ├── audit-api/
│   │   ├── index.js          # Main audit engine
│   │   └── wrangler.toml     # ✓ Configured
│   ├── checkout/
│   │   ├── index.js          # Stripe checkout flow
│   │   └── wrangler.toml     # ✓ Configured
│   ├── stripe-webhook/
│   │   ├── index.js          # Stripe webhook handler
│   │   └── wrangler.toml     # ✓ Configured
│   ├── oauth-proxy/
│   │   ├── index.js          # OAuth proxy
│   │   └── wrangler.toml     # Already existed
│   └── db/
│       ├── orders.sql        # D1 schema
│       └── wrangler.toml     # ✓ Configured
├── src/
│   └── App.jsx               # Frontend (update API_BASE)
├── wrangler.toml             # ✓ Root config (new)
├── .env.example              # ✓ Environment reference (new)
├── CLOUDFLARE_SETUP.md       # ✓ Detailed setup guide (new)
├── WORKERS_CONFIG.md         # ✓ This file (new)
└── scripts/
    └── deploy.sh             # ✓ Deployment automation (new)
```

---

## Next Steps

1. ✓ **Phase 1** (Current): Configuration files set up
2. **Phase 2**: Implement complete audit-api logic
3. **Phase 3**: Complete payment flow integration
4. **Phase 4**: Deploy and test end-to-end

See `CLOUDFLARE_SETUP.md` for detailed deployment instructions.
