import { json } from '../../_shared/stripe.js';
import { requireTrainer } from '../../_shared/trainer-auth.js';

const VALID_WORK_STATUSES = ['new_survey','needs_more_data','to_analyze','plan_in_progress','elite_card_pending','awaiting_acceptance','completed','new','in_progress','waiting_client','ready'];

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const intake = url.searchParams.get('intake');
  const workStatus = url.searchParams.get('work_status');
  const productGroup = url.searchParams.get('product_group');
  const conditions = ["o.payment_status = 'paid'", "o.product_key <> 'start'"];
  const values = [];
  const currentStatusExpr = "COALESCE((SELECT w.work_status FROM sf_trainer_workflow_status w WHERE w.order_ref = o.order_ref), (SELECT s.submission_status FROM sf_intake_submissions s WHERE s.order_ref = o.order_ref ORDER BY s.submitted_at DESC LIMIT 1), CASE COALESCE(m.work_status, 'new_survey') WHEN 'new' THEN 'new_survey' WHEN 'in_progress' THEN 'plan_in_progress' WHEN 'waiting_client' THEN 'awaiting_acceptance' WHEN 'ready' THEN 'to_analyze' ELSE COALESCE(m.work_status, 'new_survey') END)";
  if (intake === 'missing') conditions.push('o.intake_submitted_at IS NULL');
  if (intake === 'submitted') conditions.push('o.intake_submitted_at IS NOT NULL');
  if (VALID_WORK_STATUSES.includes(workStatus)) {
    const legacy = { new_survey: ['new_survey','new'], plan_in_progress: ['plan_in_progress','in_progress'], awaiting_acceptance: ['awaiting_acceptance','waiting_client'], to_analyze: ['to_analyze','ready'] };
    const allowed = legacy[workStatus] || [workStatus];
    conditions.push(`${currentStatusExpr} IN (${allowed.map(() => '?').join(',')})`);
    values.push(...allowed);
  }
  if (productGroup === 'pro') conditions.push("o.product_key = 'pro'");
  if (productGroup === 'elite') conditions.push("o.product_key = 'elite'");
  if (productGroup === 'individual') conditions.push("o.product_key IN ('individual-basic','individual-monitor','individual-full')");
  if (query) {
    const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(`(o.customer_email LIKE ? ESCAPE '\\' OR o.order_ref LIKE ? ESCAPE '\\' OR o.product_name LIKE ? ESCAPE '\\' OR COALESCE(json_extract(o.intake_json, '$.profile.name'), '') LIKE ? ESCAPE '\\')`);
    values.push(like, like, like, like);
  }
  const hiddenCondition = '(o.trainer_hidden_at IS NULL OR (o.intake_submitted_at IS NOT NULL AND o.intake_submitted_at > o.trainer_hidden_at))';
  const runQuery = withHidden => env.DB.prepare(`SELECT
        o.order_ref, o.product_key, o.product_name, o.amount_minor, o.currency,
        o.payment_status, o.customer_email, o.created_at, o.paid_at,
        o.intake_submitted_at,
        COALESCE(json_extract(o.intake_json, '$.profile.name'), '') AS customer_name,
        ${currentStatusExpr} AS work_status,
        COALESCE(m.trainer_notes, '') AS trainer_notes,
        m.updated_at AS trainer_updated_at,
        (SELECT card_status FROM sf_elite_goal_cards c WHERE c.order_ref = o.order_ref) AS elite_card_status
      FROM sf_orders o
      LEFT JOIN sf_trainer_meta m ON m.order_ref = o.order_ref
      WHERE ${[...conditions, ...(withHidden ? [hiddenCondition] : [])].join(' AND ')}
      ORDER BY COALESCE(o.intake_submitted_at, o.paid_at, o.created_at) DESC
      LIMIT 250`).bind(...values).all();
  try {
    let result;
    try { result = await runQuery(true); }
    catch (error) {
      // Kolumna trainer_hidden_at jeszcze nie istnieje — pokaż listę jak dotąd.
      if (!/trainer_hidden_at/.test(error instanceof Error ? error.message : '')) throw error;
      result = await runQuery(false);
    }
    return json({ orders: result.results || [] });
  } catch (error) {
    console.error('Trainer orders read failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać klientów. Sprawdź migrację ankiet i panelu w D1.' }, 503);
  }
}
