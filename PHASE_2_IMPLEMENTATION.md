# Phase 2: Audit API Implementation & Testing

## Overview

Phase 2 focuses on completing the audit engine and testing the complete flow from URL submission through results delivery. The core logic is already implemented; Phase 2 validates and documents it.

---

## What's Already Implemented ✓

### Core Audit Logic
- ✓ **Page fetching** — Crawls target URL, robots.txt, llms.txt
- ✓ **Anthropic integration** — Calls Claude API with comprehensive audit prompt
- ✓ **Free-tier filtering** — Strips paid content from free results
- ✓ **Admin bypass** — X-Admin-Key header + Cloudflare Access JWT support
- ✓ **Database storage** — Saves results to audits table

### System Prompt
- ✓ Comprehensive 6-dimension audit framework (A-F)
- ✓ Scoring methodology (0-100 per dimension, weighted average)
- ✓ Detailed inspection block (SSR/CSR, schema, robots.txt, etc.)
- ✓ Free vs paid deliverables clearly defined
- ✓ Expected JSON response structure

### API Endpoints
- ✓ `POST /api/audit` — Public endpoint (returns free-tier results)
- ✓ `POST /api/audit/full` — Paid/admin endpoint (returns full results)

---

## What Changed in Phase 2

### 1. Database Schema Updated

Added `audits` table to store audit results:

```sql
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  url TEXT NOT NULL,
  results_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
```

With indexes for performance:
- `idx_audits_order_id` — Look up audits by order
- `idx_audits_url` — Find previous audits for a URL
- `idx_audits_created_at` — Timeline queries

### 2. Error Handling Improved

