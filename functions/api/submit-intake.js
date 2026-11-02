import { CATALOG } from '../_shared/catalog.js';
import { corsafeEmail, json, retrieveCheckoutSession } from '../_shared/stripe.js';
import { isSameOrigin } from '../_shared/trainer-auth.js';

const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const bool = value => value === true;
const ALLOWED_EQUIPMENT = new Set(['dumbbells','barbell','bench','rack','pullup_bar','bands','kettlebell','mat','treadmill','stationary_bike','elliptical','jump_rope','trx','cable_machine','none','other']);
const DAYS = new Set(['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela']);
const GOALS = new Set(['redukcja','masa','rekompozycja','sila','kondycja','powrot','inny']);
const LEVELS = new Set(['poczatkujacy','sredniozaawansowany','zaawansowany','powrot']);
const TENURES = new Set(['never','under6','6to12','1to2','2to5','over5']);
const REGULARITIES = new Set(['none','irregular','1to2','3to4','5plus']);
const TEST_STATUSES = new Set(['not_provided','unknown','not_performed','provided']);

function optionalNumber(value, min, max, decimals = 0) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}

function normalizeTest(raw, type) {
  const data = object(raw);
  const status = TEST_STATUSES.has(clean(data.status, 30)) ? clean(data.status, 30) : 'not_provided';
  if (status !== 'provided') return { status, value: null };
  if (type === 'loadreps') {
    const value = object(data.value);
    const weightKg = optionalNumber(value.weightKg, 0, 500, 1);
    const reps = optionalNumber(value.reps, 0, 1000, 0);
    if (weightKg === null || reps === null) return null;
    return { status, value: { weightKg, reps } };
  }
  const reps = optionalNumber(data.value, 0, 1000, 0);
  return reps === null ? null : { status, value: reps };
}

function normalizeTests(raw, location) {
  const source = object(raw);
  const result = { home: null, gym: null };
  if (['home','both'].includes(location)) {
    const home = object(source.home);
    result.home = {
      pushUps: normalizeTest(home.pushUps, 'reps'),
      bodyweightSquats: normalizeTest(home.bodyweightSquats, 'reps')
    };
    if (Object.values(result.home).some(value => value === null)) return null;
  }
  if (['gym','both'].includes(location)) {
    const gym = object(source.gym);
    result.gym = {
      benchPress: normalizeTest(gym.benchPress, 'loadreps'),
      barbellSquat: normalizeTest(gym.barbellSquat, 'loadreps'),
      pullUps: normalizeTest(gym.pullUps, 'reps')
    };
    if (Object.values(result.gym).some(value => value === null)) return null;
  }
  return result;
}

