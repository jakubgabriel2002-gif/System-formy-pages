import { CATALOG } from '../_shared/catalog.js';
import { corsafeEmail, json, retrieveCheckoutSession } from '../_shared/stripe.js';

const text = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json({ error: 'Nieprawidłowy format żądania.' }, 415);
  if (!env.DB || !env.STRIPE_SECRET_KEY) return json({ error: 'Formularz nie jest jeszcze skonfigurowany.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nie udało się odczytać formularza.' }, 400); }

  const sessionId = body?.session_id;
  try {
    const session = await retrieveCheckoutSession(env, sessionId);
    if (session.payment_status !== 'paid') return json({ error: 'Najpierw musi zostać potwierdzona płatność.' }, 402);
    const productKey = session.metadata?.product_key;
    const orderRef = session.metadata?.order_ref;
    const product = CATALOG[productKey];
    if (!product || product.fulfillment !== 'intake' || !orderRef) return json({ error: 'Ten produkt nie wymaga ankiety.' }, 400);

    const order = await env.DB.prepare(`SELECT payment_status, customer_email FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
      .bind(orderRef, session.id).first();
    if (!order || order.payment_status !== 'paid') return json({ error: 'Zamówienie nie jest jeszcze zapisane jako opłacone.' }, 403);

    const name = text(body.name, 120);
    const email = corsafeEmail(body.email);
    const stripeEmail = corsafeEmail(session.customer_details?.email || session.customer_email);
    const age = Number(body.age);
    const goal = text(body.goal, 1500);
    const measurableGoal = text(body.measurableGoal, 800);
    const experience = text(body.experience, 40);
    const trainingLocation = text(body.trainingLocation, 30);
    const equipment = text(body.equipment, 800);
    const daysPerWeek = Number(body.daysPerWeek);
    const sessionMinutes = Number(body.sessionMinutes);
    const currentPlan = text(body.currentPlan, 1000);
    const difficulty = text(body.difficulty, 1000);
    const startDate = text(body.startDate, 20);
    const adultConfirmed = body.adultConfirmed === true;
    const healthConsent = body.healthConsent === true;
    const healthPain = text(body.healthPain, 30);
    const healthRestriction = text(body.healthRestriction, 50);
    const healthNotes = text(body.healthNotes, 800);

    if (!name || !email || !stripeEmail || email !== stripeEmail) return json({ error: 'Podaj imię i nazwisko oraz ten sam adres e-mail, którego użyto podczas płatności.' }, 400);
    if (!adultConfirmed || !Number.isInteger(age) || age < 18 || age > 100) return json({ error: 'Ankieta jest przeznaczona dla osób pełnoletnich. Potwierdź ukończenie 18 lat.' }, 400);
    if (!goal || !['początkujący', 'średniozaawansowany', 'zaawansowany', 'powrót po przerwie'].includes(experience)) return json({ error: 'Uzupełnij cel i wybierz poziom doświadczenia.' }, 400);
    if (!['dom', 'siłownia', 'oba'].includes(trainingLocation)) return json({ error: 'Wybierz miejsce treningu.' }, 400);
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 2 || daysPerWeek > 7) return json({ error: 'Wybierz liczbę dni treningowych w tygodniu.' }, 400);
    if (![30, 45, 60, 75, 90].includes(sessionMinutes)) return json({ error: 'Wybierz czas trwania sesji.' }, 400);
    if ((healthPain || healthRestriction || healthNotes) && !healthConsent) return json({ error: 'Aby przekazać opcjonalne informacje zdrowotne, zaznacz odrębną zgodę. Możesz też pozostawić te pola puste.' }, 400);

    const intake = {
      version: 'system-formy-intake-v1.0', product_key: productKey,
      name, email, age, goal, measurableGoal, experience, trainingLocation,
      equipment, daysPerWeek, sessionMinutes, currentPlan, difficulty, startDate,
      health: healthConsent ? { consent: true, pain: healthPain, restriction: healthRestriction, notes: healthNotes } : null,
      submitted_at: new Date().toISOString()
    };
    await env.DB.prepare(`UPDATE sf_orders SET intake_json = ?, intake_submitted_at = ?, updated_at = ? WHERE order_ref = ? AND session_id = ?`)
      .bind(JSON.stringify(intake), intake.submitted_at, intake.submitted_at, orderRef, session.id).run();
    return json({ ok: true, message: 'Ankieta została zapisana. Otrzymaliśmy informacje potrzebne do rozpoczęcia realizacji zamówienia.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SESSION') return json({ error: 'Nieprawidłowa sesja płatności.' }, 400);
    console.error('Intake submission failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać ankiety. Spróbuj ponownie później.' }, 502);
  }
}
