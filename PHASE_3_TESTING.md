# Phase 3: Testing Guide

## Pre-Testing Checklist

- [x] Webhook worker updated with email sending
- [x] Webhook deployed
- [x] Email service secret set (SENDGRID_API_KEY or RESEND_API_KEY)
- [x] Database migration applied (pdf_url, email_sent_at columns)
- [x] Frontend updated to handle payment success
- [ ] Ready to test

---

## Testing Steps

### Step 1: Local Testing Setup

```bash
# Terminal 1: Frontend
npm run dev
# Access: http://localhost:5173

# Terminal 2: Audit API
cd workers/audit-api
npx wrangler dev
# Worker available at: http://localhost:8787

# Terminal 3: Webhook (optional, for local webhook testing)
cd workers/stripe-webhook
npx wrangler dev
# Worker available at: http://localhost:8788
```

### Step 2: Run Free Audit

1. Open http://localhost:5173
2. Enter a test URL (e.g., https://example.com)
3. Click "Audit"
4. Wait for results (should show free-tier data)
5. **Verify:**
   - ✓ Overall score displays
   - ✓ One observation per dimension
   - ✓ First issue/improvement only
   - ✓ Signature recommendation shows "Unlock with full report"

### Step 3: Test Payment Modal

1. Click "Unlock Full Report" button or "Get Full Report — CHF 49.99"
2. **Payment modal opens with:**
   - ✓ URL being audited displays
   - ✓ Email input field
   - ✓ Features list visible
   - ✓ Price displays correctly

3. Enter test email: `test@example.com`
4. Click "Pay CHF 49.99"
5. **Should redirect to Stripe Checkout**

### Step 4: Stripe Test Payment (Local)

1. **Use Stripe test card:**
   - Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Name: Any name

2. Click "Pay" on Stripe checkout
3. **Should show success message**
4. **You'll be redirected back to:** `http://localhost:5173/?checkout=success&session_id=...`

### Step 5: Verify Full Audit Unlocks

After payment success redirect:

1. **Frontend should automatically:**
   - ✓ Detect payment success in URL
   - ✓ Fetch full audit with orderId
   - ✓ Display full results page
   - ✓ Show all dimensions with full details
   - ✓ Display executive summary
   - ✓ Show all critical issues with code
   - ✓ Show roadmap + competitor analysis
   - ✓ Show tool recommendations

2. **Verify in results:**
   - ✓ `tier: "paid"` in response
   - ✓ Multiple observations per dimension (not just one)
   - ✓ All paid checks have scores (not null)
   - ✓ `executiveSummary` contains text
   - ✓ `roadmap` with 30/60/90 day items
   - ✓ `competitorInsights` with gaps

### Step 6: Check Email Was Sent

1. Go to your email service dashboard:
   - **SendGrid:** https://app.sendgrid.com/
   - **Resend:** https://resend.com/emails

2. **Verify:**
   - ✓ Email sent to `test@example.com`
   - ✓ Subject: "Your CiteSite GEO Audit Report is Ready"
   - ✓ Contains audit URL link

### Step 7: Check Database

Verify the order was created and marked as paid:

```bash
npx wrangler d1 execute citesite-db \
  --command "SELECT id, email, status, email_sent_at, delivery_status FROM orders ORDER BY created_at DESC LIMIT 5;"
```

**Expected output:**
```
id                  email              status  email_sent_at         delivery_status
─────────────────────────────────────────────────────────────────────────────────
uuid-here           test@example.com   paid    2026-05-05T...Z       email_sent
```

---

## Production Testing

### Prerequisites

- [ ] All workers deployed
- [ ] All secrets set
- [ ] Database initialized
- [ ] Frontend deployed or running locally

### Test Flow

```bash
# 1. Start frontend (local) or use deployed version
npm run dev
# or
# https://citesite.net (if deployed)

# 2. Run free audit
# - URL: https://your-test-site.com
# - Should get free results in ~30 seconds

# 3. Click "Unlock Full Report"
# - Enter your real email
# - Pay with 4242 4242 4242 4242

# 4. Stripe checkout
# - Fill in any details
# - Click "Pay"

# 5. Success redirect
# - Frontend should auto-load full audit
# - All sections visible

# 6. Check email
# - Look in your inbox
# - Verify email from CiteSite
# - Click audit link
```

---

## Troubleshooting

### "Invalid or unpaid order" Error

The order wasn't found or isn't marked as paid.

**Solutions:**
```bash
# Check if order exists in database
npx wrangler d1 execute citesite-db \
  --command "SELECT * FROM orders WHERE id='YOUR_ORDER_ID';"

# Verify status is 'paid'
npx wrangler d1 execute citesite-db \
  --command "SELECT status FROM orders WHERE id='YOUR_ORDER_ID';"

# If not paid, manually update for testing
npx wrangler d1 execute citesite-db \
  --command "UPDATE orders SET status='paid' WHERE id='YOUR_ORDER_ID';"
```

### Email Not Received

**Check webhook logs:**
```bash
npx wrangler tail citesite-webhook
```

Look for messages like:
- "Sending email via SendGrid" (success indicator)
- Error messages if sending failed

**Verify email service secret:**
```bash
npx wrangler secret list | grep -i sendgrid
# or
npx wrangler secret list | grep -i resend
```

**Manually trigger webhook test (if using Stripe CLI):**
```bash
stripe listen --forward-to https://webhook.citesite.net/
stripe trigger payment_intent.succeeded --override metadata[order_id]=test-order-id
```

### Full Audit Not Loading After Payment

**Check that orderId was stored:**
```bash
# In browser console:
sessionStorage.getItem('pendingOrderId')
# Should return the order ID
```

**Check API response:**
```bash
curl -X POST https://api.citesite.net/api/audit/full \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "orderId": "YOUR_ORDER_ID"}'
# Should return full audit with tier: "paid"
```

### Payment Modal Not Opening

**Verify checkout endpoint works:**
```bash
curl -X POST https://api.citesite.net/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "url": "https://example.com"}'
# Should return checkoutUrl and orderId
```

---

## Success Indicators

A successful end-to-end payment flow should result in:

1. ✓ Free audit shows free-tier data
2. ✓ Payment modal opens and accepts email
3. ✓ Redirect to Stripe Checkout works
4. ✓ Test payment succeeds
5. ✓ Frontend detects success and loads full audit
6. ✓ Full audit displays all sections (no "locked" messages)
7. ✓ Email received at customer email
8. ✓ Database shows order.status = 'paid' and email_sent_at is set
9. ✓ Customer can view all audit details
10. ✓ No errors in worker logs

---

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Free audit | < 30 sec | ____ |
| Checkout redirect | < 2 sec | ____ |
| Stripe payment | Variable | ____ |
| Redirect back | < 1 sec | ____ |
| Full audit load | < 5 sec | ____ |
| Email delivery | < 2 min | ____ |
| **Total flow** | **< 5 min** | **____** |

---

## Test Results Checklist

- [ ] Free audit works
- [ ] Payment modal opens
- [ ] Stripe checkout appears
- [ ] Test payment succeeds
- [ ] Success redirect works
- [ ] Full audit loads automatically
- [ ] All sections visible (no locked content)
- [ ] Email received
- [ ] Database order marked as paid
- [ ] Worker logs show no errors
- [ ] Performance acceptable

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 3 complete!
2. 📋 Consider Phase 4 (PDF generation, analytics)
3. 🚀 Deploy to production
4. 📊 Monitor webhook delivery + email metrics

If issues found:
1. Use troubleshooting guide above
2. Check worker logs: `npx wrangler tail`
3. Verify all secrets set: `npx wrangler secret list`
4. Review webhook code for email service errors