function normalizeStringArray(value, allowed = null, maxItems = 30, maxLength = 80) {
  const result = [...new Set(array(value).map(item => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems);
  return allowed ? result.filter(item => allowed.has(item)) : result;
}

function normalizeTechniques(value) {
  return array(value).slice(0, 20).map(item => {
    const entry = object(item);
    return {
      name: clean(entry.name, 160),
      variant: clean(entry.variant, 220),
      difficulty: clean(entry.difficulty, 500),
      improve: clean(entry.improve, 500),
      comment: clean(entry.comment, 500)
    };
  }).filter(item => item.name);
}

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
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

    const name = clean(body.name, 120);
    const email = corsafeEmail(body.email);
    const stripeEmail = corsafeEmail(session.customer_details?.email || session.customer_email);
    const age = Number(body.age);
    const adultConfirmed = bool(body.adultConfirmed);
    const termsAccepted = bool(body.termsAccepted);
    const privacyAcknowledged = bool(body.privacyAcknowledged);
    const profileRaw = object(body.profile);
    const gender = clean(profileRaw.gender, 30);
    const heightCm = optionalNumber(profileRaw.heightCm, 100, 250, 0);
    const bodyWeightKg = optionalNumber(profileRaw.bodyWeightKg, 25, 350, 1);
    if (!name || !email || !stripeEmail || email !== stripeEmail) return json({ error: 'Podaj imię i nazwisko oraz ten sam adres e-mail, którego użyto podczas płatności.' }, 400);
    if (!adultConfirmed || !Number.isInteger(age) || age < 18 || age > 100) return json({ error: 'Ankieta jest przeznaczona wyłącznie dla osób pełnoletnich. Potwierdź ukończenie 18 lat i sprawdź wiek.' }, 400);
    if (!termsAccepted || !privacyAcknowledged) return json({ error: 'Zaakceptuj regulamin usługi i potwierdź zapoznanie się z polityką prywatności.' }, 400);
    if (gender && !['kobieta','mezczyzna','inna','no_answer'].includes(gender)) return json({ error: 'Sprawdź wybraną opcję płci.' }, 400);
    if (profileRaw.heightCm && heightCm === null) return json({ error: 'Sprawdź wzrost. Podaj wartość w zakresie 100–250 cm.' }, 400);
    if (profileRaw.bodyWeightKg && bodyWeightKg === null) return json({ error: 'Sprawdź masę ciała. Podaj wartość w zakresie 25–350 kg.' }, 400);

    const goalRaw = object(body.goal);
    const goal = {
      primary: clean(goalRaw.primary, 40), description: clean(goalRaw.description, 1600),
      secondary: clean(goalRaw.secondary, 700), measurable: clean(goalRaw.measurable, 700),
      why: clean(goalRaw.why, 700), desired12Weeks: clean(goalRaw.desired12Weeks, 900),
      musclePriorities: normalizeStringArray(goalRaw.musclePriorities)
    };
    if (!GOALS.has(goal.primary) || !goal.description) return json({ error: 'Wybierz główny cel treningowy i opisz dokładniej, co chcesz osiągnąć.' }, 400);
    if (productKey === 'elite' && !goal.desired12Weeks) return json({ error: 'Opisz, jakich efektów oczekujesz po 12 tygodniach.' }, 400);

    const experienceRaw = object(body.experience);
    const experience = {
      level: clean(experienceRaw.level, 40), tenure: clean(experienceRaw.tenure, 40), regularity: clean(experienceRaw.regularity, 40),
      trainingHistory: clean(experienceRaw.trainingHistory, 1200), individualizedPlan: clean(experienceRaw.individualizedPlan, 10),
      recentTraining: clean(experienceRaw.recentTraining, 1600), regularExercises: clean(experienceRaw.regularExercises, 900),
      hasCurrentPlan: clean(experienceRaw.hasCurrentPlan, 10), currentPlanDescription: clean(experienceRaw.currentPlanDescription, 1200),
      longBreak: clean(experienceRaw.longBreak, 10), breakDescription: clean(experienceRaw.breakDescription, 700),
      whatWorked: clean(experienceRaw.whatWorked, 700), whatDidNotWork: clean(experienceRaw.whatDidNotWork, 700)
    };
    if (!LEVELS.has(experience.level) || !TENURES.has(experience.tenure) || !REGULARITIES.has(experience.regularity)) return json({ error: 'Uzupełnij poziom zaawansowania, staż treningowy i regularność z ostatnich 3 miesięcy.' }, 400);
    if (productKey === 'elite' && (!['yes','no'].includes(experience.individualizedPlan) || !experience.recentTraining)) return json({ error: 'W ELITE odpowiedz, czy korzystałeś z indywidualnego planu, i opisz ostatnie 3 miesiące treningu.' }, 400);
    if (productKey.startsWith('individual-') && !experience.trainingHistory) return json({ error: 'Krótko opisz swoją dotychczasową historię treningową.' }, 400);
    if (experience.hasCurrentPlan === 'yes' && !experience.currentPlanDescription && productKey !== 'elite') return json({ error: 'Opisz obecny plan treningowy albo wybierz odpowiedź „Nie”.' }, 400);
    if (experience.longBreak && !['yes','no'].includes(experience.longBreak)) return json({ error: 'Sprawdź odpowiedź dotyczącą przerw treningowych.' }, 400);

    const conditionsRaw = object(body.conditions);
    const location = clean(conditionsRaw.location, 20);
    const equipmentItems = normalizeStringArray(conditionsRaw.equipmentItems, ALLOWED_EQUIPMENT, 20, 40);
    const equipmentOther = clean(conditionsRaw.equipmentOther, 300);
    const standardGym = clean(conditionsRaw.standardGym, 10);
    const gymLimitations = clean(conditionsRaw.gymLimitations, 700);
    if (!['home','gym','both'].includes(location)) return json({ error: 'Wybierz miejsce treningu.' }, 400);
    if (['home','both'].includes(location)) {
      if (!equipmentItems.length || (equipmentItems.includes('none') && equipmentItems.length > 1)) return json({ error: 'Zaznacz dostępny sprzęt domowy. Opcja „Brak sprzętu” nie może być łączona z innymi pozycjami.' }, 400);
      if (equipmentItems.includes('other') && !equipmentOther) return json({ error: 'Opisz inny sprzęt, który masz do dyspozycji.' }, 400);
    }
    if (['gym','both'].includes(location)) {
      if (!['yes','no'].includes(standardGym)) return json({ error: 'Potwierdź, czy masz dostęp do standardowo wyposażonej siłowni.' }, 400);
      if (standardGym === 'no' && !gymLimitations) return json({ error: 'Opisz ograniczenia wyposażenia siłowni.' }, 400);
    }

    const organizationRaw = object(body.organization);
    const daysPerWeek = Number(organizationRaw.daysPerWeek);
    const sessionMinutes = Number(organizationRaw.sessionMinutes);
    const preferredDays = normalizeStringArray(organizationRaw.preferredDays, new Set(['poniedzialek','wtorek','sroda','czwartek','piatek','sobota','niedziela']));
    const organization = {
      daysPerWeek, sessionMinutes, preferredDays,
      availability: clean(organizationRaw.availability, 20), availabilityChange: clean(organizationRaw.availabilityChange, 10),
      upcomingObstacles: clean(organizationRaw.upcomingObstacles, 900), preferredStartDate: clean(organizationRaw.preferredStartDate, 20)
    };
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 2 || daysPerWeek > 7 || ![30,45,60,75,90].includes(sessionMinutes)) return json({ error: 'Wybierz liczbę dni treningowych i czas jednej sesji.' }, 400);
    if (organization.preferredStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(organization.preferredStartDate)) return json({ error: 'Sprawdź preferowaną datę rozpoczęcia.' }, 400);

    const tests = normalizeTests(body.tests, location);
    if (!tests) return json({ error: 'Sprawdź wpisane wyniki testów. Wynik może mieć wartość 0, ale nie może być ujemny ani poza zakresem.' }, 400);
    const preferencesRaw = object(body.preferences);
    const preferences = {
      preferredExercises: clean(preferencesRaw.preferredExercises, 900), excludedExercises: clean(preferencesRaw.excludedExercises, 1000),
      trainingStyle: clean(preferencesRaw.trainingStyle, 30), musclePriorities: normalizeStringArray(preferencesRaw.musclePriorities),
      additional: clean(preferencesRaw.additional, 800), otherWorkingSets: clean(preferencesRaw.otherWorkingSets, 1000)
    };
    const lifestyleRaw = object(body.lifestyle);
    const lifestyle = {
      workType: clean(lifestyleRaw.workType, 30), dailyActivity: clean(lifestyleRaw.dailyActivity, 900), sleepHours: clean(lifestyleRaw.sleepHours, 100),
      typicalWeek: clean(lifestyleRaw.typicalWeek, 900), consistencyBarriers: clean(lifestyleRaw.consistencyBarriers, 900),
      recovery: clean(lifestyleRaw.recovery, 30), nutritionRegularity: clean(lifestyleRaw.nutritionRegularity, 30),
      nutritionDifficulties: clean(lifestyleRaw.nutritionDifficulties, 900), educationNeeds: clean(lifestyleRaw.educationNeeds, 900)
    };

    const detailsRaw = object(body.productDetails);
    let productDetails = {};
    let missingFields = [];
    let eliteCardStatus = null;
    if (productKey === 'pro') {
      const progress = object(detailsRaw.progress);
      const indicators = normalizeStringArray(progress.indicators, new Set(['workouts','exerciseProgress','bodyWeight','measurements','other']), 10, 40);
      const helpChoose = clean(progress.helpChoose, 10);
      if (!indicators.length && helpChoose !== 'yes') return json({ error: 'Wybierz wskaźniki monitorowania albo zaznacz, że mamy pomóc Ci je dobrać.' }, 400);
      productDetails = { progress: { indicators, helpChoose, other: clean(progress.other, 600), supportNeeds: clean(progress.supportNeeds, 900) }, cooperation: { reviewEvery: '2 tygodnie', plannedPlanCorrections: 1, contactPriority: 'standardowa' } };
    } else if (productKey === 'elite') {
      const eliteRaw = object(detailsRaw.elite);
      const elite = {
        goal: clean(eliteRaw.goal, 900), metric: clean(eliteRaw.metric, 40), metricOther: clean(eliteRaw.metricOther, 500),
        baseline: { status: clean(object(eliteRaw.baseline).status, 20), value: clean(object(eliteRaw.baseline).value, 160) },
        target: { status: clean(object(eliteRaw.target).status, 20), value: clean(object(eliteRaw.target).value, 160) },
        unit: clean(eliteRaw.unit, 80), measurementMethodChoice: clean(eliteRaw.measurementMethodChoice, 20),
        measurementMethod: clean(eliteRaw.measurementMethod, 700), conditions: clean(eliteRaw.conditions, 700),
        tolerance: clean(eliteRaw.tolerance, 160), baselineMeasurementDate: clean(eliteRaw.baselineMeasurementDate, 20),
        notes: clean(eliteRaw.notes, 700), reportDay: clean(eliteRaw.reportDay, 30),
        weeklyReporting: clean(eliteRaw.weeklyReporting, 10), workoutLog: clean(eliteRaw.workoutLog, 10),
        goalTracking: clean(eliteRaw.goalTracking, 10), reportBarriers: clean(eliteRaw.reportBarriers, 700), status: 'to_agreement'
      };
      if (!elite.goal || !['strength','fitness','bodyWeight','circumference','trainingConsistency','other'].includes(elite.metric)) return json({ error: 'Uzupełnij proponowany cel ELITE i wybierz wskaźnik oceny.' }, 400);
      if (elite.metric === 'other' && !elite.metricOther) return json({ error: 'Opisz inny wskaźnik celu ELITE.' }, 400);
      if (!['known','help'].includes(elite.baseline.status) || (elite.baseline.status === 'known' && !elite.baseline.value)) return json({ error: 'Podaj wartość początkową albo zaznacz, że potrzebujesz pomocy w jej ustaleniu.' }, 400);
      if (!['known','help'].includes(elite.target.status) || (elite.target.status === 'known' && !elite.target.value)) return json({ error: 'Podaj proponowaną wartość docelową albo zaznacz, że potrzebujesz pomocy.' }, 400);
      if (!['defined','to_agree'].includes(elite.measurementMethodChoice) || (elite.measurementMethodChoice === 'defined' && !elite.measurementMethod)) return json({ error: 'Opisz metodę pomiaru albo wybierz „Do ustalenia z SYSTEM FORMY”.' }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(elite.baselineMeasurementDate) || !DAYS.has(elite.reportDay)) return json({ error: 'Wybierz datę pomiaru początkowego i preferowany dzień raportu.' }, 400);
      if (elite.weeklyReporting !== 'yes' || elite.workoutLog !== 'yes' || elite.goalTracking !== 'yes') return json({ error: 'SYSTEM ELITE wymaga potwierdzenia gotowości do cotygodniowego raportowania, zapisywania treningów i przekazywania danych celu.' }, 400);
      if (elite.baseline.status === 'help') missingFields.push('Wartość początkowa Karty Celu ELITE — do ustalenia');
      if (elite.target.status === 'help') missingFields.push('Wartość docelowa Karty Celu ELITE — do ustalenia');
      if (elite.measurementMethodChoice === 'to_agree' || !elite.conditions || !elite.tolerance) missingFields.push('Warunki, metoda lub tolerancja Karty Celu ELITE — do uzgodnienia');
      productDetails = { elite, cooperation: { durationWeeks: 12, weeklyReports: true, weeklyReportAnalysis: true, regularPlanCorrections: true, contactPriority: 'priorytetowa', summaryAfterWeeks: 12 } };
      eliteCardStatus = 'to_agreement';
    } else if (productKey.startsWith('individual-')) {
      if (productKey === 'individual-basic') {
        productDetails = { variant: 'BASIC', basic: { planOnly: true, durationWeeks: 4, monitoring: false, chat: false, techniqueReview: false } };
      } else {
        const monitorRaw = object(detailsRaw.monitoring);
        const areas = normalizeStringArray(monitorRaw.areas, new Set(['workouts','strength','bodyWeight','measurements','goal','other']), 10, 40);
        const monitoring = {
          areas, parameters: clean(monitorRaw.parameters, 900), hasBaselineData: clean(monitorRaw.hasBaselineData, 10),
          baselineData: clean(monitorRaw.baselineData, 900), contactDay: clean(monitorRaw.contactDay, 30), supportNeeds: clean(monitorRaw.supportNeeds, 900)
        };
        if (!areas.length || !monitoring.parameters || !['yes','no'].includes(monitoring.hasBaselineData) || !DAYS.has(monitoring.contactDay)) return json({ error: 'Uzupełnij pytania dotyczące monitorowania: obszary, zapisywane parametry i preferowany dzień kontaktu.' }, 400);
        if (monitoring.hasBaselineData === 'yes' && !monitoring.baselineData) return json({ error: 'Podaj początkowe wartości parametrów albo zaznacz, że ich nie masz.' }, 400);
        productDetails = { variant: productKey === 'individual-full' ? 'KONTROLA TECHNIKI' : 'MONITORING I WSPARCIE', monitoring, cooperation: { durationWeeks: 4, monitoring: true, support: true, contactFrequency: 'zgodnie z ustalonym zakresem usługi' } };
        if (productKey === 'individual-full') {
          const technique = normalizeTechniques(detailsRaw.technique);
          if (!technique.length) return json({ error: 'Dodaj co najmniej jedno ćwiczenie, które chcesz objąć kontrolą techniki.' }, 400);
          productDetails.technique = technique;
          productDetails.cooperation.techniqueReview = 'Na podstawie uzgodnionych nagrań wskazanych ćwiczeń';
        }
      }
    }

    const normalizedOrganization = {
      ...organization,
      standardGym: ['gym','both'].includes(location) ? standardGym : null,
      gymLimitations: ['gym','both'].includes(location) && standardGym === 'no' ? gymLimitations : '',
      equipmentItems: ['home','both'].includes(location) ? equipmentItems : [],
      equipmentOther: ['home','both'].includes(location) && equipmentItems.includes('other') ? equipmentOther : ''
    };

    const healthConsent = bool(body.healthConsent);
    const healthRaw = object(body.health);
    const health = healthConsent ? {
      consent: true, consentVersion: 'system-formy-health-consent-2026-11-02-v1', consentedAt: new Date().toISOString(),
      pain: clean(healthRaw.pain, 20), restriction: clean(healthRaw.restriction, 30), avoid: clean(healthRaw.avoid, 700), notes: clean(healthRaw.notes, 800)
    } : null;
    if (health && (!['','yes','no','unsure'].includes(health.pain) || !['','yes','no','prefer_private'].includes(health.restriction))) return json({ error: 'Sprawdź odpowiedzi w sekcji ograniczeń zdrowotnych.' }, 400);
    const healthReviewRequired = Boolean(health && ((health.pain && health.pain !== 'no') || (health.restriction && health.restriction !== 'no') || health.avoid || health.notes));

    const rawFileIds = normalizeStringArray(body.attachments, null, 5, 80);
    let attachments = [];
    if (rawFileIds.length) {
      if (productKey === 'pro' || productKey === 'start') return json({ error: 'Ten produkt nie obsługuje załączników do ankiety.' }, 400);
      const placeholders = rawFileIds.map(() => '?').join(',');
      const fileResult = await env.DB.prepare(`SELECT file_id, file_name, content_type, size_bytes, kind FROM sf_intake_files WHERE order_ref = ? AND file_id IN (${placeholders})`)
        .bind(orderRef, ...rawFileIds).all();
      attachments = (fileResult.results || []).map(file => ({ file_id: file.file_id, file_name: file.file_name, content_type: file.content_type, size_bytes: file.size_bytes, kind: file.kind }));
      if (attachments.length !== rawFileIds.length) return json({ error: 'Jeden z załączników nie należy do tego zamówienia. Prześlij plik ponownie.' }, 400);
    }

    let previousIntake = {};
    try { previousIntake = order.intake_json ? JSON.parse(order.intake_json) : {}; } catch { previousIntake = {}; }
    const surveyType = productKey === 'pro' ? 'pro' : productKey === 'elite' ? 'elite' : 'individual';
    const variant = productKey === 'individual-basic' ? 'BASIC' : productKey === 'individual-monitor' ? 'MONITORING' : productKey === 'individual-full' ? 'KONTROLA TECHNIKI' : product.name;
    const submittedAt = new Date().toISOString();
    const submissionId = crypto.randomUUID();
    const consents = {
      adultConfirmed: true,
      termsAccepted: true, termsAcceptedAt: submittedAt,
      privacyAcknowledged: true, privacyAcknowledgedAt: submittedAt,
      healthConsent, healthConsentAt: healthConsent ? health.consentedAt : null,
      healthConsentVersion: healthConsent ? health.consentVersion : null
    };
    const intake = {
      version: 'system-formy-three-surveys-v1.0', submission_id: submissionId,
      survey_type: surveyType, product_key: productKey, product_name: product.name, variant,
      status: 'new_survey', submitted_at: submittedAt,
      profile: { name, email, age, gender: gender || null, heightCm, bodyWeightKg },
      goal, experience,
      conditions: { location, equipmentItems: normalizedOrganization.equipmentItems, equipmentOther: normalizedOrganization.equipmentOther, standardGym: normalizedOrganization.standardGym, gymLimitations: normalizedOrganization.gymLimitations },
      organization: normalizedOrganization, tests, preferences, lifestyle, productDetails,
      health, healthReviewRequired, attachments, consents,
      checkoutConsents: previousIntake.checkoutConsents || null,
      missing_fields: missingFields
    };
    const responsesJson = JSON.stringify(intake);
    const identityJson = JSON.stringify({ name, email, age });
    const consentJson = JSON.stringify(consents);
    const attachmentsJson = JSON.stringify(attachments);
    const statements = [
      env.DB.prepare(`INSERT INTO sf_intake_submissions
        (submission_id, order_ref, survey_type, product_key, product_name, variant, identity_json, responses_json, submitted_at, submission_status, missing_fields_json, consents_json, attachments_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new_survey', ?, ?, ?)`)
        .bind(submissionId, orderRef, surveyType, productKey, product.name, variant, identityJson, responsesJson, submittedAt, JSON.stringify(missingFields), consentJson, attachmentsJson),
      env.DB.prepare(`UPDATE sf_orders SET intake_json = ?, intake_submitted_at = ?, updated_at = ? WHERE order_ref = ? AND session_id = ?`)
        .bind(responsesJson, submittedAt, submittedAt, orderRef, session.id),
      env.DB.prepare(`INSERT INTO sf_trainer_workflow_status (order_ref, work_status, updated_at) VALUES (?, 'new_survey', ?)
        ON CONFLICT(order_ref) DO UPDATE SET work_status = 'new_survey', updated_at = excluded.updated_at`)
        .bind(orderRef, submittedAt)
    ];
    if (productKey === 'elite') {
      const e = productDetails.elite;
      const initialCard = {
        metric: e.metricOther || e.metric, baseline: e.baseline.status === 'known' ? e.baseline.value : '',
        target: e.target.status === 'known' ? e.target.value : '', unit: e.unit,
        measurement_method: e.measurementMethodChoice === 'defined' ? e.measurementMethod : '',
        conditions: e.conditions, tolerance: e.tolerance, measurement_date: e.baselineMeasurementDate, report_day: e.reportDay
      };
      statements.push(env.DB.prepare(`INSERT INTO sf_elite_goal_cards (order_ref, card_status, card_json, client_accepted, updated_at) VALUES (?, 'to_agreement', ?, 0, ?) ON CONFLICT(order_ref) DO UPDATE SET card_status = 'to_agreement', card_json = excluded.card_json, client_accepted = 0, client_accepted_at = NULL, trainer_approved_at = NULL, agreed_start_date = NULL, updated_at = excluded.updated_at`)
        .bind(orderRef, JSON.stringify(initialCard), submittedAt));
    }
    await env.DB.batch(statements);
    return json({ ok: true, submission_id: submissionId, status: 'new_survey', message: 'Ankieta została zapisana w bazie SYSTEM FORMY. Administrator otrzyma uporządkowane odpowiedzi w panelu trenera.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SESSION') return json({ error: 'Nieprawidłowa sesja płatności.' }, 400);
    console.error('Intake submission failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać ankiety. Spróbuj ponownie później.' }, 502);
  }
}
