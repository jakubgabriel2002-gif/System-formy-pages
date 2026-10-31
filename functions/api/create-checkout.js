// Cloudflare Pages Function — independent checkout endpoint for the public System Formy website.
// Configure STRIPE_SECRET_KEY and Stripe Price IDs in Pages > Settings > Variables and Secrets.
const PRICE_KEYS = { start: 'STRIPE_PRICE_START', standard: 'STRIPE_PRICE_STANDARD', premium: 'STRIPE_PRICE_PREMIUM' };
export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) return Response.json({ error: 'Płatności nie są jeszcze skonfigurowane.' }, { status: 503 });
    const body = await request.json();
    const product = String(body.product || '');
    if (!Object.hasOwn(PRICE_KEYS, product)) return Response.json({ error: 'Nieznany produkt.' }, { status: 400 });
    const priceId = env[PRICE_KEYS[product]];
    if (!priceId) return Response.json({ error: 'Brakuje konfiguracji ceny tego pakietu w Stripe.' }, { status: 503 });
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({ mode: 'payment', 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1', success_url: `${origin}/?payment=success`, cancel_url: `${origin}/?payment=cancelled`, 'metadata[product_key]': `system-formy-${product}`, 'metadata[source]': 'system-formy-public-site' });
    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
    const result = await stripe.json();
    if (!stripe.ok) return Response.json({ error: result.error?.message || 'Stripe odrzucił żądanie.' }, { status: 502 });
    return Response.json({ url: result.url });
  } catch { return Response.json({ error: 'Nie udało się rozpocząć płatności.' }, { status: 400 }); }
}
