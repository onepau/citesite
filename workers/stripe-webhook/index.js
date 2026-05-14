/* ═══════════════════════════════════════════════════════════════════
   CiteSite Stripe Webhook Handler
   ───────────────────────────────────────────────────────────────────
   Handles Stripe events:
   - checkout.session.completed — mark order as paid, send email
   - payment_intent.succeeded — alternative payment confirmation
   ═══════════════════════════════════════════════════════════════════ */

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

function hexToBytes(hex) {
  if (typeof hex !== "string" || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function parseSignatureHeader(header) {
  if (!header || typeof header !== "string") return null;
  let timestamp = null;
  const v1Sigs = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=");
    if (k === "t") timestamp = v;
    else if (k === "v1" && v) v1Sigs.push(v);
  }
  if (!timestamp || v1Sigs.length === 0) return null;
  return { timestamp, v1Sigs };
}

async function verifyStripeSignature(rawBody, header, secret) {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const ts = parseInt(parsed.timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const macBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${parsed.timestamp}.${rawBody}`),
  );
  const expected = new Uint8Array(macBuf);

  for (const sig of parsed.v1Sigs) {
    const provided = hexToBytes(sig);
    if (provided && timingSafeEqual(provided, expected)) return true;
  }
  return false;
}

async function sendConfirmationEmail(env, order) {
  if (!env.SENDGRID_API_KEY && !env.RESEND_API_KEY) {
    console.warn("No email service configured, skipping email");
    return false;
  }

  try {
    const emailSubject = "Your CiteSite GEO Audit is Being Processed";
    const emailBody = `Hello,

Thank you for your order! We're generating your detailed GEO audit report right now.

You'll receive another email in about a minute with a link to view and download your full PDF report.

If you have any questions, feel free to reply to this email.

Best regards,
The CiteSite Team`;

    if (env.SENDGRID_API_KEY) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: order.email }] }],
          from: { email: "noreply@citesite.net", name: "CiteSite" },
          subject: emailSubject,
          content: [{ type: "text/plain", value: emailBody }],
        }),
      });

      if (res.ok) return true;
      console.error("SendGrid error:", await res.text());
      return false;
    }

    if (env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CiteSite <noreply@citesite.net>",
          to: order.email,
          subject: emailSubject,
          html: `<p>${emailBody.replace(/\n/g, "<br>")}</p>`,
        }),
      });

      if (res.ok) return true;
      console.error("Resend error:", await res.text());
      return false;
    }
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
  return false;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    let bodyText;
    try {
      bodyText = await request.text();
    } catch (e) {
      console.error("Failed to read webhook body", e);
      return new Response(JSON.stringify({ error: "Bad Request" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const sigHeader = request.headers.get("Stripe-Signature");
    const valid = await verifyStripeSignature(
      bodyText,
      sigHeader,
      env.STRIPE_WEBHOOK_SECRET,
    );
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: JSON_HEADERS,
      });
    }

    let event;
    try {
      event = JSON.parse(bodyText);
    } catch {
      console.error("Invalid webhook JSON");
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    if (!event || !event.type || !event.id) {
      console.error("Webhook missing type or id");
      return new Response(JSON.stringify({ error: "Malformed event" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    // Idempotency: skip if we've already processed this event
    try {
      const dedup = await env.DB.prepare(
        "INSERT OR IGNORE INTO processed_events (event_id) VALUES (?)",
      )
        .bind(event.id)
        .run();
      if (!dedup.meta || dedup.meta.changes === 0) {
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          {
            status: 200,
            headers: JSON_HEADERS,
          },
        );
      }
    } catch (err) {
      console.error("Idempotency check failed:", err);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const sessionId = session.id;
        const orderId = session.metadata?.order_id || null;
        const paymentIntent = session.payment_intent || null;

        if (orderId) {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?",
          )
            .bind(paymentIntent, new Date().toISOString(), orderId)
            .run();

          const order = await env.DB.prepare(
            "SELECT * FROM orders WHERE id = ?",
          )
            .bind(orderId)
            .first();

          if (order) {
            const emailSent = await sendConfirmationEmail(env, order);
            if (emailSent) {
              await env.DB.prepare(
                "UPDATE orders SET email_sent_at = ?, delivery_status = 'email_sent' WHERE id = ?",
              )
                .bind(new Date().toISOString(), orderId)
                .run();
            }
          }
        } else {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE stripe_session_id = ?",
          )
            .bind(paymentIntent, new Date().toISOString(), sessionId)
            .run();
        }
      }

      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        const paymentIntentId = intent.id;
        const orderId = intent.metadata?.order_id || null;

        if (orderId) {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?",
          )
            .bind(paymentIntentId, new Date().toISOString(), orderId)
            .run();

          const order = await env.DB.prepare(
            "SELECT * FROM orders WHERE id = ?",
          )
            .bind(orderId)
            .first();

          if (order) {
            const emailSent = await sendConfirmationEmail(env, order);
            if (emailSent) {
              await env.DB.prepare(
                "UPDATE orders SET email_sent_at = ?, delivery_status = 'email_sent' WHERE id = ?",
              )
                .bind(new Date().toISOString(), orderId)
                .run();
            }
          }
        } else {
          await env.DB.prepare(
            "UPDATE orders SET status = 'paid', updated_at = ? WHERE stripe_payment_intent_id = ?",
          )
            .bind(new Date().toISOString(), paymentIntentId)
            .run();
        }
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
      // Roll back the dedup row so Stripe's retry can succeed
      try {
        await env.DB.prepare("DELETE FROM processed_events WHERE event_id = ?")
          .bind(event.id)
          .run();
      } catch (cleanupErr) {
        console.error("Dedup rollback failed:", cleanupErr);
      }
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  },
};
