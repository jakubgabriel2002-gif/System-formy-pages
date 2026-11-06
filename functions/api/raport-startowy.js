import { json } from '../_shared/stripe.js';
import { isSameOrigin, sha256Hex } from '../_shared/trainer-auth.js';
import { validateRaportLead, consentRecord, userAgentShort } from '../_shared/raport-lead.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PER_IP_HOUR = 3;
const MAX_PER_IP_DAY = 5;
const MAX_PER_EMAIL_DAY = 2;
const LIMIT_MESSAGE = 'Z tych danych wysłano już zgłoszenie. Spróbuj ponownie później.';

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  if (!env.DB) return json({ error: 'Formularz jest chwilowo niedostępny. Spróbuj ponownie później.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Nieprawidłowe żądanie.' }, 400);

  // Honeypot: boty wypełniają ukryte pole — udajemy sukces, nic nie zapisujemy.
  if (String(body.website ?? '').trim()) return json({ ok: true });

  const validation = validateRaportLead(body);
  if (!validation.ok) return json({ error: validation.error, field: validation.field }, 400);
  const data = validation.data;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`sf-raport-startowy:${ip}`);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const dayAgo = new Date(nowMs - DAY_MS).toISOString();

  try {
    // Skrót IP służy tylko do limitu spamu i jest czyszczony po 30 dniach.
    await env.DB.prepare(`UPDATE lead_raport SET ip_hash = '' WHERE utworzono < ? AND ip_hash <> ''`)
      .bind(new Date(nowMs - 30 * DAY_MS).toISOString()).run();
    const byIp = await env.DB.prepare(`SELECT
        SUM(CASE WHEN utworzono >= ? THEN 1 ELSE 0 END) AS last_hour,
        COUNT(*) AS last_day
      FROM lead_raport WHERE ip_hash = ? AND utworzono >= ?`)
      .bind(new Date(nowMs - HOUR_MS).toISOString(), ipHash, dayAgo).first();
    const byEmail = await env.DB.prepare(`SELECT COUNT(*) AS last_day FROM lead_raport WHERE email = ? AND utworzono >= ?`)
      .bind(data.email, dayAgo).first();
    if (Number(byIp?.last_hour || 0) >= MAX_PER_IP_HOUR
      || Number(byIp?.last_day || 0) >= MAX_PER_IP_DAY
      || Number(byEmail?.last_day || 0) >= MAX_PER_EMAIL_DAY) {
      return json({ error: LIMIT_MESSAGE }, 429);
    }

    await env.DB.prepare(`INSERT INTO lead_raport
      (id, utworzono, zaktualizowano, imie, email, profil_link, zrodlo, cel, cel_inne, czas, doswiadczenie, miejsce,
       sprzet, dni, co_nie_dzialalo, inwestycja, zgoda_przetwarzanie, zgoda_marketing, tresc_zgody, status, notatka,
       ip_hash, user_agent_skrot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'nowe', '', ?, ?)`)
      .bind(
        crypto.randomUUID(), now, now, data.imie, data.email, data.profil_link, data.zrodlo, data.cel, data.cel_inne,
        data.czas, data.doswiadczenie, data.miejsce, data.sprzet, data.dni, data.co_nie_dzialalo, data.inwestycja,
        data.zgoda_marketing ? 1 : 0, consentRecord(data.zgoda_marketing), ipHash,
        userAgentShort(request.headers.get('User-Agent'))
      ).run();
    return json({ ok: true }, 201);
  } catch (error) {
    // Bez danych osobowych w logach — tylko rodzaj błędu.
    console.error('Raport lead submission failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.' }, 503);
  }
}
