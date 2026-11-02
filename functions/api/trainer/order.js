import { json } from '../../_shared/stripe.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

const STATUSES = new Set(['new', 'in_progress', 'waiting_client', 'ready', 'completed']);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const orderRef = new URL(request.url).searchParams.get('order_ref') || '';
  if (!/^[0-9a-f-]{36}$/i.test(orderRef)) return json({ error: 'Nieprawidłowy numer zamówienia.' }, 400);
  try {
    const order = await env.DB.prepare(`SELECT
        order_ref, product_key, product_name, amount_minor, currency, payment_status,
        customer_email, created_at, updated_at, retention_due_at, paid_at,
        intake_submitted_at, intake_json, download_variant, downloaded_at
      FROM sf_orders
      WHERE order_ref = ? AND payment_status = 'paid' AND product_key <> 'start'`).bind(orderRef).first();
    if (!order) return json({ error: 'Nie znaleziono opłaconego zamówienia wymagającego ankiety.' }, 404);
    const meta = await env.DB.prepare('SELECT work_status, trainer_notes, updated_at FROM sf_trainer_meta WHERE order_ref = ?').bind(orderRef).first();
    let intake = {};
    try { intake = order.intake_json ? JSON.parse(order.intake_json) : {}; } catch { intake = {}; }
    delete order.intake_json;
    return json({ order, intake, trainer: meta || { work_status: 'new', trainer_notes: '' } });
  } catch (error) {
    console.error('Trainer order detail failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać karty klienta.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const orderRef = String(body?.order_ref || '');
  const workStatus = String(body?.work_status || '');
  const notes = typeof body?.trainer_notes === 'string' ? body.trainer_notes.trim().slice(0, 5000) : '';
  if (!/^[0-9a-f-]{36}$/i.test(orderRef) || !STATUSES.has(workStatus)) return json({ error: 'Sprawdź status i numer zamówienia.' }, 400);
  const now = new Date().toISOString();
  try {
    const exists = await env.DB.prepare("SELECT order_ref FROM sf_orders WHERE order_ref = ? AND payment_status = 'paid' AND product_key <> 'start'").bind(orderRef).first();
    if (!exists) return json({ error: 'Nie znaleziono opłaconego zamówienia.' }, 404);
    await env.DB.prepare(`INSERT INTO sf_trainer_meta (order_ref, work_status, trainer_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(order_ref) DO UPDATE SET work_status = excluded.work_status, trainer_notes = excluded.trainer_notes, updated_at = excluded.updated_at`)
      .bind(orderRef, workStatus, notes, now, now).run();
    return json({ ok: true, updated_at: now });
  } catch (error) {
    console.error('Trainer order update failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać zmian.' }, 503);
  }
}
