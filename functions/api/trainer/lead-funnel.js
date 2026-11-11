import { json } from '../../_shared/http.js';
import { requireTrainer } from '../../_shared/trainer-auth.js';
import { FUNNEL_STEPS } from '../../_shared/lead.js';

// Panel trenera — lejek darmowej ankiety z ostatnich N dni (7 albo 30) + liczba zapisanych zgłoszeń.
const dayInWarsaw = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(date);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const requested = Number(new URL(request.url).searchParams.get('dni'));
  const days = [1, 7, 30].includes(requested) ? requested : 7;
  const from = dayInWarsaw(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
  try {
    const rows = await env.DB.prepare('SELECT krok, SUM(liczba) AS liczba FROM sf_lead_funnel WHERE dzien >= ? GROUP BY krok')
      .bind(from).all();
    const counts = Object.fromEntries(FUNNEL_STEPS.map(step => [step, 0]));
    for (const row of rows.results || []) if (row.krok in counts) counts[row.krok] = Number(row.liczba) || 0;
    const leads = await env.DB.prepare('SELECT COUNT(*) AS n FROM sf_leads WHERE utworzono >= ?')
      .bind(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()).first();
    return json({ dni: days, od: from, kroki: counts, zgloszenia: Number(leads?.n || 0) });
  } catch (error) {
    console.error('Trainer funnel read failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Brak danych lejka. Sprawdź, czy tabela sf_lead_funnel istnieje w D1.' }, 503);
  }
}
