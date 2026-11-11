import { json } from '../_shared/http.js';
import { isSameOrigin, sha256Hex } from '../_shared/trainer-auth.js';
import { validateLead, leadConsentRecord, userAgentShort } from '../_shared/lead.js';

// Bezpłatna ankieta zgłoszeniowa ze strony głównej (/ankieta.html) → tabela sf_leads.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LIMIT_MESSAGE = 'Z tych danych wysłano już zgłoszenie. Spróbuj ponownie później.';

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  if (!env.DB) return json({ error: 'Formularz jest chwilowo niedostępny. Spróbuj ponownie później.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Nieprawidłowe żądanie.' }, 400);

  // Honeypot: boty wypełniają ukryte pole — udajemy sukces, nic nie zapisujemy.
  if (String(body.website ?? '').trim()) return json({ ok: true });

  const validation = validateLead(body);
  if (!validation.ok) return json({ error: validation.error, field: validation.field }, 400);
  const data = validation.data;

  const ipHash = await sha256Hex(`sf-lead:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const dayAgo = new Date(nowMs - DAY_MS).toISOString();

  try {
    // Skrót IP służy tylko do limitu spamu i jest czyszczony po 30 dniach.
    await env.DB.prepare(`UPDATE sf_leads SET ip_hash = '' WHERE utworzono < ? AND ip_hash <> ''`)
      .bind(new Date(nowMs - 30 * DAY_MS).toISOString()).run();
    const byIp = await env.DB.prepare(`SELECT
        SUM(CASE WHEN utworzono >= ? THEN 1 ELSE 0 END) AS last_hour, COUNT(*) AS last_day
      FROM sf_leads WHERE ip_hash = ? AND utworzono >= ?`)
      .bind(new Date(nowMs - HOUR_MS).toISOString(), ipHash, dayAgo).first();
    const byEmail = await env.DB.prepare('SELECT COUNT(*) AS last_day FROM sf_leads WHERE email = ? AND utworzono >= ?')
      .bind(data.email, dayAgo).first();
    if (Number(byIp?.last_hour || 0) >= 3 || Number(byIp?.last_day || 0) >= 5) {
      return json({ error: LIMIT_MESSAGE }, 429);
    }
    // Ten sam e-mail drugi raz tego samego dnia: nie zapisujemy duplikatu, ale osoba dostaje swoje wskazówki.
    if (Number(byEmail?.last_day || 0) >= 1) return json({ ok: true, duplicate: true });

    await env.DB.prepare(`INSERT INTO sf_leads
      (id, utworzono, zaktualizowano, imie, email, wiek, wzrost_cm, waga_kg, zakres, cel, cel_opis, doswiadczenie, miejsce, dni,
       inwestycja, zgoda_przetwarzanie, zgoda_marketing, tresc_zgody, status, notatka, ip_hash, user_agent_skrot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'nowe', '', ?, ?)`)
      .bind(
        crypto.randomUUID(), now, now, data.imie, data.email, data.wiek, data.wzrost_cm, data.waga_kg, data.zakres, data.cel,
        data.cel_opis, data.doswiadczenie, data.miejsce, data.dni, data.inwestycja, data.zgoda_marketing ? 1 : 0,
        leadConsentRecord(data.zgoda_marketing), ipHash, userAgentShort(request.headers.get('User-Agent'))
      ).run();
    return json({ ok: true }, 201);
  } catch (error) {
    // Bez danych osobowych w logach — tylko rodzaj błędu.
    console.error('Lead submission failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.' }, 503);
  }
}