- ✓ Validates `ANTHROPIC_API_KEY` is set before running audit
- ✓ Returns audit errors immediately (don't store failed audits)
- ✓ Timestamp audit creation properly
- ✓ Graceful DB failure handling

---

## Deployment Checklist

Before going live with Phase 2:

### Prerequisites
- [ ] All Phase 1 secrets set (Stripe, Anthropic, Admin key)
- [ ] All workers deployed
- [ ] D1 database initialized with new schema

### Initialization Steps

```bash
# 1. Initialize updated database schema (includes new audits table)
npm run db:init

# 2. Verify tables exist
npm run db:verify

# 3. Verify all secrets are set
npm run secrets:list
```

Expected output from `npm run db:verify`:
```
orders
audits
```

---

## API Reference

### Endpoint 1: Free Audit

**Request:**
```bash
POST https://api.citesite.net/api/audit
Content-Type: application/json

{
  "url": "https://example.com/blog-post"
}
```

**Response (200 OK):**
```json
{
  "auditId": "uuid",
  "tier": "free",
  "inspection": { /* page inspection data */ },
  "dimensions": [ /* 6 dimensions with free checks only */ ],
  "overallScore": 65,
  "criticalIssues": [ /* first issue only, no code */ ],
  "improvements": [ /* first improvement only */ ],
  "signatureRecommendation": { "title": "Unlock with full report" },
  "executiveSummary": null,
  "competitorInsights": null,
  "roadmap": null,
  "toolRecommendations": null
}
```

### Endpoint 2: Full Audit (Paid/Admin)

**Option A: Admin Key**
```bash
POST https://api.citesite.net/api/audit/full
Content-Type: application/json
X-Admin-Key: your-admin-key

{
  "url": "https://example.com/blog-post"
}
```

**Option B: After Payment**
```bash
POST https://api.citesite.net/api/audit/full
Content-Type: application/json

{
  "url": "https://example.com/blog-post",
  "orderId": "order-uuid-from-checkout"
}
```

**Option C: Cloudflare Access JWT**
```bash
POST https://api.citesite.net/api/audit/full
Content-Type: application/json
Cf-Access-Jwt-Assertion: your-jwt-token

{
  "url": "https://example.com/blog-post"
}
```

**Response (200 OK):**
```json
{
  "auditId": "uuid",
  "tier": "paid",
  "inspection": { /* full inspection data */ },
  "dimensions": [ /* all 6 dimensions with all data */ ],
  "overallScore": 65,
  "executiveSummary": "...",
  "criticalIssues": [ /* all issues with code snippets */ ],
  "improvements": [ /* all improvements with estimates */ ],
  "signatureRecommendation": { /* full recommendation */ },
  "competitorInsights": { /* benchmark + gaps */ },
  "roadmap": { /* 30/60/90 day roadmap */ },
  "toolRecommendations": [ /* 6-10 tools */ ]
}
```

---

## Testing Guide

### Local Testing

#### 1. Start dev environment

```bash
# Terminal 1: Frontend
npm run dev
# Access: http://localhost:5173

# Terminal 2: Workers
cd workers/audit-api
npx wrangler dev
# Access: http://localhost:8787
```

#### 2. Set admin key in browser

```javascript
// In browser console
localStorage.setItem("adminKey", "your-admin-key");
```

#### 3. Test free audit

```bash
curl -X POST http://localhost:8787/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Verify response:**
- ✓ `auditId` present
- ✓ `tier: "free"`
- ✓ Only one observation per dimension
- ✓ Free checks have scores, paid checks have `score: null`
- ✓ `executiveSummary: null`
- ✓ `roadmap: null`

#### 4. Test admin audit

```bash
curl -X POST http://localhost:8787/api/audit/full \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{"url": "https://example.com"}'
```

**Verify response:**
- ✓ `tier: "paid"`
- ✓ All observations visible
- ✓ All checks have scores
- ✓ `executiveSummary` contains text
- ✓ `roadmap` with 30/60/90 day items
- ✓ `toolRecommendations` array populated

#### 5. Test error cases

```bash
# Missing URL
curl -X POST http://localhost:8787/api/audit \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return: {"error": "Missing url field"}

# Invalid order (paid endpoint without payment)
curl -X POST http://localhost:8787/api/audit/full \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "orderId": "invalid-id"}'
# Should return: {"error": "Invalid or unpaid order"}

# Missing ANTHROPIC_API_KEY
# (if env var not set)
# Should return: {"error": "Server not configured: ANTHROPIC_API_KEY missing"}
```

---

## Production Testing

### 1. Deploy workers

```bash
npm run deploy:workers
```

### 2. Initialize database

```bash
npm run db:init
```

### 3. Set secrets

```bash
npm run setup
# Follow prompts to set all secrets
```

### 4. Test free endpoint

```bash
curl -X POST https://api.citesite.net/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 5. Test admin endpoint

```bash
curl -X POST https://api.citesite.net/api/audit/full \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{"url": "https://example.com"}'
```

### 6. Verify database storage

```bash
npx wrangler d1 execute citesite-db --command "SELECT COUNT(*) as audit_count FROM audits;"
```

---

## Free vs Paid Comparison

| Feature | Free | Paid |
|---------|------|------|
| Overall score | ✓ | ✓ |
| Per-dimension scores | ✓ | ✓ |
| Free-tier checks | ✓ | ✓ |
| Paid-tier checks | ✗ Score only | ✓ Full details |
| First observation per dimension | ✓ | ✓ |
| All observations | ✗ | ✓ |
| Narratives | ✗ | ✓ |
| Quick wins | ✗ | ✓ |
| Prioritized actions | ✗ | ✓ |
| Executive summary | ✗ | ✓ |
| Critical issues | Title only | Full with code |
| Improvements | Title only | Full with estimates |
| Signature recommendation | Locked message | Full with code |
| Competitor gap analysis | ✗ | ✓ |
| 30/60/90 roadmap | ✗ | ✓ |
| Tool recommendations | ✗ | ✓ |

---

## Troubleshooting

### "ANTHROPIC_API_KEY missing"

```bash
# Set the secret
cd workers/audit-api
npx wrangler secret put ANTHROPIC_API_KEY
# Paste: sk-ant-...
```

### "Invalid or unpaid order"

The `orderId` must exist in the database and have `status = 'paid'`.

Verify with:
```bash
npx wrangler d1 execute citesite-db \
  --command "SELECT * FROM orders WHERE id='YOUR_ORDER_ID';"
```

### Audit takes too long

- Page HTML is limited to 60k characters for speed
- If a page has massive HTML, it's truncated
- Anthropic API timeout is 8192 tokens max output

### "Failed to parse audit response"

Claude didn't return valid JSON. Check:
1. ANTHROPIC_MODEL in wrangler.toml is correct
2. System prompt JSON structure is valid
3. Anthropic API response in worker logs

---

## Database Queries

### Find audits for an order

```sql
SELECT * FROM audits WHERE order_id = 'order-id';
```

### Find all audits for a URL

```sql
SELECT * FROM audits WHERE url = 'https://example.com' ORDER BY created_at DESC;
```

### Get audit details

```sql
SELECT results_json FROM audits WHERE id = 'audit-id';
-- Results stored as JSON, parse in application
```

### Audit statistics

```sql
-- Count audits by tier
SELECT 
  CASE WHEN order_id IS NOT NULL THEN 'paid' ELSE 'free' END as tier,
  COUNT(*) as count
FROM audits
GROUP BY order_id IS NOT NULL;

-- Recent audits
SELECT id, url, created_at FROM audits ORDER BY created_at DESC LIMIT 10;
```

---

## Next Steps: Phase 3

After Phase 2 testing passes:

1. **Complete payment flow** — Frontend → Checkout → Webhook → Audit unlock
2. **PDF generation** — Convert audit results to 16-page PDF
3. **Email delivery** — Send PDF to customer after payment
4. **Frontend updates** — Integrate with payment modal and results display
5. **End-to-end testing** — Full purchase → audit → delivery flow

---

## Checklist

- [ ] Database schema initialized with audits table
- [ ] Secrets verified with `npm run secrets:list`
- [ ] Free audit endpoint tested locally
- [ ] Admin audit endpoint tested locally
- [ ] Error cases tested
- [ ] Database storage verified
- [ ] Workers deployed to production
- [ ] Production endpoints tested
- [ ] Audit speed acceptable (< 30 seconds)
- [ ] Ready for Phase 3

