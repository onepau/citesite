# Phase 3: Payment Integration & PDF Delivery

## Overview

Phase 3 completes the end-to-end flow: **Audit → Payment → Unlock Full Results → PDF Generation → Email Delivery**

Current state:
- ✓ Free audits work
- ✓ Admin audits work
- ✓ Checkout creates orders
- ✓ Webhook marks orders as paid
- ✗ Payment unlocks full audit
- ✗ PDF generation
- ✗ Email delivery
- ✗ Frontend integration

---

## Architecture: Complete Payment Flow

```
User runs free audit
    ↓
Sees results (free tier)
    ↓
Clicks "Unlock Full Report"
    ↓
Payment Modal opens
    ↓
Enter email + click "Pay CHF 49.99"
    ↓
Checkout Worker creates order
    ↓
Redirects to Stripe Checkout
    ↓
User pays with card
    ↓
Stripe calls webhook
    ↓
Webhook Worker marks order as 'paid'
    ↓
Stripe redirects back to success page
    ↓
Frontend detects orderId from URL
    ↓
Calls audit API with orderId
    ↓
API checks DB: order.status == 'paid'
    ↓
Returns full audit results
    ↓
Background: Generate PDF
    ↓
Background: Email PDF to customer
    ↓
Frontend shows full report
```

---

## Phase 3 Components

### 1. PDF Generation

**Current state:** Frontend has `@react-pdf/renderer` + `PDFEditModal` component

**What's needed:**
- Create PDF document from audit JSON results
- Include all sections: executive summary, dimensions, roadmap, etc.
- Make it editable/brandable before download
- Save to S3/R2 for email delivery

**Files involved:**
- `src/components/AuditPDFDocument.jsx` — PDF template (likely exists)
- Create new worker: `workers/pdf-generator/` — Generate + store PDFs

### 2. Email Delivery

**Current state:** None

**What's needed:**
- Send email to customer with PDF attachment
- Include order confirmation
- Include audit summary
- Template with branding

**Options:**
- **SendGrid** (easiest, ~$0.10/email)
- **Mailgun** (developer-friendly)
- **AWS SES** (cheapest at scale)
- **Resend** (modern, good for transactional)

**Files involved:**
- Create new worker: `workers/email-sender/`
- Or extend webhook to trigger email

### 3. Frontend Integration

**Current state:** Payment modal + results display

**What's needed:**
- Detect payment success in URL params
- Load full audit when orderId is present
- Show PDF download/email options
- Handle payment states (pending, success, failed)

**Files involved:**
- `src/App.jsx` — Update to handle orderId
- `src/components/PaymentModal.jsx` — Already wired to checkout

### 4. Backend Workflow

**Current state:** Checkout + webhook

**What's needed:**
- Webhook triggers PDF generation
- PDF generation triggers email
- Email confirmation saved to DB

**Files involved:**
- `workers/stripe-webhook/` — Update to call PDF + email
- `workers/pdf-generator/` — New worker
- `workers/email-sender/` — New worker or extend webhook

---

## Implementation Steps

### Step 1: Set Up Email Service

Choose one:

#### Option A: SendGrid (Recommended for simplicity)

```bash
# 1. Create SendGrid account (free tier: 100 emails/day)
# Go to https://sendgrid.com → sign up → get API key

# 2. Set as secret
cd workers/webhook
npx wrangler secret put SENDGRID_API_KEY
# Paste your API key
```

#### Option B: Resend (Modern alternative)

```bash
# 1. Create Resend account (free: 100 emails/day)
# Go to https://resend.com → sign up → get API key

# 2. Set as secret
cd workers/webhook
npx wrangler secret put RESEND_API_KEY
# Paste your API key
```

### Step 2: Update Webhook to Trigger Email

Edit `workers/stripe-webhook/index.js`:

```javascript
// When order is marked as paid:
// 1. Store the URL being audited (already in order)
// 2. Call PDF generator
// 3. Call email sender
// 4. Mark order as 'delivered'
```

