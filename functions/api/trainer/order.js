import { json } from '../../_shared/http.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

const WORK_STATUSES = new Set(['new_survey','needs_more_data','to_analyze','plan_in_progress','elite_card_pending','awaiting_acceptance','completed','new','in_progress','waiting_client','ready']);
const CARD_STATUSES = new Set(['draft','to_agreement','approved']);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const validDate = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  const orderRef = new URL(request.url).searchParams.get('order_ref') || '';
  if (!/^[0-9a-f-]{36}$/i.test(orderRef)) return json({ error: 'Nieprawidłowy numer zamówienia.' }, 400);
  try {
    const order = await env.DB.prepare(`SELECT order_ref, product_key, product_name, amount_minor, currency, payment_status,
        customer_email, created_at, updated_at, retention_due_at, paid_at, intake_submitted_at, intake_json,
        download_variant, downloaded_at
      FROM sf_orders WHERE order_ref = ? AND payment_status IN ('paid','unverified') AND product_key <> 'start'`).bind(orderRef).first();
    if (!order) return json({ error: 'Nie znaleziono opłaconego zamówienia wymagającego ankiety.' }, 404);
    const meta = await env.DB.prepare('SELECT work_status, trainer_notes, updated_at FROM sf_trainer_meta WHERE order_ref = ?').bind(orderRef).first();
    const workflowStatus = await env.DB.prepare('SELECT work_status FROM sf_trainer_workflow_status WHERE order_ref = ?').bind(orderRef).first();
    const submissionStatus = await env.DB.prepare('SELECT submission_status FROM sf_intake_submissions WHERE order_ref = ? ORDER BY submitted_at DESC LIMIT 1').bind(orderRef).first();
    const legacyStatus = ({ new: 'new_survey', in_progress: 'plan_in_progress', waiting_client: 'awaiting_acceptance', ready: 'to_analyze' })[meta?.work_status] || meta?.work_status;
    const currentStatus = workflowStatus?.work_status || submissionStatus?.submission_status || legacyStatus || 'new_survey';
    if (meta) meta.work_status = currentStatus;
    const card = order.product_key === 'elite' ? await env.DB.prepare('SELECT card_status, card_json, client_accepted, client_accepted_at, trainer_approved_at, agreed_start_date, updated_at FROM sf_elite_goal_cards WHERE order_ref = ?').bind(orderRef).first() : null;
    let intake = {};
    try { intake = order.intake_json ? JSON.parse(order.intake_json) : {}; } catch { intake = {}; }
    delete order.intake_json;
    let goalCard = card ? { ...card, card_json: JSON.parse(card.card_json || '{}') } : null;
    if (!goalCard && order.product_key === 'elite') goalCard = { card_status: 'to_agreement', card_json: intake.productDetails?.elite || {}, client_accepted: 0, agreed_start_date: '' };
    return json({ order, intake, trainer: meta ? { ...meta, work_status: currentStatus } : { work_status: currentStatus, trainer_notes: '' }, goalCard });
  } catch (error) {
    console.error('Trainer order detail failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać karty klienta. Sprawdź migrację D1.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const orderRef = clean(body?.order_ref, 64);
  const workStatus = clean(body?.work_status, 40);
  const notes = clean(body?.trainer_notes, 5000);
  if (!/^[0-9a-f-]{36}$/i.test(orderRef) || !WORK_STATUSES.has(workStatus)) return json({ error: 'Sprawdź status i numer zamówienia.' }, 400);
  const now = new Date().toISOString();
  const legacyWorkStatus = ({ new_survey: 'new', needs_more_data: 'waiting_client', to_analyze: 'ready', plan_in_progress: 'in_progress', elite_card_pending: 'waiting_client', awaiting_acceptance: 'waiting_client', completed: 'completed', new: 'new', in_progress: 'in_progress', waiting_client: 'waiting_client', ready: 'ready' })[workStatus];
  try {
    const exists = await env.DB.prepare("SELECT order_ref, product_key FROM sf_orders WHERE order_ref = ? AND payment_status IN ('paid','unverified') AND product_key <> 'start'").bind(orderRef).first();
    if (!exists) return json({ error: 'Nie znaleziono opłaconego zamówienia.' }, 404);
    const statements = [env.DB.prepare(`INSERT INTO sf_trainer_meta (order_ref, work_status, trainer_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(order_ref) DO UPDATE SET work_status = excluded.work_status, trainer_notes = excluded.trainer_notes, updated_at = excluded.updated_at`)
      .bind(orderRef, legacyWorkStatus, notes, now, now),
      env.DB.prepare(`INSERT INTO sf_trainer_workflow_status (order_ref, work_status, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(order_ref) DO UPDATE SET work_status = excluded.work_status, updated_at = excluded.updated_at`)
        .bind(orderRef, workStatus, now),
      env.DB.prepare(`UPDATE sf_intake_submissions SET submission_status = ? WHERE submission_id = (SELECT submission_id FROM sf_intake_submissions WHERE order_ref = ? ORDER BY submitted_at DESC LIMIT 1)` )
        .bind(workStatus, orderRef)];

    const cardInput = body.goal_card;
    if (cardInput !== undefined) {
      if (exists.product_key !== 'elite') return json({ error: 'Karta Celu ELITE jest dostępna wyłącznie dla produktu SYSTEM ELITE.' }, 403);
      const card = object(cardInput);
      const cardStatus = clean(card.card_status, 30);
      const clientAccepted = card.client_accepted === true;
      const normalized = {
        metric: clean(card.metric, 160), baseline: clean(card.baseline, 160), target: clean(card.target, 160),
        unit: clean(card.unit, 80), measurement_method: clean(card.measurement_method, 800),
        conditions: clean(card.conditions, 800), tolerance: clean(card.tolerance, 160),
        measurement_date: clean(card.measurement_date, 20), report_day: clean(card.report_day, 30)
      };
      const agreedStartDate = clean(card.agreed_start_date, 20);
      if (!CARD_STATUSES.has(cardStatus) || !validDate(normalized.measurement_date) || !validDate(agreedStartDate)) return json({ error: 'Sprawdź status Karty Celu oraz daty.' }, 400);
      if (cardStatus === 'approved') {
        const requiredComplete = normalized.metric && normalized.baseline && normalized.target && normalized.measurement_method && normalized.conditions && normalized.tolerance && normalized.measurement_date && agreedStartDate;
        if (!clientAccepted || !requiredComplete) return json({ error: 'Nie można zatwierdzić Karty Celu bez potwierdzenia akceptacji klienta, wartości początkowej i docelowej, metody, warunków, tolerancji oraz uzgodnionej daty startu.' }, 400);
      }
      statements.push(env.DB.prepare(`INSERT INTO sf_elite_goal_cards
        (order_ref, card_status, card_json, client_accepted, client_accepted_at, trainer_approved_at, agreed_start_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(order_ref) DO UPDATE SET
          card_status = excluded.card_status,
          card_json = excluded.card_json,
          client_accepted = excluded.client_accepted,
          client_accepted_at = CASE WHEN excluded.client_accepted = 1 THEN COALESCE(sf_elite_goal_cards.client_accepted_at, excluded.client_accepted_at) ELSE NULL END,
          trainer_approved_at = CASE WHEN excluded.card_status = 'approved' THEN excluded.trainer_approved_at ELSE NULL END,
          agreed_start_date = excluded.agreed_start_date,
          updated_at = excluded.updated_at`)
        .bind(orderRef, cardStatus, JSON.stringify(normalized), clientAccepted ? 1 : 0, clientAccepted ? now : null, cardStatus === 'approved' ? now : null, agreedStartDate || null, now));
    }
    await env.DB.batch(statements);
    return json({ ok: true, updated_at: now });
  } catch (error) {
    console.error('Trainer order update failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać zmian. Sprawdź migrację D1.' }, 503);
  }
}
