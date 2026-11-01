import { json, isPaidSession } from '../_shared/stripe.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB || !env.PRODUCT_FILES || !env.STRIPE_SECRET_KEY) {
    return json({ error: 'Pobieranie nie jest jeszcze skonfigurowane.' }, 503);
  }
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const variant = url.searchParams.get('variant');
  if (!['home', 'gym'].includes(variant)) return json({ error: 'Wybierz poprawny wariant materiałów.' }, 400);

  try {
    const verified = await isPaidSession(env, sessionId, 'start');
    if (!verified.paid) return json({ error: 'Płatność nie została jeszcze potwierdzona.' }, 402);
    const order = await env.DB.prepare(`SELECT payment_status FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
      .bind(verified.orderRef, sessionId).first();
    if (!order || order.payment_status !== 'paid') return json({ error: 'Zamówienie nie jest potwierdzone.' }, 403);

    const objectKey = variant === 'home' ? 'system-start/home.zip' : 'system-start/gym.zip';
    const object = await env.PRODUCT_FILES.get(objectKey);
    if (!object) return json({ error: 'Materiały nie zostały jeszcze wgrane do prywatnego magazynu. Skontaktuj się z SYSTEM FORMY.' }, 503);

    await env.DB.prepare(`UPDATE sf_orders SET download_variant = ?, downloaded_at = ? WHERE order_ref = ?`)
      .bind(variant, new Date().toISOString(), verified.orderRef).run();

    const filename = variant === 'home' ? 'SYSTEM-FORMY-PLAN-DO-DOMU.zip' : 'SYSTEM-FORMY-PLAN-NA-SILOWNIE.zip';
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    });
    if (object.size) headers.set('Content-Length', String(object.size));
    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SESSION') return json({ error: 'Nieprawidłowa sesja płatności.' }, 400);
    console.error('START download failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się udostępnić materiałów.' }, 502);
  }
}
