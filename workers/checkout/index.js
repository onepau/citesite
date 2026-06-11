const DEFAULT_ALLOWED_ORIGINS = [
  "https://citesite.net",
  "https://www.citesite.net",
  "http://localhost:5174",
  "http://localhost:5173",
];

function corsHeaders(request, env) {
  const allowed = new Set(
    env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
      : DEFAULT_ALLOWED_ORIGINS,
  );
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && allowed.has(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export default {
  async fetch(request, env) {
    const CORS_HEADERS = corsHeaders(request, env);
    const reqUrl = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/coupon/validate — look up a Stripe promotion code
    if (reqUrl.pathname === "/api/coupon/validate") {
      const { code } = body || {};
      if (!code || typeof code !== "string" || !code.trim()) {
        return new Response(
          JSON.stringify({ valid: false, error: "Code is required" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      const stripeKey = env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return new Response(
          JSON.stringify({ valid: false, error: "Not configured" }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      const res = await fetch(
        `https://api.stripe.com/v1/promotion_codes?code=${encodeURIComponent(code.trim().toUpperCase())}&active=true&limit=1`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.data?.length) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const promo = data.data[0];
      const coupon = promo.coupon;
      const discountDescription = coupon.percent_off
        ? `${coupon.percent_off}% off`
        : `${(coupon.amount_off / 100).toFixed(0)} ${coupon.currency.toUpperCase()} off`;
      return new Response(
        JSON.stringify({
          valid: true,
          discountDescription,
          promotionCodeId: promo.id,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { email, url, promotionCodeId } = body || {};
    const normalisedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !normalisedEmail ||
      normalisedEmail.length > 320 ||
      !EMAIL_RE.test(normalisedEmail)
    ) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Per-IP rate limit — anonymous checkout creates DB rows + Stripe sessions.
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success: rlOk } = await env.CHECKOUT_RATE_LIMITER.limit({
      key: clientIp,
    });
    if (!rlOk) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // create a local order record (pending)
    const orderId = crypto.randomUUID();
    const amount = env.PRICE_CHF_CENTS ? Number(env.PRICE_CHF_CENTS) : 4999; // default CHF 49.99
    const currency = env.PRICE_CURRENCY || "chf";

    try {
      await env.DB.prepare(
        "INSERT INTO orders (id, email, url, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          orderId,
          normalisedEmail,
          url || null,
          amount,
          currency.toUpperCase(),
          "pending",
          new Date().toISOString(),
        )
        .run();
    } catch (e) {
      console.error("DB insert failed", e);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Create Stripe Checkout Session via REST API (no SDK required)
    const params = new URLSearchParams();
    params.append("mode", "payment");
    const successUrl =
      env.STRIPE_SUCCESS_URL ||
      `${env.PUBLIC_SITE_URL || "https://citesite.net"}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      env.STRIPE_CANCEL_URL ||
      `${env.PUBLIC_SITE_URL || "https://citesite.net"}/?checkout=cancel`;
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price_data][currency]", currency);
    params.append(
      "line_items[0][price_data][product_data][name]",
      env.STRIPE_PRODUCT_NAME || "CiteSite Full Report",
    );
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][quantity]", "1");
    params.append("payment_method_types[]", "card");
    params.append("customer_email", normalisedEmail);
    // Attach our internal order id so we can match in the webhook using metadata
    params.append("metadata[order_id]", orderId);
    // Apply promotion code if provided, otherwise allow Stripe-hosted entry
    if (promotionCodeId) {
      params.append("discounts[0][promotion_code]", promotionCodeId);
    } else {
      params.append("allow_promotion_codes", "true");
    }

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Stripe checkout creation failed", data);
      return new Response(
        JSON.stringify({
          error: data.error?.message || "Stripe checkout creation failed",
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // store the checkout session id on the order (best-effort)
    try {
      await env.DB.prepare(
        "UPDATE orders SET stripe_session_id = ?, updated_at = ? WHERE id = ?",
      )
        .bind(data.id, new Date().toISOString(), orderId)
        .run();
    } catch (e) {
      console.error("DB update stripe_session_id failed", e);
    }

    return new Response(
      JSON.stringify({ checkoutUrl: data.url, sessionId: data.id, orderId }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  },
};
