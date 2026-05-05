/* ═══════════════════════════════════════════════════════════════════
   CiteSite Stripe Webhook Handler
   ───────────────────────────────────────────────────────────────────
   Handles Stripe events:
   - checkout.session.completed — mark order as paid, send email
   - payment_intent.succeeded — alternative payment confirmation
   ═══════════════════════════════════════════════════════════════════ */

async function sendConfirmationEmail(env, order) {
  if (!env.SENDGRID_API_KEY && !env.RESEND_API_KEY) {
    console.warn('No email service configured, skipping email');
    return false;
  }

  try {
    const auditUrl = `${env.CITESITE_URL || 'https://citesite.net'}/?orderId=${order.id}`;
    const emailSubject = 'Your CiteSite GEO Audit Report is Ready';
    const emailBody = `Hello,

Your CiteSite audit is being processed. You can view your full report here:

${auditUrl}

If you have any questions, feel free to reply to this email.

Best regards,
The CiteSite Team`;

    if (env.SENDGRID_API_KEY) {
      console.log('Sending email via SendGrid');
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: order.email }] }],
          from: { email: 'noreply@citesite.net', name: 'CiteSite' },
          subject: emailSubject,
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      });

      if (res.ok) {
        console.log('Email sent successfully via SendGrid');
        return true;
      } else {
        const err = await res.text();
        console.error('SendGrid error:', err);
        return false;
      }
    } else if (env.RESEND_API_KEY) {
      console.log('Sending email via Resend');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CiteSite <noreply@citesite.net>',
          to: order.email,
          subject: emailSubject,
          html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
        }),
      });

      if (res.ok) {
        console.log('Email sent successfully via Resend');
        return true;
      } else {
        const err = await res.text();
        console.error('Resend error:', err);
        return false;
      }
    }
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    let bodyText;
    try {
      bodyText = await request.text();
    } catch (e) {
      console.error('Failed to read webhook body', e);
      return new Response('Bad Request', { status: 400 });
    }

    let event;
    try {
      event = JSON.parse(bodyText);
    } catch (e) {
      console.error('Invalid webhook JSON');
      return new Response('Invalid JSON', { status: 400 });
    }

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return new Response('Server misconfigured', { status: 500 });
    }

    let stripeEvent = null;
    if (event && event.id) {
      try {
        const res = await fetch(`https://api.stripe.com/v1/events/${encodeURIComponent(event.id)}`, {
          headers: { Authorization: `Bearer ${stripeKey}` }
        });
        if (res.ok) stripeEvent = await res.json();
      } catch (e) {
        console.error('Failed to fetch stripe event', e);
      }
    }

    const e = stripeEvent || event;
    if (!e || !e.type) {
      console.error('Webhook missing type');
      return new Response('Ignored', { status: 400 });
    }

    try {
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

          // Fetch order details for email
          const order = await env.DB.prepare(
            "SELECT * FROM orders WHERE id = ?"
          ).bind(orderId).first();

          if (order) {
            // Send confirmation email
            const emailSent = await sendConfirmationEmail(env, order);
            if (emailSent) {
              await env.DB.prepare(
                "UPDATE orders SET email_sent_at = ?, delivery_status = 'email_sent' WHERE id = ?"
              ).bind(new Date().toISOString(), orderId).run();
            }
          }
        } else {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE stripe_session_id = ?"
          ).bind(paymentIntent, new Date().toISOString(), sessionId).run();
        }
      }

      if (e.type === 'payment_intent.succeeded') {
        const intent = e.data.object;
        const paymentIntentId = intent.id;
        const orderId = intent.metadata?.order_id || null;

        if (orderId) {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?"
          ).bind(paymentIntentId, new Date().toISOString(), orderId).run();

          const order = await env.DB.prepare(
            "SELECT * FROM orders WHERE id = ?"
          ).bind(orderId).first();

          if (order) {
            const emailSent = await sendConfirmationEmail(env, order);
            if (emailSent) {
              await env.DB.prepare(
                "UPDATE orders SET email_sent_at = ?, delivery_status = 'email_sent' WHERE id = ?"
              ).bind(new Date().toISOString(), orderId).run();
            }
          }
        } else {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', updated_at = ? WHERE stripe_payment_intent_id = ?"
          ).bind(new Date().toISOString(), paymentIntentId).run();
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err);
      return new Response('Server error', { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
};
