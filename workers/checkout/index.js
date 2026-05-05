export default {
  async fetch(request, env) {
    const CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const { email, url } = body || {};
    if (!email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

    // create a local order record (pending)
    const orderId = crypto.randomUUID();
    const amount = env.PRICE_CHF_CENTS ? Number(env.PRICE_CHF_CENTS) : 4999; // default CHF 49.99
    const currency = env.PRICE_CURRENCY || "chf";

    try {
      await env.DB.prepare(
        "INSERT INTO orders (id, email, url, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(orderId, email, url || null, amount, currency.toUpperCase(), 'pending', new Date().toISOString()).run();
    } catch (e) {
      console.error('DB insert failed', e);
    }

    // Create Stripe Checkout Session via REST API (no SDK required)
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    const successUrl = env.STRIPE_SUCCESS_URL || `${env.PUBLIC_SITE_URL || 'https://citesite.net'}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = env.STRIPE_CANCEL_URL || `${env.PUBLIC_SITE_URL || 'https://citesite.net'}/?checkout=cancel`;
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('line_items[0][price_data][currency]', currency);
    params.append('line_items[0][price_data][product_data][name]', env.STRIPE_PRODUCT_NAME || 'CiteSite Full Report');
    params.append('line_items[0][price_data][unit_amount]', String(amount));
    params.append('line_items[0][quantity]', '1');
    params.append('payment_method_types[]', 'card');
    if (email) params.append('customer_email', email);
    // attach our internal order id so we can match in the webhook using metadata
    params.append('metadata[order_id]', orderId);

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Stripe checkout creation failed', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe checkout creation failed' }), { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // store the checkout session id on the order (best-effort)
    try {
      await env.DB.prepare("UPDATE orders SET stripe_session_id = ?, updated_at = ? WHERE id = ?").bind(data.id, new Date().toISOString(), orderId).run();
    } catch (e) {
      console.error('DB update stripe_session_id failed', e);
    }

    return new Response(JSON.stringify({ checkoutUrl: data.url, sessionId: data.id, orderId }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
