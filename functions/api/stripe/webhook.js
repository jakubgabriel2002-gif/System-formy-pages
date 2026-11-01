import { json } from '../../_shared/stripe.js';

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const fields = header.split(',').map(part => part.trim().split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const signedPayload = new Uint8Array(prefix.length + rawBody.length);
  signedPayload.set(prefix, 0);
  signedPayload.set(rawBody, prefix.length);

  for (const signature of signatures) {
    const bytes = hexToBytes(signature);
    if (bytes && await crypto.subtle.verify('HMAC', key, bytes, signedPayload)) return true;
  }
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.DB) {
    return json({ error: 'Webhook nie jest skonfigurowany.' }, 503);
  }
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const valid = await verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: 'Nieprawidłowy podpis webhooka.' }, 400);

  let event;
  try { event = JSON.parse(new TextDecoder().decode(rawBody)); }
  catch { return json({ error: 'Nieprawidłowy JSON.' }, 400); }
  if (!event?.id || !event?.type || !event?.data?.object) return json({ error: 'Niekompletne zdarzenie Stripe.' }, 400);

  const accepted = new Set([
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired'
  ]);
  if (!accepted.has(event.type)) return json({ received: true, ignored: true });

  const session = event.data.object;
  const orderRef = session?.metadata?.order_ref;
  if (!orderRef || !session?.id) {
    // Record unexpected valid events for traceability; do not attempt fulfilment.
    await env.DB.prepare(`INSERT OR IGNORE INTO sf_stripe_events (event_id, event_type, received_at) VALUES (?, ?, ?)`)
      .bind(event.id, event.type, new Date().toISOString()).run();
    return json({ received: true, ignored: true });
  }

  let nextStatus = 'pending';
  if (event.type === 'checkout.session.async_payment_failed') nextStatus = 'payment_failed';
  else if (event.type === 'checkout.session.expired') nextStatus = 'expired';
  else if (event.type === 'checkout.session.async_payment_succeeded' || (event.type === 'checkout.session.completed' && session.payment_status === 'paid')) nextStatus = 'paid';

  const email = session.customer_details?.email || session.customer_email || null;
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const paidAt = nextStatus === 'paid' ? new Date().toISOString() : null;

  try {
    // D1 batch executes the event insert and order update atomically. Replayed
    // Stripe events are harmless: INSERT OR IGNORE plus deterministic UPDATE.
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO sf_stripe_events (event_id, event_type, received_at) VALUES (?, ?, ?)`)
        .bind(event.id, event.type, new Date().toISOString()),
      env.DB.prepare(`UPDATE sf_orders
        SET session_id = ?, payment_status = ?, customer_email = COALESCE(?, customer_email),
            payment_intent = COALESCE(?, payment_intent),
            paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, ?) ELSE paid_at END,
            updated_at = ?
        WHERE order_ref = ? AND product_key = ? AND (session_id IS NULL OR session_id = ?)` )
        .bind(session.id, nextStatus, email, paymentIntent, nextStatus, paidAt, new Date().toISOString(), orderRef, session.metadata.product_key, session.id)
    ]);
    return json({ received: true });
  } catch (error) {
    console.error('Webhook database update failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać zdarzenia.' }, 500);
  }
}
