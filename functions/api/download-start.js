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
    const order = await env.DB.prepare(`SELECT payment_status, download_variant, downloaded_at FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
      .bind(verified.orderRef, sessionId).first();
    if (!order || order.payment_status !== 'paid') return json({ error: 'Zamówienie nie jest potwierdzone.' }, 403);
    if (order.download_variant || order.downloaded_at) {
      const chosen = order.download_variant === 'home' ? 'plan do domu' : order.download_variant === 'gym' ? 'plan na siłownię' : 'wybrany pakiet';
      return json({ error: `Pakiet został już wykorzystany (${chosen}). Drugiego wariantu ani ponownego pobrania nie można już uruchomić.`, already_used: true, download_variant: order.download_variant || null }, 409);
    }

    // W istniejącym buckecie pliki były wgrywane z nazwami system-start-home.zip
    // i system-start-gym.zip do folderu system-start. Zachowujemy też zgodność
    // z krótszymi kluczami opisanymi w starszej instrukcji wdrożenia.
    const objectKeys = variant === 'home'
      ? ['system-start/system-start-home.zip', 'system-start/home.zip', 'system-start-home.zip']
      : ['system-start/system-start-gym.zip', 'system-start/gym.zip', 'system-start-gym.zip'];
    let object = null;
    for (const objectKey of objectKeys) {
      object = await env.PRODUCT_FILES.get(objectKey);
      if (object) break;
    }
    if (!object) return json({ error: 'Nie znaleziono pakietu SYSTEM START w prywatnym magazynie. Sprawdź pliki home/gym w bucketcie PRODUCT_FILES.' }, 503);

    const claimedAt = new Date().toISOString();
    const claim = await env.DB.prepare(`UPDATE sf_orders
      SET download_variant = ?, downloaded_at = ?, updated_at = ?
      WHERE order_ref = ? AND session_id = ? AND payment_status = 'paid'
        AND download_variant IS NULL AND downloaded_at IS NULL`)
      .bind(variant, claimedAt, claimedAt, verified.orderRef, sessionId).run();
    if (Number(claim.meta?.changes || 0) !== 1) {
      const latest = await env.DB.prepare(`SELECT download_variant FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
        .bind(verified.orderRef, sessionId).first();
      const chosen = latest?.download_variant === 'home' ? 'plan do domu' : latest?.download_variant === 'gym' ? 'plan na siłownię' : 'wybrany pakiet';
      return json({ error: `Pakiet został już wykorzystany (${chosen}). Drugiego wariantu ani ponownego pobrania nie można już uruchomić.`, already_used: true, download_variant: latest?.download_variant || null }, 409);
    }

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
