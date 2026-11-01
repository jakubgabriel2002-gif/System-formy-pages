import { CATALOG } from '../_shared/catalog.js';
import { json, retrieveCheckoutSession } from '../_shared/stripe.js';

export async function onRequestGet({ request, env }) {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!env.DB || !env.STRIPE_SECRET_KEY) return json({ error: 'Weryfikacja płatności nie jest skonfigurowana.' }, 503);
  try {
    const session = await retrieveCheckoutSession(env, sessionId);
    const productKey = session.metadata?.product_key;
    const orderRef = session.metadata?.order_ref;
    const product = CATALOG[productKey];
    if (!product || !orderRef) return json({ error: 'Nie znaleziono zamówienia.' }, 404);
    const order = await env.DB.prepare(`SELECT order_ref, session_id, product_key, payment_status FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
      .bind(orderRef, session.id).first();
    if (!order || order.product_key !== productKey) return json({ error: 'Nie znaleziono zamówienia.' }, 404);

    if (order.payment_status === 'payment_failed') return json({ status: 'failed' });
    if (order.payment_status === 'expired' || session.status === 'expired') {
      await env.DB.prepare(`UPDATE sf_orders SET payment_status = 'expired', updated_at = ? WHERE order_ref = ?`)
        .bind(new Date().toISOString(), orderRef).run();
      return json({ status: 'expired' });
    }

    if (session.payment_status === 'paid') {
      const email = session.customer_details?.email || session.customer_email || null;
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
      await env.DB.prepare(`UPDATE sf_orders SET payment_status = 'paid', customer_email = COALESCE(?, customer_email), payment_intent = COALESCE(?, payment_intent), paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE order_ref = ? AND session_id = ?`)
        .bind(email, paymentIntent, new Date().toISOString(), new Date().toISOString(), orderRef, session.id).run();
      return json({ status: 'paid', product_key: productKey, product_name: product.name, fulfillment: product.fulfillment, email });
    }

    return json({ status: 'pending' }, 202);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SESSION') return json({ error: 'Nieprawidłowy identyfikator płatności.' }, 400);
    console.error('Checkout status check failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zweryfikować płatności. Odśwież stronę za chwilę.' }, 502);
  }
}
