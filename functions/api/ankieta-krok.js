import { json } from '../_shared/http.js';
import { isSameOrigin } from '../_shared/trainer-auth.js';
import { FUNNEL_STEPS } from '../_shared/lead.js';

// Anonimowy licznik kroków darmowej ankiety: ile osób weszło, doszło do kolejnych pytań i wysłało.
// Bez danych osobowych, bez IP, bez cookies — tylko dzień, nazwa kroku i licznik.

const warsawDay = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ ok: false }, 403);
  if (!env.DB) return json({ ok: false }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const step = String(body?.krok ?? '');
  if (!FUNNEL_STEPS.includes(step)) return json({ ok: false }, 400);
  try {
    await env.DB.prepare(`INSERT INTO sf_lead_funnel (dzien, krok, liczba) VALUES (?, ?, 1)
      ON CONFLICT (dzien, krok) DO UPDATE SET liczba = liczba + 1`).bind(warsawDay(), step).run();
    return json({ ok: true });
  } catch (error) {
    console.error('Funnel step failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false }, 503);
  }
}
