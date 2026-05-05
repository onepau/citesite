# Phase 3: Implementation Guide

## Prerequisites

Before starting Phase 3, ensure:
- [ ] Phase 1 complete (workers deployed, secrets set)
- [ ] Phase 2 complete (audit API working)
- [ ] Free audits tested and working
- [ ] Payment flow tested (checkout creates orders)
- [ ] Webhook verified working (orders marked as paid)

---

## Step 1: Choose Email Service

### Option A: SendGrid (Recommended)

**Why:** Easiest, free tier (100 emails/day), excellent documentation

**Setup:**
1. Go to [SendGrid](https://sendgrid.com)
2. Sign up (free tier available)
3. Go to Settings → API Keys
4. Create new key (unrestricted)
5. Copy the key

**Cost:** $20/month for 50k emails (free tier: 100/day)

### Option B: Resend

**Why:** Modern, better for developers, good free tier

**Setup:**
1. Go to [Resend](https://resend.com)
2. Sign up (free tier available)
3. Go to API Keys
4. Create new key
5. Copy the key

**Cost:** Free tier 100 emails/day, then pay-as-you-go

### Option C: Mailgun

**Why:** Developer-friendly, lowest cost at scale

**Setup:**
1. Go to [Mailgun](https://www.mailgun.com)
2. Sign up (free tier: 100 emails/day)
3. Get API key
4. Set up sending domain

**Cost:** Free tier 100/day, then $0.50 per 1000 emails

---

## Step 2: Set Email Service Secret

```bash
cd workers/stripe-webhook

# For SendGrid
npx wrangler secret put SENDGRID_API_KEY
# Paste your API key

# For Resend
npx wrangler secret put RESEND_API_KEY
# Paste your API key

# For Mailgun
npx wrangler secret put MAILGUN_API_KEY
# Paste your API key
```

---

## Step 3: Update Database Schema

Add columns to track PDF generation and email delivery:

```bash
# Create a migration file
cat > workers/db/migration_002.sql << 'EOF'
-- Add columns for PDF and email tracking
ALTER TABLE orders ADD COLUMN pdf_url TEXT;
ALTER TABLE orders ADD COLUMN pdf_generated_at TEXT;
ALTER TABLE orders ADD COLUMN email_sent_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
-- pending → pdf_generated → email_sent → delivered
EOF
```

Then apply it:

```bash
npx wrangler d1 execute citesite-db --file workers/db/migration_002.sql
```

---

## Step 4: Update Webhook Worker

Edit `workers/stripe-webhook/index.js` to add email sending:

```javascript
// Add this function at the top
async function sendEmailWithPDF(env, order) {
  if (!env.SENDGRID_API_KEY && !env.RESEND_API_KEY) {
    console.warn('No email service configured');
    return false;
  }

  try {
    const auditUrl = `${env.CITESITE_URL || 'https://citesite.net'}/?auditId=${order.id}`;
    const emailBody = `
Hello,

Your CiteSite audit is ready! Click the link below to view your full report:

${auditUrl}

If you have any questions, reply to this email.

Best regards,
CiteSite Team
    `.trim();

    if (env.SENDGRID_API_KEY) {
      // SendGrid
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: order.email }] }],
          from: { email: 'noreply@citesite.net', name: 'CiteSite' },
          subject: 'Your CiteSite GEO Audit Report is Ready',
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      });
      return res.ok;
    } else if (env.RESEND_API_KEY) {
      // Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CiteSite <noreply@citesite.net>',
          to: order.email,
          subject: 'Your CiteSite GEO Audit Report is Ready',
          html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
        }),
      });
      return res.ok;
    }
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

// Update the webhook handler for checkout.session.completed
if (e.type === 'checkout.session.completed') {
  const session = e.data.object;
  const sessionId = session.id;
  const orderId = session.metadata?.order_id || null;
  const paymentIntent = session.payment_intent || null;

  if (orderId) {
    // Mark order as paid
    await env.DB.prepare(
      "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?"
    ).bind(paymentIntent, new Date().toISOString(), orderId).run();

    // Get order details
    const order = await env.DB.prepare(
      "SELECT * FROM orders WHERE id = ?"
    ).bind(orderId).first();

    // Send confirmation email
    const emailSent = await sendEmailWithPDF(env, order);
    if (emailSent) {
      await env.DB.prepare(
        "UPDATE orders SET email_sent_at = ?, delivery_status = 'email_sent' WHERE id = ?"
      ).bind(new Date().toISOString(), orderId).run();
    }
  }
}
```

Also update `wrangler.toml` for webhook worker to include email secrets:

```toml
# In workers/stripe-webhook/wrangler.toml
[vars]
CITESITE_URL = "https://citesite.net"

# Secrets (set with: npx wrangler secret put)
# SENDGRID_API_KEY or RESEND_API_KEY
# STRIPE_SECRET_KEY
```

---

## Step 5: Update Frontend

Edit `src/App.jsx` to handle payment success:

```javascript
// Near the top of the App component
const [paymentSuccess, setPaymentSuccess] = useState(false);
const [orderId, setOrderId] = useState(null);

// Add this useEffect to check for payment success in URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkout') === 'success') {
    const sessionId = params.get('session_id');
    setPaymentSuccess(true);
    // Note: You'd need to get orderId from checkout response
    // For now, trigger audit unlock flow
  }
}, []);

// When user unlocks report, pass orderId to audit API
const handleUnlockReport = async (orderId) => {
  try {
    const data = await callAuditAPI(auditUrl, false, orderId);
    setResults(data);
    setPage("results");
  } catch (err) {
    setAuditError(err.message);
  }
};

// Update checkout modal to return orderId
// In PaymentModal component:
const handlePay = async () => {
  if (!email) return setPaymentError('Please enter an email');
  setPaymentError(null);
  setProcessing(true);
  try {
    const res = await fetch(`${API_BASE}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Checkout creation failed');
    if (data.checkoutUrl) {
      // Store orderId before redirecting
      sessionStorage.setItem('pendingOrderId', data.orderId);
      window.location.href = data.checkoutUrl;
      return;
    }
    setStep('confirm');
  } catch (e) {
    setPaymentError(e.message || 'Checkout failed');
  } finally {
    setProcessing(false);
  }
};
```

---

## Step 6: Test the Payment Flow

### Local Testing

```bash
# Start workers and frontend
npm run dev  # Terminal 1
cd workers/stripe-webhook && npx wrangler dev  # Terminal 2

# Use Stripe test card
# Success: 4242 4242 4242 4242
# Any expiry date (future)
# Any CVC
```

### Production Testing

```bash
# Deploy updated webhook
npm run deploy:webhook

# Test full flow
# 1. Run free audit
# 2. Click "Unlock Full Report"
# 3. Enter test email
# 4. Pay with 4242 4242 4242 4242
# 5. Verify webhook receives event
# 6. Check email received
# 7. Verify full audit unlocked
```

---

## Step 7: Monitoring & Debugging

### Check Webhook Logs

```bash
npx wrangler tail citesite-webhook
```

### Check Email Delivery

**SendGrid Dashboard:**
- Go to SendGrid → Activity
- See sent/bounced/opened emails

**Resend Dashboard:**
- Go to Resend → Emails
- See delivery status

### Debug Database

```bash
# Check order status
npx wrangler d1 execute citesite-db \
  --command "SELECT id, status, email_sent_at, delivery_status FROM orders ORDER BY created_at DESC LIMIT 5;"

# Check if order was marked paid
npx wrangler d1 execute citesite-db \
  --command "SELECT * FROM orders WHERE id='ORDER_ID';"
```

---

## Troubleshooting

### Email not sending

```bash
# Check email service secret is set
npx wrangler secret list | grep -i sendgrid

# Check error logs
npx wrangler tail citesite-webhook
# Look for email service errors
```

### Webhook not triggering

```bash
# Use Stripe CLI to test
stripe listen --forward-to https://webhook.citesite.net/
stripe trigger payment_intent.succeeded --override metadata[order_id]=test-order-123

# Manually update order in DB
npx wrangler d1 execute citesite-db \
  --command "UPDATE orders SET status='paid' WHERE id='ORDER_ID';"
```

### Audit still showing "locked"

```bash
# Verify order.status is 'paid' in database
npx wrangler d1 execute citesite-db \
  --command "SELECT status FROM orders WHERE id='ORDER_ID';"

# Frontend needs to reload or re-fetch audit with orderId
```

---

## Deployment Checklist

- [ ] Email service account created and API key generated
- [ ] Email service secret set in webhook worker
- [ ] Database migration applied (pdf_url, email_sent_at columns)
- [ ] Webhook worker code updated with email sending
- [ ] Frontend code updated to handle orderId
- [ ] Webhook worker deployed
- [ ] Test full payment flow locally
- [ ] Test full payment flow in production
- [ ] Email delivery verified
- [ ] Audit unlocks after payment
- [ ] Monitor logs for errors

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Stripe redirect | < 2 seconds |
| Webhook processing | < 5 seconds |
| Email delivery | < 2 minutes |
| Audit unlock | < 3 seconds |
| Full flow | < 5 minutes |

---

## Next: Phase 4

After Phase 3 is complete:
1. PDF generation (store PDFs in R2 for email links)
2. Email templates (branded, professional)
3. Analytics dashboard (track conversions, failures)
4. Customer support (manual re-send, order lookup)

