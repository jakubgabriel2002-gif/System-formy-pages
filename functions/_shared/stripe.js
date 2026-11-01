export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function addMonthsIso(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString();
}

export async function stripeRequest(env, path, options = {}) {
  if (!env.STRIPE_SECRET_KEY || !/^sk_(test|live)_/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error('STRIPE_NOT_CONFIGURED');
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Stripe API error', response.status, data?.error?.type || 'unknown');
    throw new Error('STRIPE_API_ERROR');
  }
  return data;
}

export async function retrieveCheckoutSession(env, sessionId) {
  if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    throw new Error('INVALID_SESSION');
  }
  const session = await stripeRequest(env, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.id !== sessionId) throw new Error('INVALID_SESSION');
  const keyIsLive = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  if (Boolean(session.livemode) !== keyIsLive) throw new Error('SESSION_MODE_MISMATCH');
  return session;
}

export async function isPaidSession(env, sessionId, expectedProductKey = null) {
  const session = await retrieveCheckoutSession(env, sessionId);
  if (session.payment_status !== 'paid') return { paid: false, session };
  const productKey = session.metadata?.product_key;
  const orderRef = session.metadata?.order_ref;
  if (!productKey || !orderRef || (expectedProductKey && productKey !== expectedProductKey)) {
    throw new Error('SESSION_METADATA_MISMATCH');
  }
  return { paid: true, session, productKey, orderRef };
}

export function corsafeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
