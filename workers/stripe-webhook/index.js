export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    // Try to parse JSON body
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
      // Not JSON — can't process
      console.error('Invalid webhook JSON');
      return new Response('Invalid JSON', { status: 400 });
    }

    // Basic validation: fetch the event from Stripe to confirm it
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return new Response('Server misconfigured', { status: 500 });
    }

    // If event.id exists, fetch the canonical event from Stripe
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

        // mark order paid by matching metadata.order_id OR stripe_session_id
        if (orderId) {
          await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?").bind(paymentIntent, new Date().toISOString(), orderId).run();
        } else {
          await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE stripe_session_id = ?").bind(paymentIntent, new Date().toISOString(), sessionId).run();
        }
      }

      if (e.type === 'payment_intent.succeeded') {
        const intent = e.data.object;
        const paymentIntentId = intent.id;
        const orderId = intent.metadata?.order_id || null;

        if (orderId) {
          await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?").bind(paymentIntentId, new Date().toISOString(), orderId).run();
        } else {
          // best-effort: match by payment intent id stored earlier
          await env.DB.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE stripe_payment_intent_id = ?").bind(new Date().toISOString(), paymentIntentId).run();
        }
      }
    } catch (err) {
      console.error('DB update error in webhook', err);
      return new Response('Server error', { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
};
