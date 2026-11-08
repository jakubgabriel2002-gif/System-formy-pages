import { json } from '../../_shared/http.js';
import { constantTimeStringMatch, createTrainerCookie, isSameOrigin, sha256Hex, trainerConfigReady } from '../../_shared/trainer-auth.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  if (!trainerConfigReady(env)) return json({ error: 'Panel trenera nie jest skonfigurowany. Ustaw TRAINER_PASSWORD w Cloudflare.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const password = typeof body?.password === 'string' ? body.password.slice(0, 500) : '';
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`${env.TRAINER_PASSWORD}:${ip}`);
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    await env.DB.prepare('DELETE FROM sf_trainer_login_attempts WHERE updated_at < ?').bind(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).run();
    const attempts = await env.DB.prepare('SELECT failed_count, window_started_at, blocked_until FROM sf_trainer_login_attempts WHERE ip_hash = ?').bind(ipHash).first();
    if (attempts?.blocked_until && attempts.blocked_until > nowIso) {
      return json({ error: 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.' }, 429);
    }

    if (!constantTimeStringMatch(password, env.TRAINER_PASSWORD)) {
      const cutoff = new Date(now.getTime() - WINDOW_MS).toISOString();
      const blockUntil = new Date(now.getTime() + WINDOW_MS).toISOString();
      await env.DB.prepare(`INSERT INTO sf_trainer_login_attempts (ip_hash, failed_count, window_started_at, blocked_until, updated_at)
        VALUES (?, 1, ?, NULL, ?)
        ON CONFLICT(ip_hash) DO UPDATE SET
          failed_count = CASE WHEN sf_trainer_login_attempts.window_started_at <= ? THEN 1 ELSE sf_trainer_login_attempts.failed_count + 1 END,
          window_started_at = CASE WHEN sf_trainer_login_attempts.window_started_at <= ? THEN excluded.window_started_at ELSE sf_trainer_login_attempts.window_started_at END,
          blocked_until = CASE WHEN sf_trainer_login_attempts.window_started_at <= ? THEN NULL WHEN sf_trainer_login_attempts.failed_count + 1 >= ? THEN ? ELSE sf_trainer_login_attempts.blocked_until END,
          updated_at = excluded.updated_at`)
        .bind(ipHash, nowIso, nowIso, cutoff, cutoff, cutoff, MAX_ATTEMPTS, blockUntil).run();
      const latest = await env.DB.prepare('SELECT failed_count, blocked_until FROM sf_trainer_login_attempts WHERE ip_hash = ?').bind(ipHash).first();
      if (latest?.blocked_until && latest.blocked_until > nowIso) return json({ error: 'Zbyt wiele nieudanych prób. Dostęp z tego adresu został czasowo zablokowany.' }, 429);
      return json({ error: 'Nieprawidłowe hasło.' }, 401);
    }

    await env.DB.prepare('DELETE FROM sf_trainer_login_attempts WHERE ip_hash = ?').bind(ipHash).run();
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Set-Cookie': await createTrainerCookie(env)
      }
    });
  } catch (error) {
    console.error('Trainer login error', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zweryfikować logowania. Sprawdź, czy wykonano migrację panelu.' }, 503);
  }
}
