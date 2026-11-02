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

    const order = await env.DB.prepare(`SELECT payment_status, customer_email, intake_json FROM sf_orders WHERE order_ref = ? AND session_id = ?`)
      .bind(orderRef, session.id).first();
    if (!order || order.payment_status !== 'paid') return json({ error: 'Zamówienie nie jest jeszcze zapisane jako opłacone.' }, 403);

    const name = text(body.name, 120);
    const email = corsafeEmail(body.email);
    const stripeEmail = corsafeEmail(session.customer_details?.email || session.customer_email);
    const age = Number(body.age);
    const gender = text(body.gender, 30);
    const bodyWeightKg = Number(body.bodyWeightKg);
    const goal = text(body.goal, 1500);
    const measurableGoal = text(body.measurableGoal, 800);
    const experience = text(body.experience, 40);
    const trainingLocation = text(body.trainingLocation, 30);
    const rawEquipmentItems = Array.isArray(body.equipmentItems) ? body.equipmentItems : [];
    const equipmentAllowlist = ['dumbbells', 'barbell', 'bench', 'rack', 'pullup_bar', 'bands', 'kettlebell', 'mat', 'treadmill', 'stationary_bike', 'elliptical', 'jump_rope', 'trx', 'cable_machine', 'none', 'other'];
    const equipmentItems = [...new Set(rawEquipmentItems.map(item => text(item, 40)).filter(item => equipmentAllowlist.includes(item)))];
    const equipmentOther = text(body.equipmentOther, 300);
    const equipment = text(body.equipment, 800);
    const rawMaxTests = body.maxTests && typeof body.maxTests === 'object' && !Array.isArray(body.maxTests) ? body.maxTests : {};
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
    if (!['kobieta', 'mężczyzna', 'inna', 'nie_podaję'].includes(gender)) return json({ error: 'Wybierz płeć lub opcję „Wolę nie podawać”.' }, 400);
    if (!Number.isFinite(bodyWeightKg) || bodyWeightKg < 25 || bodyWeightKg > 350) return json({ error: 'Podaj aktualną masę ciała w zakresie 25–350 kg.' }, 400);
    if (!goal || !['początkujący', 'średniozaawansowany', 'zaawansowany', 'powrót po przerwie'].includes(experience)) return json({ error: 'Uzupełnij cel i wybierz poziom doświadczenia.' }, 400);
    if (!['dom', 'siłownia', 'oba'].includes(trainingLocation)) return json({ error: 'Wybierz miejsce treningu.' }, 400);
    if (['dom', 'oba'].includes(trainingLocation)) {
      if (!equipmentItems.length || (equipmentItems.includes('none') && equipmentItems.length > 1)) return json({ error: 'Zaznacz dostępny sprzęt. Opcja „Nie mam żadnego sprzętu” nie może być łączona z innymi pozycjami.' }, 400);
      if (equipmentItems.includes('other') && !equipmentOther) return json({ error: 'Opisz inny sprzęt, który masz do dyspozycji.' }, 400);
    }
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 2 || daysPerWeek > 7) return json({ error: 'Wybierz liczbę dni treningowych w tygodniu.' }, 400);
    if (![30, 45, 60, 75, 90].includes(sessionMinutes)) return json({ error: 'Wybierz czas trwania sesji.' }, 400);
    if ((healthPain || healthRestriction || healthNotes) && !healthConsent) return json({ error: 'Aby przekazać opcjonalne informacje zdrowotne, zaznacz odrębną zgodę. Możesz też pozostawić te pola puste.' }, 400);

    const hasNumericValue = value => value !== null && value !== undefined && String(value).trim() !== '';
    const toReps = value => {
      if (!hasNumericValue(value)) return null;
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number <= 1000 ? number : null;
    };
    const toKg = value => {
      if (!hasNumericValue(value)) return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 && number <= 500 ? Math.round(number * 10) / 10 : null;
    };
    const maxTests = { home: null, gym: null };
    if (['dom', 'oba'].includes(trainingLocation)) {
      const home = rawMaxTests.home && typeof rawMaxTests.home === 'object' ? rawMaxTests.home : {};
      maxTests.home = {
        pushUps: toReps(home.pushUps), squats: toReps(home.squats),
        sitUps: toReps(home.sitUps), jumpingJacks: toReps(home.jumpingJacks)
      };
      if (Object.values(maxTests.home).some(value => value === null)) return json({ error: 'Uzupełnij wszystkie cztery wyniki testu sprawnościowego dla treningu w domu.' }, 400);
    }
    if (['siłownia', 'oba'].includes(trainingLocation)) {
      const gym = rawMaxTests.gym && typeof rawMaxTests.gym === 'object' ? rawMaxTests.gym : {};
      const benchPress = gym.benchPress && typeof gym.benchPress === 'object' ? gym.benchPress : {};
      const squat = gym.squat && typeof gym.squat === 'object' ? gym.squat : {};
      maxTests.gym = {
        benchPress: { weightKg: toKg(benchPress.weightKg), reps: toReps(benchPress.reps) },
        squat: { weightKg: toKg(squat.weightKg), reps: toReps(squat.reps) },
        sitUps: toReps(gym.sitUps), pullUps: toReps(gym.pullUps)
      };
      const gymValues = [maxTests.gym.benchPress.weightKg, maxTests.gym.benchPress.reps, maxTests.gym.squat.weightKg, maxTests.gym.squat.reps, maxTests.gym.sitUps, maxTests.gym.pullUps];
      if (gymValues.some(value => value === null)) return json({ error: 'Uzupełnij wyniki testów dla siłowni: ciężar i powtórzenia w dwóch ćwiczeniach oraz brzuszki i podciąganie.' }, 400);
    }

    const detailAllowlist = {
      'individual-basic': ['height', 'trainingHistory', 'preferredExercises'],
      'individual-monitor': ['height', 'trainingHistory', 'preferredExercises', 'progressFocus', 'reportDay'],
      'individual-full': ['height', 'trainingHistory', 'preferredExercises', 'progressFocus', 'reportDay', 'techniqueExercises'],
      pro: ['weeklySchedule', 'nutrition', 'sleep', 'dailyActivity', 'barriers', 'supportNeeds'],
      elite: ['goalMetric', 'baselineValue', 'targetValue', 'measurementMethod', 'reportDay', 'weeklySchedule', 'nutrition', 'sleep', 'dailyActivity', 'barriers']
    };
    const allowedDetails = detailAllowlist[productKey] || [];
    const rawDetails = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
    const details = Object.fromEntries(allowedDetails.map(key => [key, text(rawDetails[key], key === 'measurementMethod' ? 500 : 900)]));
    if (productKey === 'elite') {
      if (!['masa', 'obwód', 'siła', 'kondycja', 'test', 'inny'].includes(details.goalMetric)) return json({ error: 'Wybierz mierzalny wskaźnik celu ELITE.' }, 400);
      if (!details.baselineValue || !details.targetValue || !details.measurementMethod || !['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].includes(details.reportDay)) {
        return json({ error: 'Uzupełnij wartość początkową, docelową, metodę pomiaru i dzień raportu dla Karty Celu ELITE.' }, 400);
      }
    }

    let previousIntake = {};
    try { previousIntake = order.intake_json ? JSON.parse(order.intake_json) : {}; } catch { previousIntake = {}; }
    const surveyType = productKey === 'pro' ? 'pro' : productKey === 'elite' ? 'elite' : 'individual';
    const intake = {
      version: 'system-formy-intake-v2.1', survey_type: surveyType, product_key: productKey,
      profile: { name, email, age, gender, bodyWeightKg: Math.round(bodyWeightKg * 10) / 10 },
      name, email, age, gender, bodyWeightKg: Math.round(bodyWeightKg * 10) / 10,
      goal, measurableGoal, experience, trainingLocation,
      equipment, equipmentItems: ['dom', 'oba'].includes(trainingLocation) ? equipmentItems : [],
      equipmentOther: ['dom', 'oba'].includes(trainingLocation) && equipmentItems.includes('other') ? equipmentOther : '',
      maxTests, daysPerWeek, sessionMinutes, currentPlan, difficulty, startDate, details,
      checkoutConsents: previousIntake.checkoutConsents || null,
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
