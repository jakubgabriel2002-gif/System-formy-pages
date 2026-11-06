import { json } from '../../_shared/stripe.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';
import { RAPORT_STATUSES } from '../../_shared/raport-lead.js';

const ID_RE = /^[0-9a-f-]{36}$/i;
const clean = (value, max) => String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  try {
    const result = await env.DB.prepare(`SELECT id, utworzono, zaktualizowano, imie, email, profil_link, zrodlo, cel, cel_inne,
        czas, doswiadczenie, miejsce, sprzet, dni, co_nie_dzialalo, inwestycja, zgoda_przetwarzanie, zgoda_marketing,
        tresc_zgody, status, notatka, user_agent_skrot
      FROM lead_raport ORDER BY utworzono DESC LIMIT 500`).all();
    return json({ leads: result.results || [] });
  } catch (error) {
    console.error('Trainer raport leads read failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się pobrać zgłoszeń. Sprawdź, czy tabela lead_raport istnieje w D1.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const id = clean(body?.id, 64);
  const status = clean(body?.status, 20);
  const note = clean(body?.notatka, 4000);
  if (!ID_RE.test(id) || !RAPORT_STATUSES.includes(status)) return json({ error: 'Nieprawidłowy identyfikator lub status zgłoszenia.' }, 400);
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare('UPDATE lead_raport SET status = ?, notatka = ?, zaktualizowano = ? WHERE id = ?')
      .bind(status, note, now, id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono zgłoszenia.' }, 404);
    return json({ ok: true, status, notatka: note, zaktualizowano: now });
  } catch (error) {
    console.error('Trainer raport lead update failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się zapisać zmian.' }, 503);
  }
}

// Usunięcie zgłoszenia — np. na żądanie osoby (RODO) albo po zamknięciu obsługi.
export async function onRequestDelete({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return json({ error: 'Nieprawidłowy identyfikator zgłoszenia.' }, 400);
  try {
    const result = await env.DB.prepare('DELETE FROM lead_raport WHERE id = ?').bind(id).run();
    if (Number(result.meta?.changes || 0) !== 1) return json({ error: 'Nie znaleziono zgłoszenia.' }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error('Trainer raport lead delete failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Nie udało się usunąć zgłoszenia.' }, 503);
  }
}
