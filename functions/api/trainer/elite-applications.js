import { json } from '../../_shared/stripe.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';
import { ELITE_STATUSES } from '../../_shared/elite-application.js';

const ID_RE = /^[0-9a-f-]{36}$/i;
const clean = (value, max) => String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  try {
    const result = await env.DB.prepare(`SELECT application_id, created_at, updated_at, source, name, email, social, age, gender,
        height_cm, weight_kg, goal, goal_details, experience, location, equipment, days_per_week, health_limitations,
        what_failed, readiness, budget, consent_privacy, consent_health, status, trainer_note
      FROM sf_elite_applications ORDER BY created_at DESC LIMIT 500`).all();
    return json({ applications: result.results || [] });
  } catch (error) {
    console.error('Trainer elite applications read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać zgłoszeń ELITE. Sprawdź migrację D1.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const id = clean(body?.application_id, 64);
  const status = clean(body?.status, 20);
  const note = clean(body?.trainer_note, 4000);
  if (!ID_RE.test(id) || !ELITE_STATUSES.includes(status)) return json({ error: 'Nieprawidłowy identyfikator lub status zgłoszenia.' }, 400);
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(`UPDATE sf_elite_applications SET status = ?, trainer_note = ?, updated_at = ?
      WHERE application_id = ?`).bind(status, note, now, id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono zgłoszenia.' }, 404);
    return json({ ok: true, status, trainer_note: note, updated_at: now });
  } catch (error) {
    console.error('Trainer elite application update failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać zmian.' }, 503);
  }
}

// Usunięcie zgłoszenia — np. na żądanie osoby (RODO) albo po zamknięciu obsługi.
export async function onRequestDelete({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get('application_id') || '';
  if (!ID_RE.test(id)) return json({ error: 'Nieprawidłowy identyfikator zgłoszenia.' }, 400);
  try {
    const result = await env.DB.prepare('DELETE FROM sf_elite_applications WHERE application_id = ?').bind(id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono zgłoszenia.' }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error('Trainer elite application delete failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się usunąć zgłoszenia.' }, 503);
  }
}
