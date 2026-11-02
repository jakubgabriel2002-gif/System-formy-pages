import { json } from '../../_shared/stripe.js';
import { requireTrainer } from '../../_shared/trainer-auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const intake = url.searchParams.get('intake');
  const workStatus = url.searchParams.get('work_status');
  const conditions = ["o.payment_status = 'paid'", "o.product_key <> 'start'"];
  const values = [];
  if (intake === 'missing') conditions.push('o.intake_submitted_at IS NULL');
  if (intake === 'submitted') conditions.push('o.intake_submitted_at IS NOT NULL');
  if (['new', 'in_progress', 'waiting_client', 'ready', 'completed'].includes(workStatus)) {
    conditions.push('COALESCE(m.work_status, \'new\') = ?');
    values.push(workStatus);
  }
  if (query) {
    const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(`(o.customer_email LIKE ? ESCAPE '\\' OR o.order_ref LIKE ? ESCAPE '\\' OR o.product_name LIKE ? ESCAPE '\\' OR COALESCE(json_extract(o.intake_json, '$.profile.name'), json_extract(o.intake_json, '$.name'), '') LIKE ? ESCAPE '\\')`);
    values.push(like, like, like, like);
  }
  try {
    const result = await env.DB.prepare(`SELECT
        o.order_ref, o.product_key, o.product_name, o.amount_minor, o.currency,
        o.payment_status, o.customer_email, o.created_at, o.paid_at,
        o.intake_submitted_at,
        COALESCE(json_extract(o.intake_json, '$.profile.name'), json_extract(o.intake_json, '$.name'), '') AS customer_name,
        COALESCE(m.work_status, 'new') AS work_status,
        COALESCE(m.trainer_notes, '') AS trainer_notes,
        m.updated_at AS trainer_updated_at
      FROM sf_orders o
      LEFT JOIN sf_trainer_meta m ON m.order_ref = o.order_ref
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(o.intake_submitted_at, o.paid_at, o.created_at) DESC
      LIMIT 250`).bind(...values).all();
    return json({ orders: result.results || [] });
  } catch (error) {
    console.error('Trainer orders read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać klientów. Sprawdź migrację panelu i strukturę D1.' }, 503);
  }
}
