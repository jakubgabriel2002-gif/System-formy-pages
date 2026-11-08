import { json } from '../../_shared/http.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

// Ręczne potwierdzenie płatności dla zamówień z ankiet po zakupie (linki płatności Stripe bez API).
const ID_RE = /^[0-9a-f-]{36}$/i;

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const orderRef = String(body?.order_ref || '').trim();
  if (!ID_RE.test(orderRef)) return json({ error: 'Nieprawidłowy identyfikator zamówienia.' }, 400);
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(`UPDATE sf_orders SET payment_status = 'paid', paid_at = COALESCE(paid_at, ?), updated_at = ?
      WHERE order_ref = ? AND payment_status = 'unverified'`).bind(now, now, orderRef).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono zamówienia oczekującego na potwierdzenie płatności.' }, 404);
    return json({ ok: true, payment_status: 'paid', paid_at: now });
  } catch (error) {
    console.error('Payment confirmation failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się potwierdzić płatności.' }, 503);
  }
}
