import { json } from '../_shared/http.js';
import { isSameOrigin, sha256Hex } from '../_shared/trainer-auth.js';

const clean = (value, max) => String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`SELECT review_id, author, review, status, created_at
      FROM sf_reviews
      WHERE status IN ('pending','verified')
      ORDER BY created_at DESC
      LIMIT 40`).all();
    return json({ reviews: result.results || [] });
  } catch (error) {
    console.error('Public reviews read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać opinii.' }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }

  // Honeypot for basic automated spam.
  if (clean(body?.website, 120)) return json({ ok: true });
  const author = clean(body?.author, 80);
  const review = clean(body?.review, 2000);
  if (author.length < 2 || review.length < 10) return json({ error: 'Podaj podpis (min. 2 znaki) i opinię (min. 10 znaków).' }, 400);
  if (body?.consent !== true) return json({ error: 'Zaznacz zgodę na publikację opinii.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`sf-review:${ip}`);
  try {
    const ipHashCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare(`UPDATE sf_reviews SET ip_hash = '' WHERE created_at < ? AND ip_hash <> ''`).bind(ipHashCutoff).run();
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS total FROM sf_reviews
      WHERE ip_hash = ? AND created_at >= ?`).bind(ipHash, new Date(Date.now() - 60 * 60 * 1000).toISOString()).first();
    if (Number(recent?.total || 0) >= 3) return json({ error: 'Z tego połączenia dodano już kilka opinii. Spróbuj ponownie później.' }, 429);

    const reviewId = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO sf_reviews
      (review_id, author, review, status, consent_publication, ip_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', 1, ?, ?, ?)`)
      .bind(reviewId, author, review, ipHash, now, now).run();
    return json({ ok: true, review: { review_id: reviewId, author, review, status: 'pending', created_at: now } }, 201);
  } catch (error) {
    console.error('Review submission failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać opinii. Spróbuj ponownie później.' }, 503);
  }
}
