# CiteSite

SEO + GEO + AIO audit engine. Enter any URL, get an instant scored audit across six weighted dimensions (Crawlability, Content Structure, Structured Data, E-E-A-T, Content Quality, Technical SEO). The free tier returns the score breakdown; the paid tier (CHF 49.99 via Stripe) returns a 16-page expert report with a 30/60/90-day roadmap delivered as a PDF.

## Architecture

- **Frontend** ([`src/`](src/)) — React 19 + Vite + Tailwind, served by a Cloudflare Worker via static assets ([`index.js`](index.js), [`wrangler.toml`](wrangler.toml)).
- **Workers** ([`workers/`](workers/)) — four single-file Cloudflare Workers, each with its own `wrangler.toml`:
  - [`audit-api`](workers/audit-api/) — runs the audit (calls Anthropic) and gates `/api/audit/full` behind paid order or admin auth. Route: `api.citesite.net/api/audit*`.
  - [`checkout`](workers/checkout/) — creates Stripe Checkout sessions and inserts pending orders into D1. Route: `api.citesite.net/api/checkout`.
  - [`stripe-webhook`](workers/stripe-webhook/) — verifies Stripe signatures, marks orders paid, sends confirmation email via SendGrid or Resend. Route: `webhook.citesite.net/*`.
  - [`oauth-proxy`](workers/oauth-proxy/) — GitHub OAuth callback for the admin panel. Route: `auth.citesite.net/*`.
- **Database** — Cloudflare D1 (`citesite-db`). Schema is the cumulative effect of [`workers/db/orders.sql`](workers/db/orders.sql) + `migration_002.sql`–`migration_005.sql` (run them in order).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # Vite on http://localhost:5174
```

The frontend talks to `api.citesite.net` by default (see `API_BASE` in [`src/App.jsx`](src/App.jsx)). For local-only Worker development, run `npx wrangler dev` inside the relevant `workers/<name>/` directory and point `API_BASE` at the local URL.

## Deploying

```bash
npm run deploy:workers        # all four workers
npm run deploy:frontend       # builds dist/ and deploys the citesite Worker
```

Or pick one: `deploy:audit-api`, `deploy:checkout`, `deploy:webhook`, `deploy:oauth`.

## Database setup

```bash
npm run db:init               # initial orders + audits tables
# then apply each migration in order:
npx wrangler d1 execute citesite-db --remote --file workers/db/migration_002.sql
npx wrangler d1 execute citesite-db --remote --file workers/db/migration_003.sql
npx wrangler d1 execute citesite-db --remote --file workers/db/migration_004.sql
npx wrangler d1 execute citesite-db --remote --file workers/db/migration_005.sql
npm run db:verify
```

## Required secrets

Each worker has its own secrets. Set per-worker with `npx wrangler secret put NAME` from inside the worker's directory. See [`.env.example`](.env.example) for the full list — at minimum:

- `audit-api`: `ANTHROPIC_API_KEY`, `ADMIN_KEY`, optionally `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD`
- `checkout`: `STRIPE_SECRET_KEY`
- `stripe-webhook`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and one of `SENDGRID_API_KEY` / `RESEND_API_KEY`
- `oauth-proxy`: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## DNS

The custom routes in each worker's `wrangler.toml` (e.g. `webhook.citesite.net/*`) need matching DNS records — proxied (orange-cloud) CNAMEs at `webhook`, `auth`, `api` pointing to `citesite.net`. Without them the worker route won't be reachable from the public internet, even though the worker is deployed.

## Further reading

- [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md) — initial Cloudflare account/zone setup
- [`WORKERS_CONFIG.md`](WORKERS_CONFIG.md) — per-worker wrangler.toml reference
- `PHASE_*.md` — historical implementation notes from the build-out
