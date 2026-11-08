(() => {
  'use strict';

  // Ankiety po płatności (ankieta-pro / ankieta-elite / ankieta-plan-*) → POST /api/submit-intake.
  // Produkt wynika z atrybutu data-product formularza — strona jest stała, bez parametrów w adresie.
  const form = document.querySelector('#purchase-form');
  const success = document.querySelector('#purchase-success');
  const status = document.querySelector('#purchase-status');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!form) return;
  const product = form.dataset.product;
  const isElite = product === 'elite';
  const isPro = product === 'pro';
  const isPlan = product.startsWith('individual-');
  const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;

  const field = name => form.elements[name];
  const value = name => {
    const el = field(name);
    if (!el) return '';
    if (el instanceof RadioNodeList) return el.value || '';
    if (el.type === 'checkbox') return el.checked;
    return String(el.value || '').trim();
  };
  const checkedValues = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
  const num = name => { const raw = String(value(name)).replace(',', '.'); return raw === '' ? null : Number(raw); };

  // Pokazywanie sekcji zależnych od odpowiedzi: data-when="pole:wartosc1,wartosc2"
  function refreshConditional() {
    form.querySelectorAll('[data-when]').forEach(block => {
      const [name, list] = block.dataset.when.split(':');
      const allowed = list.split(',');
      const el = field(name);
      let current = '';
      if (el && el.type === 'checkbox') current = el.checked ? 'yes' : '';
      else current = value(name);
      // Blok jest widoczny tylko wtedy, gdy widoczny jest też blok nadrzędny.
      const visible = allowed.includes(current) && !block.parentElement.closest('[data-when][hidden]');
      block.hidden = !visible;
      block.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = !visible; });
    });
  }
  form.addEventListener('change', refreshConditional);
  refreshConditional();

  // „Brak sprzętu” wyklucza inne pozycje.
  form.addEventListener('change', event => {
    if (event.target.name !== 'equipment') return;
    const boxes = [...form.querySelectorAll('input[name="equipment"]')];
    if (event.target.value === 'none' && event.target.checked) boxes.forEach(box => { if (box.value !== 'none') box.checked = false; });
    else if (event.target.checked) boxes.forEach(box => { if (box.value === 'none') box.checked = false; });
  });

  const errorEl = name => form.querySelector(`[data-error-for="${name}"]`);
  function setError(name, text) {
    const el = errorEl(name);
    if (el) el.textContent = text || '';
    form.querySelectorAll(`[name="${name}"]`).forEach(input => {
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
  }
  function clearErrors() { form.querySelectorAll('[data-error-for]').forEach(el => setError(el.dataset.errorFor, '')); }
  form.addEventListener('input', event => { if (event.target.name) setError(event.target.name, ''); });

  const intIn = (name, min, max) => { const n = num(name); return n !== null && Number.isInteger(n) && n >= min && n <= max; };
  const numIn = (name, min, max) => { const n = num(name); return n !== null && Number.isFinite(n) && n >= min && n <= max; };
  const visible = name => { const el = form.querySelector(`[name="${name}"]`); return el && !el.disabled; };

  function validate() {
    const e = {};
    const need = (name, message, ok) => { if (!ok) e[name] = message; };
    need('name', 'Podaj imię i nazwisko.', value('name').length >= 2);
    need('email', 'Podaj adres e-mail użyty przy płatności.', EMAIL_RE.test(value('email')));
    need('age', 'Podaj wiek (18–100 lat).', intIn('age', 18, 100));
    need('adultConfirmed', 'Potwierdź, że masz ukończone 18 lat.', value('adultConfirmed') === true);
    need('heightCm', 'Podaj wzrost w centymetrach (100–250).', intIn('heightCm', 100, 250));
    need('bodyWeightKg', 'Podaj masę ciała w kilogramach (25–350).', numIn('bodyWeightKg', 25, 350));
    need('goalPrimary', 'Wybierz główny cel.', !!value('goalPrimary'));
    need('goalDescription', 'Opisz dokładniej, co chcesz osiągnąć.', value('goalDescription').length >= 3);
    if (isElite) need('desired12Weeks', 'Opisz, jakich efektów oczekujesz po 12 tygodniach.', value('desired12Weeks').length >= 3);
    need('level', 'Wybierz poziom zaawansowania.', !!value('level'));
    need('tenure', 'Wybierz staż treningowy.', !!value('tenure'));
    need('regularity', 'Wybierz regularność z ostatnich 3 miesięcy.', !!value('regularity'));
    if (isPlan) need('trainingHistory', 'Krótko opisz swoją historię treningową.', value('trainingHistory').length >= 3);
    if (isElite) {
      need('individualizedPlan', 'Zaznacz odpowiedź.', !!value('individualizedPlan'));
      need('recentTraining', 'Opisz, jak trenowałeś przez ostatnie 3 miesiące.', value('recentTraining').length >= 3);
    }
    need('hasCurrentPlan', 'Zaznacz odpowiedź.', !!value('hasCurrentPlan'));
    if (visible('currentPlanDescription') && !isElite) need('currentPlanDescription', 'Opisz obecny plan albo wybierz „Nie”.', value('currentPlanDescription').length >= 3);
    need('location', 'Wybierz miejsce treningu.', !!value('location'));
    if (['home', 'both'].includes(value('location'))) {
      const eq = checkedValues('equipment');
      need('equipment', 'Zaznacz dostępny sprzęt domowy (albo „Brak sprzętu”).', eq.length > 0);
      if (eq.includes('other')) need('equipmentOther', 'Opisz inny sprzęt.', value('equipmentOther').length >= 2);
    }
    if (['gym', 'both'].includes(value('location'))) {
      need('standardGym', 'Zaznacz odpowiedź.', !!value('standardGym'));
      if (value('standardGym') === 'no') need('gymLimitations', 'Opisz ograniczenia wyposażenia siłowni.', value('gymLimitations').length >= 2);
    }
    need('daysPerWeek', 'Wybierz liczbę dni treningowych.', !!value('daysPerWeek'));
    need('sessionMinutes', 'Wybierz czas jednej sesji.', !!value('sessionMinutes'));
    for (const name of ['testPushUps', 'testSquats', 'testBenchKg', 'testBenchReps', 'testSquatKg', 'testSquatReps', 'testPullUps']) {
      if (visible(name) && value(name) !== '' && !numIn(name, 0, name.endsWith('Kg') ? 500 : 1000)) e[name] = 'Wpisz liczbę 0 lub większą albo zostaw pole puste.';
    }
    for (const [kg, reps] of [['testBenchKg', 'testBenchReps'], ['testSquatKg', 'testSquatReps']]) {
      if (visible(kg) && (value(kg) === '') !== (value(reps) === '')) e[value(kg) === '' ? kg : reps] = 'Podaj ciężar i liczbę powtórzeń albo zostaw oba pola puste.';
    }
    if (isElite) need('trainingStyle', 'Wybierz preferowany styl treningu.', !!value('trainingStyle'));
    if (isPro) need('indicators', 'Wybierz wskaźniki albo zaznacz, że mam pomóc je dobrać.', checkedValues('indicators').length > 0 || value('helpChoose') === true);
    if (isElite) {
      need('eliteGoal', 'Opisz proponowany cel ELITE.', value('eliteGoal').length >= 3);
      need('metric', 'Wybierz wskaźnik oceny celu.', !!value('metric'));
      if (value('metric') === 'other') need('metricOther', 'Opisz inny wskaźnik.', value('metricOther').length >= 2);
      need('baselineStatus', 'Zaznacz odpowiedź.', !!value('baselineStatus'));
      if (value('baselineStatus') === 'known') need('baselineValue', 'Podaj wartość początkową.', !!value('baselineValue'));
      need('targetStatus', 'Zaznacz odpowiedź.', !!value('targetStatus'));
      if (value('targetStatus') === 'known') need('targetValue', 'Podaj wartość docelową.', !!value('targetValue'));
      need('measurementMethodChoice', 'Zaznacz odpowiedź.', !!value('measurementMethodChoice'));
      if (value('measurementMethodChoice') === 'defined') need('measurementMethod', 'Opisz metodę pomiaru.', value('measurementMethod').length >= 2);
      need('baselineMeasurementDate', 'Wybierz datę pomiaru początkowego.', /^\d{4}-\d{2}-\d{2}$/.test(value('baselineMeasurementDate')));
      need('reportDay', 'Wybierz dzień raportowania.', !!value('reportDay'));
      for (const name of ['weeklyReporting', 'workoutLog', 'goalTracking']) need(name, 'ELITE wymaga tego potwierdzenia.', value(name) === true);
    }
    need('termsAccepted', 'Zaakceptuj regulamin.', value('termsAccepted') === true);
    need('privacyAcknowledged', 'Potwierdź zapoznanie się z polityką prywatności.', value('privacyAcknowledged') === true);
    need('startConsent', 'To potwierdzenie jest wymagane, żebym mógł zacząć przygotowanie planu.', value('startConsent') === true);
    return e;
  }

  const test = name => (visible(name) && value(name) !== '') ? { status: 'provided', value: num(name) } : { status: 'not_provided', value: null };
  const loadTest = (kg, reps) => (visible(kg) && value(kg) !== '' && value(reps) !== '')
    ? { status: 'provided', value: { weightKg: num(kg), reps: num(reps) } } : { status: 'not_provided', value: null };

  function payload() {
    const location = value('location');
    const healthConsent = value('healthConsent') === true;
    const body = {
      product, website: String(field('website')?.value || ''),
      name: value('name'), email: value('email'), age: num('age'), adultConfirmed: value('adultConfirmed') === true,
      termsAccepted: value('termsAccepted') === true, privacyAcknowledged: value('privacyAcknowledged') === true,
      startConsent: value('startConsent') === true,
      profile: { gender: value('gender'), heightCm: num('heightCm'), bodyWeightKg: num('bodyWeightKg') },
      goal: { primary: value('goalPrimary'), description: value('goalDescription'), why: value('goalWhy'), desired12Weeks: value('desired12Weeks') },
      experience: {
        level: value('level'), tenure: value('tenure'), regularity: value('regularity'), trainingHistory: value('trainingHistory'),
        individualizedPlan: value('individualizedPlan'), recentTraining: value('recentTraining'),
        hasCurrentPlan: value('hasCurrentPlan'), currentPlanDescription: value('currentPlanDescription'),
        whatWorked: value('whatWorked'), whatDidNotWork: value('whatDidNotWork')
      },
      conditions: { location, equipmentItems: checkedValues('equipment'), equipmentOther: value('equipmentOther'), standardGym: value('standardGym'), gymLimitations: value('gymLimitations') },
      organization: {
        daysPerWeek: num('daysPerWeek'), sessionMinutes: num('sessionMinutes'), preferredDays: checkedValues('preferredDays'),
        upcomingObstacles: value('upcomingObstacles'), preferredStartDate: value('preferredStartDate')
      },
      tests: {
        home: { pushUps: test('testPushUps'), bodyweightSquats: test('testSquats') },
        gym: { benchPress: loadTest('testBenchKg', 'testBenchReps'), barbellSquat: loadTest('testSquatKg', 'testSquatReps'), pullUps: test('testPullUps') }
      },
      preferences: { preferredExercises: value('preferredExercises'), excludedExercises: value('excludedExercises'), trainingStyle: value('trainingStyle'), additional: value('additional') },
      lifestyle: {
        workType: value('workType'), sleepHours: value('sleepHours'), consistencyBarriers: value('consistencyBarriers'),
        recovery: value('recovery'), nutritionRegularity: value('nutritionRegularity'), nutritionDifficulties: value('nutritionDifficulties')
      },
      healthConsent,
      health: healthConsent ? { pain: value('healthPain'), restriction: value('healthRestriction'), avoid: value('healthAvoid'), notes: value('healthNotes') } : {},
      productDetails: {}
    };
    if (isPro) body.productDetails = { progress: { indicators: checkedValues('indicators'), helpChoose: value('helpChoose') === true ? 'yes' : '', other: value('indicatorsOther'), supportNeeds: value('supportNeeds') } };
    if (isElite) body.productDetails = { elite: {
      goal: value('eliteGoal'), metric: value('metric'), metricOther: value('metricOther'),
      baseline: { status: value('baselineStatus'), value: value('baselineValue') },
      target: { status: value('targetStatus'), value: value('targetValue') },
      unit: value('unit'), measurementMethodChoice: value('measurementMethodChoice'), measurementMethod: value('measurementMethod'),
      conditions: value('measureConditions'), tolerance: value('tolerance'), baselineMeasurementDate: value('baselineMeasurementDate'),
      reportDay: value('reportDay'), weeklyReporting: value('weeklyReporting') === true ? 'yes' : '', workoutLog: value('workoutLog') === true ? 'yes' : '',
      goalTracking: value('goalTracking') === true ? 'yes' : '', reportBarriers: value('reportBarriers')
    } };
    return body;
  }

  function focusField(name) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
  }

  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    clearErrors();
    status.textContent = '';
    status.classList.remove('is-error');
    const errors = validate();
    const names = Object.keys(errors);
    if (names.length) {
      names.forEach(name => setError(name, errors[name]));
      status.textContent = `Popraw zaznaczone pola (${names.length}).`;
      status.classList.add('is-error');
      focusField(names[0]);
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    const label = submit.textContent;
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'WYSYŁANIE…';
    try {
      const response = await fetch('/api/submit-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload())
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nie udało się wysłać ankiety. Spróbuj ponownie.');
      form.hidden = true;
      document.querySelector('.raport-intro')?.setAttribute('hidden', '');
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'start' });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się wysłać ankiety. Spróbuj ponownie.';
      status.classList.add('is-error');
    } finally {
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });
})();