### Step 3: Add PDF Generator Worker

Create `workers/pdf-generator/`:
- Input: audit results JSON + order details
- Output: PDF blob
- Store in R2 bucket
- Return presigned URL

### Step 4: Add Email Sender Worker

Create `workers/email-sender/`:
- Input: order + PDF URL
- Send email via SendGrid/Resend
- Include PDF attachment or link

### Step 5: Update Frontend

Update `src/App.jsx`:
```javascript
// Detect ?checkout=success&session_id=... in URL
// Get orderId from checkout worker response
// Call /api/audit/full with orderId
// When successful, show full results + PDF options
```

---

## Database Schema Updates

### Add to orders table

```sql
ALTER TABLE orders ADD COLUMN pdf_url TEXT;
ALTER TABLE orders ADD COLUMN pdf_generated_at TEXT;
ALTER TABLE orders ADD COLUMN email_sent_at TEXT;
```

### Audit status flow

```
pending → paid (webhook) → pdf_generated → delivered (email sent)
```

---

## Files to Create/Update

### New Files
- `workers/pdf-generator/index.js` — Generate PDF from audit
- `workers/pdf-generator/wrangler.toml` — Config with R2 binding
- `workers/email-sender/index.js` — Send emails (or extend webhook)
- `src/components/AuditPDFDocument.jsx` — PDF template (if missing)

### Files to Update
- `workers/stripe-webhook/index.js` — Add PDF + email triggers
- `src/App.jsx` — Handle orderId in URL, load full audit
- `workers/db/orders.sql` — Add new columns
- `package.json` — Add email service dependencies

---

## Timeline Estimate

| Component | Effort | Time |
|-----------|--------|------|
| Email service setup | Low | 15 min |
| Webhook update | Medium | 45 min |
| PDF generator | Medium | 1 hour |
| Email sender | Medium | 45 min |
| Frontend integration | Medium | 1 hour |
| Testing | Medium | 1 hour |
| **Total** | | **~5 hours** |

---

## Testing Strategy

### 1. Local Testing

```bash
# Use Stripe test cards:
# Success: 4242 4242 4242 4242
# Failure: 4000 0000 0000 0002

# Use Stripe CLI to test webhooks:
stripe listen --forward-to http://localhost:8787
stripe trigger payment_intent.succeeded
```

### 2. Production Testing

```bash
# Use test Stripe account
# Small test order through full flow
# Verify PDF generated
# Verify email received
```

### 3. Monitoring

- Watch worker logs for PDF generation errors
- Monitor email delivery with SendGrid/Resend dashboard
- Track order status transitions in DB

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Email delivery fails | Webhook retries, manual send button in dashboard |
| PDF generation too slow | Async generation, email when ready |
| PDF file storage | Use R2 with expiring URLs, cleanup after 30 days |
| Payment webhook duplicate | Webhook handler checks `status != 'paid'` first |
| Missing orderId in audit call | Default to free tier, show "upgrade" CTA |

---

## Success Criteria

- [ ] User can pay via Stripe
- [ ] Webhook confirms payment
- [ ] Full audit unlocks immediately after payment
- [ ] PDF generated within 10 seconds
- [ ] Email received within 1 minute
- [ ] PDF includes all audit data + branding
- [ ] Clicking PDF link in email works
- [ ] End-to-end flow tested 5 times without errors
- [ ] Error cases handled gracefully (retry logic)
- [ ] Customer can view audit + download PDF

---

## Next Decisions

Before implementing, decide:

1. **Email service:** SendGrid, Resend, or Mailgun?
2. **PDF storage:** R2 bucket or embed in email?
3. **PDF format:** Download only, or email link + download?
4. **Async vs sync:** Wait for PDF before returning, or queue?

See `PHASE_3_IMPLEMENTATION.md` for step-by-step implementation once decisions are made.

