import { json } from '../_shared/stripe.js';
import { isSameOrigin, sha256Hex } from '../_shared/trainer-auth.js';
import { validateEliteApplication } from '../_shared/elite-application.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 5;

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  if (!env.DB) return json({ error: 'Formularz jest chwilowo niedostępny. Spróbuj ponownie później.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }

  // Honeypot: boty wypełniają ukryte pole — udajemy sukces, nic nie zapisujemy.
  if (String(body?.website ?? '').trim()) return json({ ok: true });

  const validation = validateEliteApplication(body);
  if (!validation.ok) return json({ error: validation.error }, 400);
  const data = validation.data;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`sf-elite-application:${ip}`);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();

  try {
    // Skrót IP służy tylko do limitu spamu i jest czyszczony po 30 dniach.
    await env.DB.prepare(`UPDATE sf_elite_applications SET ip_hash = '' WHERE created_at < ? AND ip_hash <> ''`)
      .bind(new Date(nowMs - 30 * DAY_MS).toISOString()).run();
    const recent = await env.DB.prepare(`SELECT
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_hour,
        COUNT(*) AS last_day
      FROM sf_elite_applications WHERE ip_hash = ? AND created_at >= ?`)
      .bind(new Date(nowMs - HOUR_MS).toISOString(), ipHash, new Date(nowMs - DAY_MS).toISOString()).first();
    if (Number(recent?.last_hour || 0) >= MAX_PER_HOUR || Number(recent?.last_day || 0) >= MAX_PER_DAY) {
      return json({ error: 'Z tego połączenia wysłano już kilka zgłoszeń. Spróbuj ponownie później.' }, 429);
    }

    await env.DB.prepare(`INSERT INTO sf_elite_applications
      (application_id, created_at, updated_at, source, name, email, social, age, gender, height_cm, weight_kg,
       goal, goal_details, experience, location, equipment, days_per_week, health_limitations, what_failed,
       readiness, budget, consent_privacy, consent_health, consent_text_version, status, trainer_note, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'elite-application-v1', 'new', '', ?)`)
      .bind(
        crypto.randomUUID(), now, now, data.source, data.name, data.email, data.social, data.age, data.gender,
        data.height_cm, data.weight_kg, data.goal, data.goal_details, data.experience, data.location, data.equipment,
        data.days_per_week, data.health_limitations, data.what_failed, data.readiness, data.budget,
        data.consent_health ? 1 : 0, ipHash
      ).run();
    return json({ ok: true }, 201);
  } catch (error) {
    console.error('Elite application submission failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.' }, 503);
  }
}
