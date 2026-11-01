import { CATALOG, isValidProductKey } from '../_shared/catalog.js';
import { json, stripeRequest } from '../_shared/stripe.js';

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ error: 'Nieprawidłowy format żądania.' }, 415);
  }
  if (!env.DB) return json({ error: 'Płatności nie są jeszcze uruchomione: brakuje połączenia z bazą zamówień D1 (binding DB).' }, 503);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Brakuje konfiguracji Stripe. Spróbuj ponownie później.' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Nie udało się odczytać żądania.' }, 400); }

  const productKey = String(body?.product || '');
  if (!isValidProductKey(productKey)) return json({ error: 'Wybrany produkt nie istnieje.' }, 400);
  const product = CATALOG[productKey];
  const consentInput = body?.consents && typeof body.consents === 'object' ? body.consents : {};
  const digitalContentProducts = ['start', 'individual-basic'];
  const isDigitalOnly = digitalContentProducts.includes(productKey);
  const needsEarlyServiceStart = ['pro', 'elite', 'individual-monitor', 'individual-full'].includes(productKey);
  if (consentInput.termsAccepted !== true || consentInput.privacyAcknowledged !== true) {
    return json({ error: 'Przed płatnością zaakceptuj regulamin i potwierdź zapoznanie się z polityką prywatności.' }, 400);
  }
  if (isDigitalOnly && consentInput.digitalContentConsent !== true) {
    return json({ error: 'Przed zakupem treści cyfrowej zaznacz odrębną zgodę na rozpoczęcie jej dostarczania oraz potwierdź informację o prawie odstąpienia.' }, 400);
  }
  if (needsEarlyServiceStart && consentInput.serviceStartRequested !== true) {
    return json({ error: 'Przed płatnością potwierdź żądanie rozpoczęcia usługi przed upływem 14 dni i zapoznaj się z zasadami rozliczenia wykonanej części usługi.' }, 400);
  }
  if (product.fulfillment === 'download' && !env.PRODUCT_FILES) {
    return json({ error: 'Pobieranie materiałów SYSTEM START nie jest jeszcze skonfigurowane. Sprzedaż tego produktu pozostaje chwilowo wyłączona.' }, 503);
  }

  const orderRef = crypto.randomUUID();
  const now = new Date().toISOString();
  const retentionMonths = productKey === 'start' ? 6 : (productKey === 'elite' ? 9 : 8);
  const retentionDate = new Date();
  retentionDate.setUTCMonth(retentionDate.getUTCMonth() + retentionMonths);
  const consentRecord = {
    version: 'system-formy-checkout-consents-v2',
    termsVersion: '2.0-2026-11-01',
    privacyVersion: '1.1-2026-11-01',
    acceptedAt: now,
    termsAccepted: true,
    privacyAcknowledged: true,
    digitalContentConsent: isDigitalOnly,
    digitalContentConsentAt: isDigitalOnly ? now : null,
    serviceStartRequested: needsEarlyServiceStart,
    serviceStartRequestedAt: needsEarlyServiceStart ? now : null
  };

  try {
    await env.DB.prepare(`INSERT INTO sf_orders
      (order_ref, product_key, product_name, amount_minor, currency, payment_status, created_at, updated_at, retention_due_at)
      VALUES (?, ?, ?, ?, 'pln', 'creating_checkout', ?, ?, ?)`)
      .bind(orderRef, productKey, product.name, product.amount, now, now, retentionDate.toISOString()).run();

    await env.DB.prepare(`UPDATE sf_orders SET intake_json = ?, updated_at = ? WHERE order_ref = ?`)
      .bind(JSON.stringify({ checkoutConsents: consentRecord }), now, orderRef).run();

    const origin = new URL(request.url).origin;
    const form = new URLSearchParams({
      mode: 'payment',
      locale: 'pl',
      submit_type: 'pay',
      customer_creation: 'always',
      'line_items[0][price_data][currency]': 'pln',
      'line_items[0][price_data][unit_amount]': String(product.amount),
      'line_items[0][price_data][product_data][name]': product.name,
      'line_items[0][price_data][product_data][description]': product.stripeDescription,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/realizacja.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${product.page}?payment=cancelled`,
      'metadata[order_ref]': orderRef,
      'metadata[product_key]': productKey,
      'metadata[site]': 'system-formy-pages',
      'metadata[terms_version]': consentRecord.termsVersion,
      'metadata[terms_accepted_at]': now,
      'metadata[privacy_version]': consentRecord.privacyVersion,
      'metadata[privacy_acknowledged]': 'true',
      'metadata[digital_content_consent]': isDigitalOnly ? 'true' : 'false',
      ...(isDigitalOnly ? { 'metadata[digital_content_consent_at]': now } : {}),
      'metadata[service_start_requested]': needsEarlyServiceStart ? 'true' : 'false',
      ...(needsEarlyServiceStart ? { 'metadata[service_start_requested_at]': now } : {}),
      'payment_intent_data[metadata][order_ref]': orderRef,
      'payment_intent_data[metadata][product_key]': productKey
    });

    const session = await stripeRequest(env, '/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `system-formy-${orderRef}`
      },
      body: form
    });

    if (typeof session.url !== 'string' || !session.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error('STRIPE_INVALID_CHECKOUT_URL');
    }

    await env.DB.prepare(`UPDATE sf_orders SET session_id = ?, payment_status = 'pending', updated_at = ? WHERE order_ref = ?`)
      .bind(session.id, new Date().toISOString(), orderRef).run();

    return json({ url: session.url });
  } catch (error) {
    try {
      await env.DB.prepare(`UPDATE sf_orders SET payment_status = 'checkout_error', updated_at = ? WHERE order_ref = ?`)
        .bind(new Date().toISOString(), orderRef).run();
    } catch (dbError) {
      console.error('Could not mark checkout order error', dbError instanceof Error ? dbError.message : 'unknown');
    }
    console.error('Checkout creation failed', error instanceof Error ? error.message : 'unknown');
    if (error instanceof Error && error.message === 'STRIPE_NOT_CONFIGURED') return json({ error: 'Brakuje poprawnego klucza Stripe w Cloudflare.' }, 503);
    return json({ error: 'Nie udało się teraz rozpocząć płatności. Spróbuj ponownie później.' }, 502);
  }
}
