import { json } from '../../_shared/stripe.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

const STATUSES = new Set(['pending','verified','rejected']);
const clean = (value, max = 80) => String(value ?? '').trim().slice(0, max);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  try {
    const result = await env.DB.prepare(`SELECT review_id, author, review, status, consent_publication, created_at, updated_at
      FROM sf_reviews ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END, created_at DESC
      LIMIT 500`).all();
    return json({ reviews: result.results || [] });
  } catch (error) {
    console.error('Trainer reviews read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać opinii. Sprawdź migrację D1.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const id = clean(body?.review_id, 64);
  const status = clean(body?.status, 20);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.has(status)) return json({ error: 'Nieprawidłowy identyfikator lub status opinii.' }, 400);
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(`UPDATE sf_reviews SET status = ?, updated_at = ?
      WHERE review_id = ? AND consent_publication = 1`).bind(status, now, id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono opinii lub brak zgody na publikację.' }, 404);
    return json({ ok: true, status, updated_at: now });
  } catch (error) {
    console.error('Trainer review update failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zaktualizować opinii.' }, 503);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get('review_id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Nieprawidłowy identyfikator opinii.' }, 400);
  try {
    const result = await env.DB.prepare('DELETE FROM sf_reviews WHERE review_id = ?').bind(id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono opinii.' }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error('Trainer review delete failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się usunąć opinii.' }, 503);
  }
}
