(() => {
  'use strict';
  const root = document.querySelector('#realization-state');
  const title = document.querySelector('#realization-title');
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  document.querySelectorAll('.site-footer').forEach((footer) => {
    if (footer.querySelector('a[href="/regulamin.html"]') || footer.querySelector('.footer-legal-links')) return;
    const legalNav = document.createElement('nav');
    legalNav.className = 'footer-legal-links';
    legalNav.setAttribute('aria-label', 'Dokumenty prawne');
    legalNav.innerHTML = '<a href="/regulamin.html">REGULAMIN</a><a href="/polityka-prywatnosci.html">POLITYKA PRYWATNOŚCI</a><a href="/cookies.html">COOKIES</a>';
    footer.appendChild(legalNav);
  });

  if (!root || !sessionId) {
    showError('Nie znaleziono identyfikatora zamówienia. Sprawdź wiadomość od Stripe lub wróć do oferty.');
    return;
  }

  async function checkPayment() {
    try {
      const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 202 || data.status === 'pending') {
        root.innerHTML = '<p class="realization-message">Stripe jeszcze potwierdza płatność. Ta strona sprawdzi status ponownie za chwilę.</p><button class="button button-outline" id="check-again" type="button">SPRAWDŹ PONOWNIE</button>';
        document.querySelector('#check-again')?.addEventListener('click', checkPayment);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Nie udało się sprawdzić płatności.');
      if (data.status === 'expired') { showError('Sesja płatności wygasła. Wróć do oferty i rozpocznij zakup ponownie.'); return; }
      if (data.status === 'failed') { showError('Płatność nie powiodła się. Wróć do oferty i spróbuj ponownie.'); return; }
      if (data.status !== 'paid') { showError('Nie potwierdzono płatności. Jeśli środki zostały pobrane, skontaktuj się z SYSTEM FORMY.'); return; }
      if (title) title.innerHTML = 'PŁATNOŚĆ <span>POTWIERDZONA.</span>';
      if (data.fulfillment === 'download' && data.product_key === 'start') renderDownloads();
      else renderIntake(data);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Wystąpił błąd podczas weryfikacji.');
    }
  }

  function renderDownloads() {
    root.innerHTML = `
      <div class="realization-success">Płatność za <strong>SYSTEM START</strong> została potwierdzona. Wybierz wersję materiałów, którą chcesz pobrać.</div>
      <div class="download-options">${downloadCard('home', 'PLAN DO DOMU', 'Zestaw treningowy do realizacji w domu.')}${downloadCard('gym', 'PLAN NA SIŁOWNIĘ', 'Zestaw treningowy do realizacji na siłowni.')}</div>
      <p id="download-status" class="realization-message" role="status" aria-live="polite"></p>`;
    root.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', async () => {
      const variant = button.dataset.download;
      button.disabled = true;
      const status = document.querySelector('#download-status');
      status.textContent = 'Przygotowuję bezpieczne pobieranie…';
      try {
        const response = await fetch(`/api/download-start?session_id=${encodeURIComponent(sessionId)}&variant=${encodeURIComponent(variant)}`, { cache: 'no-store' });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Nie udało się pobrać materiałów.');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = variant === 'home' ? 'SYSTEM-FORMY-PLAN-DO-DOMU.zip' : 'SYSTEM-FORMY-PLAN-NA-SILOWNIE.zip';
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        status.textContent = 'Pobieranie zostało rozpoczęte. Zachowaj pobrany pakiet.';
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Nie udało się pobrać materiałów.';
        status.classList.add('realization-error');
      } finally { button.disabled = false; }
    }));
  }

  function downloadCard(key, heading, description) {
    return `<article class="download-option"><div><strong>${heading}</strong><span>${description}</span><button class="button button-light" type="button" data-download="${key}">POBIERZ PAKIET</button></div></article>`;
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const input = (name, label, opts = {}) => `<div class="form-field${opts.full ? ' full' : ''}" ${opts.wrap || ''}><label for="f-${name}">${label}${opts.required ? ' *' : ' (OPCJONALNIE)'}</label><input id="f-${name}" name="${name}" type="${opts.type || 'text'}" ${opts.required ? 'required' : ''} ${opts.min !== undefined ? `min="${opts.min}"` : ''} ${opts.max !== undefined ? `max="${opts.max}"` : ''} ${opts.step ? `step="${opts.step}"` : ''} ${opts.maxLength ? `maxlength="${opts.maxLength}"` : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''} ${opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : ''} ${opts.readonly ? 'readonly' : ''}></div>`;
  const textarea = (name, label, opts = {}) => `<div class="form-field${opts.full ? ' full' : ''}" ${opts.wrap || ''}><label for="f-${name}">${label}${opts.required ? ' *' : ' (OPCJONALNIE)'}</label><textarea id="f-${name}" name="${name}" ${opts.required ? 'required' : ''} maxlength="${opts.maxLength || 1200}" rows="${opts.rows || 3}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}></textarea></div>`;
  const select = (name, label, options, opts = {}) => `<div class="form-field${opts.full ? ' full' : ''}" ${opts.wrap || ''}><label for="f-${name}">${label}${opts.required ? ' *' : ' (OPCJONALNIE)'}</label><select id="f-${name}" name="${name}" ${opts.required ? 'required' : ''}><option value="">${opts.placeholder || 'Wybierz'}</option>${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}</select></div>`;
  const checks = (name, label, options, opts = {}) => `<fieldset class="choice-fieldset${opts.full ? ' full' : ''}" ${opts.wrap || ''}><legend>${label}${opts.required ? ' *' : ' (OPCJONALNIE)'}</legend><div class="choice-grid">${options.map(([value, text]) => `<label class="choice-option"><input type="checkbox" name="${name}" value="${esc(value)}"><span>${esc(text)}</span></label>`).join('')}</div><input class="choice-required-proxy" type="text" tabindex="-1" aria-hidden="true" data-check-group="${name}" readonly></fieldset>`;
  const radio = (name, label, options, opts = {}) => `<fieldset class="choice-fieldset${opts.full ? ' full' : ''}" ${opts.wrap || ''}><legend>${label}${opts.required ? ' *' : ' (OPCJONALNIE)'}</legend><div class="choice-grid">${options.map(([value, text]) => `<label class="choice-option"><input type="radio" name="${name}" value="${esc(value)}" ${opts.required ? 'required' : ''}><span>${esc(text)}</span></label>`).join('')}</div></fieldset>`;
  const step = (id, title, description, content) => `<section class="survey-step" data-wizard-step="${id}" hidden><div class="survey-step-heading"><span class="survey-step-kicker">KROK ${id + 1}</span><h3>${title}</h3>${description ? `<p>${description}</p>` : ''}</div><div class="survey-grid">${content}</div></section>`;
  const days = [['poniedzialek','Poniedziałek'],['wtorek','Wtorek'],['sroda','Środa'],['czwartek','Czwartek'],['piatek','Piątek'],['sobota','Sobota'],['niedziela','Niedziela']];
  const daySelect = [['Poniedziałek','Poniedziałek'],['Wtorek','Wtorek'],['Środa','Środa'],['Czwartek','Czwartek'],['Piątek','Piątek'],['Sobota','Sobota'],['Niedziela','Niedziela']];
  const equipment = [['dumbbells','Hantle'],['barbell','Sztanga'],['bench','Ławka'],['rack','Stojaki / klatka'],['pullup_bar','Drążek'],['bands','Gumy oporowe'],['kettlebell','Kettlebell'],['mat','Mata'],['treadmill','Bieżnia'],['stationary_bike','Rower stacjonarny'],['elliptical','Orbitrek'],['jump_rope','Skakanka'],['trx','TRX'],['cable_machine','Wyciąg'],['none','Brak sprzętu'],['other','Inny sprzęt']];
  const goals = [['redukcja','Redukcja tkanki tłuszczowej'],['masa','Budowa masy mięśniowej'],['rekompozycja','Poprawa sylwetki / rekompozycja'],['sila','Zwiększenie siły'],['kondycja','Poprawa kondycji i sprawności'],['powrot','Powrót do regularnej aktywności'],['inny','Inny cel']];
  const levels = [['poczatkujacy','Początkujący'],['sredniozaawansowany','Średniozaawansowany'],['zaawansowany','Zaawansowany'],['powrot','Powrót po dłuższej przerwie']];
  const tenures = [['never','Nigdy wcześniej'],['under6','Poniżej 6 miesięcy'],['6to12','6–12 miesięcy'],['1to2','1–2 lata'],['2to5','2–5 lat'],['over5','Powyżej 5 lat']];
  const regularities = [['none','Nie trenowałem'],['irregular','Nieregularnie'],['1to2','1–2 razy w tygodniu'],['3to4','3–4 razy w tygodniu'],['5plus','5 lub więcej razy w tygodniu']];
  const styles = [['machines','Maszyny'],['free','Wolne ciężary'],['mixed','Trening mieszany'],['no_preference','Bez preferencji']];

  function renderIntake(data) {
    const key = data.product_key;
    const isElite = key === 'elite';
    const isPro = key === 'pro';
    const isIndividual = key.startsWith('individual-');
    const individualFull = key === 'individual-full';
    const individualMonitor = key === 'individual-monitor' || individualFull;
    if (!isElite && !isPro && !isIndividual) { showError('Ten produkt nie wymaga ankiety.'); return; }
    const variant = key === 'individual-basic' ? 'BASIC' : key === 'individual-monitor' ? 'MONITORING I WSPARCIE' : key === 'individual-full' ? 'KONTROLA TECHNIKI' : isElite ? 'ELITE' : 'PRO';
    const titleText = isElite ? 'ANKIETA SYSTEM ELITE' : isPro ? 'ANKIETA SYSTEM PRO' : 'ANKIETA PLANU INDYWIDUALNEGO';
    const intro = isElite
      ? 'Rozbudowana ankieta do analizy, indywidualnego planu, Karty Celu ELITE i cotygodniowego prowadzenia przez 12 tygodni.'
      : isPro
        ? 'Zbierzemy informacje potrzebne do przygotowania planu PRO i kontroli postępów co 2 tygodnie przez 8 tygodni.'
        : `Ankieta dopasowana do zakupionego wariantu: ${variant}. Dodatkowe pytania pojawią się tylko w zakresie Twojego zamówienia.`;

    const identityGoal = `
      ${input('name','IMIĘ I NAZWISKO',{required:true,maxLength:120,autocomplete:'name'})}
      ${input('email','E-MAIL ZAMÓWIENIA',{required:true,type:'email',maxLength:254,autocomplete:'email',readonly:Boolean(data.email)})}
      ${input('age','WIEK',{required:true,type:'number',min:18,max:100,step:1,placeholder:'18–100'})}
      ${input('heightCm','WZROST W CM',{type:'number',min:100,max:250,step:1,placeholder:'Np. 180'})}
      ${select('gender','PŁEĆ — OPCJONALNIE',[['kobieta','Kobieta'],['mezczyzna','Mężczyzna'],['inna','Inna'],['no_answer','Wolę nie podawać']])}
      ${input('bodyWeightKg','AKTUALNA MASA CIAŁA W KG',{type:'number',min:25,max:350,step:0.1,placeholder:'Np. 82,5'})}
      ${select('primaryGoal','GŁÓWNY CEL TRENINGOWY',goals,{required:true})}
      ${textarea('goalDescription','OPISZ DOKŁADNIE, CO CHCESZ OSIĄGNĄĆ',{required:true,full:true,maxLength:1600,rows:4,placeholder:'Opisz swój cel, oczekiwania i kontekst.'})}
      ${textarea('secondaryGoal','DODATKOWY CEL',{full:true,maxLength:700})}
      ${isPro ? textarea('measurableGoal','KONKRETNY WYNIK, KTÓRY CHCIAŁBYŚ OSIĄGNĄĆ',{full:true,maxLength:700}) : ''}
      ${isElite ? `${textarea('whyGoalMatters','DLACZEGO TEN CEL JEST DLA CIEBIE WAŻNY?',{full:true,maxLength:700})}${textarea('desired12Weeks','JAKIE EFEKTY CHCIAŁBYŚ OSIĄGNĄĆ PO 12 TYGODNIACH?',{required:true,full:true,maxLength:900,rows:3})}${checks('musclePriorities','PARTIE MIĘŚNIOWE, NA KTÓRYCH SZCZEGÓLNIE CI ZALEŻY', [['klatka','Klatka piersiowa'],['plecy','Plecy'],['barki','Barki'],['ramiona','Ramiona'],['brzuch','Brzuch'],['nogi','Nogi'],['posladki','Pośladki']],{full:true})}` : ''}
      ${input('preferredStartDate','PREFEROWANA DATA ROZPOCZĘCIA',{type:'date'})}`;

    const experienceHtml = `
      ${select('experienceLevel','POZIOM ZAAWANSOWANIA',levels,{required:true})}
      ${select('trainingTenure','JAK DŁUGO TRENUJESZ SIŁOWO?',tenures,{required:true})}
      ${select('trainingRegularity','REGULARNOŚĆ W OSTATNICH 3 MIESIĄCACH',regularities,{required:true,full:true})}
      ${isElite ? `${select('individualizedPlan','CZY WCZEŚNIEJ REALIZOWAŁEŚ INDYWIDUALNY PLAN TRENINGOWY?',[['yes','Tak'],['no','Nie']],{required:true,full:true})}${textarea('recentTraining','JAK WYGLĄDAŁ TWÓJ TRENING W OSTATNICH 3 MIESIĄCACH?',{required:true,full:true,maxLength:1600,rows:4})}${textarea('regularExercises','JAKIE ĆWICZENIA WYKONYWAŁEŚ REGULARNIE?',{full:true,maxLength:900})}${radio('longBreak','CZY MIAŁEŚ DŁUŻSZE PRZERWY W TRENINGU?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('breakDescription','OPISZ DŁUŻSZE PRZERWY',{full:true,wrap:'data-show-when="longBreak:yes"',maxLength:700})}${textarea('whatWorked','CO NAJLEPIEJ DZIAŁAŁO W POPRZEDNIM TRENINGU?',{full:true,maxLength:700})}${textarea('whatDidNotWork','CO NIE PRZYNOSIŁO OCZEKIWANYCH REZULTATÓW?',{full:true,maxLength:700})}${textarea('currentPlanDescription','CZY REALIZUJESZ OBECNIE JAKIŚ PLAN? OPISZ GO, JEŚLI DOTYCZY',{full:true,maxLength:1200})}${fileUpload('currentPlanFile','DODAJ DOTYCHCZASOWY PLAN TRENINGOWY (OPCJONALNIE)')}` : isPro ? `${radio('hasCurrentPlan','CZY AKTUALNIE REALIZUJESZ JAKIŚ PLAN TRENINGOWY?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('currentPlanDescription','JEŚLI TAK, OPISZ OBECNY PLAN',{required:true,full:true,wrap:'data-show-when="hasCurrentPlan:yes"',maxLength:1000})}${radio('longBreak','CZY MIAŁEŚ DŁUŻSZE PRZERWY W TRENINGU?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('breakDescription','JEŚLI TAK, OPISZ PRZERWĘ',{full:true,wrap:'data-show-when="longBreak:yes"',maxLength:700})}` : `${textarea('trainingHistory','KRÓTKO OPISZ SWOJĄ DOTYCHCZASOWĄ HISTORIĘ TRENINGOWĄ',{required:true,full:true,maxLength:1200,rows:4})}${radio('hasCurrentPlan','CZY MASZ OBECNIE PLAN TRENINGOWY?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('currentPlanDescription','JEŚLI TAK, OPISZ OBECNY PLAN',{required:true,full:true,wrap:'data-show-when="hasCurrentPlan:yes"',maxLength:1000})}${fileUpload('currentPlanFile','DODAJ OBECNY PLAN TRENINGOWY (OPCJONALNIE)')}${radio('longBreak','CZY MIAŁEŚ DŁUŻSZE PRZERWY W TRENINGU?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('breakDescription','JEŚLI TAK, OPISZ PRZERWĘ',{full:true,wrap:'data-show-when="longBreak:yes"',maxLength:700})}`}`;

    const conditionsHtml = `
      ${select('trainingLocation','GDZIE BĘDZIESZ TRENOWAĆ?',[['home','W domu'],['gym','Na siłowni'],['both','W domu i na siłowni']],{required:true})}
      <fieldset class="equipment-module full" id="home-equipment" hidden disabled><legend>SPRZĘT DOSTĘPNY W DOMU *</legend><p>Zaznacz dostępne wyposażenie. Opcja „Brak sprzętu” wyklucza zaznaczenie pozostałych pozycji.</p><div class="choice-grid">${equipment.map(([value,label])=>`<label class="choice-option"><input type="checkbox" name="equipmentItems" value="${value}"><span>${label}</span></label>`).join('')}</div><input class="choice-required-proxy" type="text" tabindex="-1" aria-hidden="true" data-check-group="equipmentItems" readonly><div class="form-field" id="equipment-other-wrap" hidden><label for="f-equipmentOther">OPISZ INNY SPRZĘT *</label><input id="f-equipmentOther" name="equipmentOther" maxlength="300"></div></fieldset>
      ${radio('standardGym','CZY MASZ DOSTĘP DO STANDARDOWO WYPOSAŻONEJ SIŁOWNI?',[['yes','Tak'],['no','Nie']],{required:true,full:true,wrap:'data-show-for-location="gym,both"'})}
      ${textarea('gymLimitations','OPISZ OGRANICZENIA WYPOSAŻENIA SIŁOWNI',{required:true,full:true,wrap:'data-show-when="standardGym:no"',maxLength:700})}`;

    const scheduleHtml = `
      ${select('daysPerWeek','ILE DNI W TYGODNIU MOŻESZ TRENOWAĆ?',[2,3,4,5,6,7].map(n=>[String(n),`${n} dni`]),{required:true})}
      ${select('sessionMinutes','ILE CZASU MOŻESZ PRZEZNACZYĆ NA JEDEN TRENING?',[30,45,60,75,90].map(n=>[String(n),`${n} minut`]),{required:true})}
      ${checks('preferredDays','W JAKIE DNI NAJCZĘŚCIEJ MOŻESZ TRENOWAĆ?',days,{full:true})}
      ${select('availability','CZY DOSTĘPNOŚĆ TRENINGOWA JEST STAŁA?',[['fixed','Stała'],['variable','Zmienna'],['unknown','Trudno powiedzieć']])}
      ${isElite ? `${radio('availabilityChange','CZY DOSTĘPNOŚĆ MOŻE ZMIENIAĆ SIĘ W CIĄGU 12 TYGODNI?',[['yes','Tak'],['no','Nie']],{full:true})}${textarea('upcomingObstacles','CZY PRZEWIDUJESZ WYJAZDY, OKRESY WIĘKSZEJ PRACY LUB INNE PRZESZKODY?',{full:true,maxLength:900})}` : ''}`;

    const testsHtml = `
      <p class="survey-note full">Testy są całkowicie opcjonalne. Podaj wyniki tylko z ćwiczeń, które znasz. Nie wykonuj maksymalnych prób ciężarowych ani testów przez ból. Wyniki są orientacyjne i nie zastępują oceny techniki.</p>
      <div class="training-test-fieldset full" id="home-tests" hidden><h4>TESTY — TRENING W DOMU</h4>${testField('pushUps','Pompki','reps')}${testField('bodyweightSquats','Przysiady z masą ciała','reps')}</div>
      <div class="training-test-fieldset full" id="gym-tests" hidden><h4>TESTY — SIŁOWNIA</h4>${testField('benchPress','Wyciskanie leżąc','loadreps')}${testField('barbellSquat','Przysiad ze sztangą','loadreps')}${testField('pullUps','Podciąganie','reps')}${isElite ? textarea('otherWorkingSets','INNE WAŻNE ĆWICZENIA — CIĘŻAR, SERIE I POWTÓRZENIA',{full:true,maxLength:1000}) : ''}</div>`;

    const preferencesHtml = `
      ${textarea('preferredExercises','ĆWICZENIA, KTÓRE SZCZEGÓLNIE LUBISZ',{maxLength:900})}
      ${textarea('excludedExercises','ĆWICZENIA, KTÓRYCH NIE CHCESZ LUB NIE MOŻESZ WYKONYWAĆ',{maxLength:1000})}
      ${select('trainingStyle','PREFEROWANY STYL TRENINGU',styles)}
      ${!isElite ? checks('musclePriorities','PARTIE MIĘŚNIOWE, NA KTÓRYCH SZCZEGÓLNIE CI ZALEŻY',[['klatka','Klatka piersiowa'],['plecy','Plecy'],['barki','Barki'],['ramiona','Ramiona'],['brzuch','Brzuch'],['nogi','Nogi'],['posladki','Pośladki']],{full:true}) : ''}
      ${textarea('trainingAdditional','DODATKOWE INFORMACJE DOTYCZĄCE TRENINGU',{full:true,maxLength:800})}`;

    const lifestyleHtml = isIndividual ? '' : `
      ${select('workType','JAK WYGLĄDA TWOJA PRACA?',[['sitting','Siedząca'],['standing','Stojąca'],['physical','Fizyczna'],['mixed','Mieszana']])}
      ${textarea('dailyActivity','AKTYWNOŚĆ POZA TRENINGIEM',{maxLength:900})}
      ${input('sleepHours','ILE ŚREDNIO ŚPISZ?',{placeholder:'Np. 7 godzin'})}
      ${textarea('typicalWeek','JAK WYGLĄDA TWÓJ TYPOWY TYDZIEŃ?',{full:true,maxLength:900})}
      ${textarea('consistencyBarriers','JAKIE SĄ NAJWIĘKSZE TRUDNOŚCI Z REGULARNOŚCIĄ?',{full:true,maxLength:900})}
      ${select('recovery','JAK OCENIASZ SWOJĄ REGENERACJĘ?',[['good','Dobra'],['average','Przeciętna'],['poor','Słaba'],['unsure','Nie wiem']])}
      ${select('nutritionRegularity','JAK OCENIASZ REGULARNOŚĆ ODŻYWIANIA?',[['regular','Regularne'],['variable','Zmienna'],['irregular','Nieregularna'],['unsure','Trudno powiedzieć']])}
      ${textarea('nutritionDifficulties','JAKIE TRUDNOŚCI ŻYWIENIOWE CHCIAŁBYŚ POPRAWIĆ?',{full:true,maxLength:900})}
      ${textarea('educationNeeds','W CZYM SZCZEGÓLNIE POTRZEBUJESZ EDUKACYJNYCH WSKAZÓWEK DOTYCZĄCYCH ŻYWIENIA LUB REGENERACJI?',{full:true,maxLength:900})}
      <p class="survey-note full">Informacje o żywieniu i regeneracji służą wyłącznie dopasowaniu materiałów edukacyjnych. Ankieta nie uruchamia tworzenia indywidualnej diety, jadłospisu ani suplementacji.</p>`;

    const proDetails = isPro ? `
      ${checks('proMetrics','WSKAŹNIKI DO MONITOROWANIA CO 2 TYGODNIE',[['workouts','Realizacja zaplanowanych treningów'],['exerciseProgress','Postępy w wybranych ćwiczeniach'],['bodyWeight','Masa ciała — jeżeli istotna dla celu'],['measurements','Wybrane obwody — jeżeli istotne dla celu'],['other','Inne uzgodnione wskaźniki']],{required:true,full:true})}
      ${radio('proMetricsHelp','CZY CHCESZ, ŻEBY SYSTEM FORMY POMÓGŁ WYBRAĆ ODPOWIEDNIE WSKAŹNIKI?',[['yes','Tak, pomóżcie mi wybrać'],['no','Nie, wybieram samodzielnie']],{required:true,full:true})}
      ${textarea('proOtherMetric','INNE WSKAŹNIKI — JEŚLI ZAZNACZONO „INNE”',{full:true,maxLength:600})}
      ${textarea('supportNeeds','W JAKICH OBSZARACH NAJBARDZIEJ POTRZEBUJESZ WSKAZÓWEK?',{full:true,maxLength:900})}
      <p class="survey-note full">PRO obejmuje kontrolę postępów co 2 tygodnie i jedną zaplanowaną korektę planu w okresie 8 tygodni. Nie obejmuje cotygodniowych korekt.</p>` : '';

    const eliteCard = isElite ? `
      <p class="survey-note full">To propozycja klienta, a nie zatwierdzona Karta Celu. SYSTEM FORMY zweryfikuje cel, metodę, warunki i tolerancję. Karta otrzyma status „Do uzgodnienia”, a 12 tygodni rozpocznie się od uzgodnionej daty startu.</p>
      ${textarea('eliteGoal','PROPONOWANY GŁÓWNY, MIERZALNY CEL',{required:true,full:true,maxLength:900,rows:3})}
      ${select('eliteMetric','WSKAŹNIK OCENY POSTĘPU',[['strength','Siła w wybranym ćwiczeniu'],['fitness','Wynik testu sprawnościowego'],['bodyWeight','Masa ciała'],['circumference','Obwód ciała'],['trainingConsistency','Regularność treningów'],['other','Inny mierzalny wskaźnik']],{required:true,full:true})}
      ${input('eliteMetricOther','OPIS INNEGO WSKAŹNIKA',{full:true,wrap:'data-show-when="eliteMetric:other"',maxLength:500})}
      ${select('baselineStatus','WARTOŚĆ POCZĄTKOWA',[['known','Znam wartość — wpiszę ją'],['help','Nie znam — potrzebuję pomocy w ustaleniu']],{required:true})}
      ${input('baselineValue','WARTOŚĆ POCZĄTKOWA',{required:true,wrap:'data-show-when="baselineStatus:known"',maxLength:160,placeholder:'Wpisz wartość'})}
      ${select('targetStatus','WARTOŚĆ DOCELOWA',[['known','Mam propozycję wartości'],['help','Potrzebuję pomocy w ustaleniu']],{required:true})}
      ${input('targetValue','PROPONOWANA WARTOŚĆ DOCELOWA',{required:true,wrap:'data-show-when="targetStatus:known"',maxLength:160})}
      ${input('measurementUnit','JEDNOSTKA POMIARU',{placeholder:'Np. kg, cm, powtórzenia, treningi'})}
      ${select('measurementMethodChoice','METODA POMIARU',[['defined','Opisz proponowaną metodę'],['to_agree','Do ustalenia z SYSTEM FORMY']],{required:true})}
      ${textarea('measurementMethod','PROPONOWANA METODA POMIARU',{required:true,full:true,wrap:'data-show-when="measurementMethodChoice:defined"',maxLength:700})}
      ${textarea('measurementConditions','WARUNKI PRZEPROWADZANIA POMIARÓW',{full:true,maxLength:700})}
      ${input('measurementTolerance','TOLERANCJA / MARGINES BŁĘDU',{placeholder:'Jeżeli nie wiesz, pozostaw puste'})}
      ${input('baselineMeasurementDate','DATA POMIARU POCZĄTKOWEGO',{type:'date',required:true})}
      ${textarea('measurementNotes','DODATKOWE UWAGI DOTYCZĄCE POMIARU',{full:true,maxLength:700})}
      ${select('eliteReportDay','PREFEROWANY DZIEŃ COTYGODNIOWEGO RAPORTU',daySelect,{required:true,full:true})}
      ${radio('weeklyReporting','CZY POTWIERDZASZ GOTOWOŚĆ DO COTYGODNIOWEGO RAPORTOWANIA?',[['yes','Tak'],['no','Nie']],{required:true,full:true})}
      ${radio('workoutLog','CZY BĘDZIESZ ZAPISYWAĆ WYKONANE TRENINGI?',[['yes','Tak'],['no','Nie']],{required:true,full:true})}
      ${radio('goalTracking','CZY BĘDZIESZ PRZEKAZYWAĆ DANE POTRZEBNE DO MONITOROWANIA UZGODNIONEGO CELU?',[['yes','Tak'],['no','Nie']],{required:true,full:true})}
      ${textarea('reportBarriers','CO MOŻE UTRUDNIĆ REGULARNE WYSYŁANIE RAPORTÓW?',{full:true,maxLength:700})}` : '';

    const individualDetails = individualMonitor ? `
      ${checks('progressAreas','CO CHCIAŁBYŚ MONITOROWAĆ PRZEZ 4 TYGODNIE?',[['workouts','Regularność treningów'],['strength','Postępy siłowe'],['bodyWeight','Zmiany masy ciała'],['measurements','Zmiany wybranych obwodów'],['goal','Realizacja założonego celu'],['other','Inne']],{required:true,full:true})}
      ${textarea('monitoringParameters','JAKIE WYNIKI LUB PARAMETRY JESTEŚ W STANIE REGULARNIE ZAPISYWAĆ?',{required:true,full:true,maxLength:900})}
      ${radio('hasBaselineData','CZY MASZ JUŻ POCZĄTKOWE WARTOŚCI TYCH PARAMETRÓW?',[['yes','Tak'],['no','Nie']],{required:true,full:true})}
      ${textarea('baselineData','PODAJ WARTOŚCI POCZĄTKOWE',{required:true,full:true,wrap:'data-show-when="hasBaselineData:yes"',maxLength:900})}
      ${select('monitoringContactDay','KTÓRY DZIEŃ TYGODNIA NAJLEPIEJ CI ODPOWIADA DO KONTAKTU LUB RAPORTOWANIA?',daySelect,{required:true,full:true})}
      ${textarea('monitoringSupportNeeds','JAKIEGO WSPARCIA NAJBARDZIEJ POTRZEBUJESZ?',{full:true,maxLength:900})}
      <p class="survey-note full">Wariant obejmuje monitoring i wsparcie przez 4 tygodnie. Częstotliwość kontaktu jest ustalana w ramach usługi — formularz nie ustanawia automatycznie cotygodniowego raportowania.</p>` : `<p class="survey-note full">Wariant BASIC obejmuje wyłącznie przygotowanie i przekazanie planu na 4 tygodnie. Nie zawiera monitoringu, konsultacji, czatu ani kontroli techniki po przekazaniu planu.</p>`;
    const techniqueDetails = individualFull ? `
      <div class="full technique-builder"><div class="technique-builder-head"><div><h4>ĆWICZENIA DO KONTROLI TECHNIKI</h4><p>Nie wysyłaj nagrania teraz. Nagrania przekażesz później, zgodnie z uzgodnioną instrukcją.</p></div><button type="button" class="button button-outline" id="add-technique">DODAJ ĆWICZENIE</button></div><div id="technique-list"></div><input type="text" class="choice-required-proxy" tabindex="-1" aria-hidden="true" id="technique-required-proxy" readonly></div>
      <p class="survey-note full">Kontrola techniki odbywa się na podstawie uzgodnionych nagrań wskazanych ćwiczeń. Formularz nie ocenia automatycznie wykonywania ruchu.</p>` : '';

    const healthAndConfirm = `
      <fieldset class="health-module full"><legend>OPCJONALNE INFORMACJE O OGRANICZENIACH ZDROWOTNYCH</legend>
        <p>Ta część jest dobrowolna. Zanim zobaczysz pola zdrowotne, możesz udzielić osobnej zgody. Nie podawaj diagnozy ani dokumentacji medycznej.</p>
        <label class="form-consent"><input id="f-healthConsent" name="healthConsent" type="checkbox"><span>Wyrażam odrębną, dobrowolną zgodę na przetwarzanie przekazanych w tej sekcji informacji dotyczących zdrowia w celu uwzględnienia ograniczeń przy przygotowaniu i realizacji planu. Zgodę mogę wycofać.</span></label>
        <div id="health-fields" class="survey-grid" hidden>${select('healthPain','CZY WYSTĘPUJĄ BÓLE LUB URAZY OGRANICZAJĄCE TRENING?',[['yes','Tak'],['no','Nie'],['unsure','Nie wiem']])}${select('healthRestriction','CZY MASZ ZALECENIA OGRANICZENIA OKREŚLONYCH AKTYWNOŚCI?',[['yes','Tak'],['no','Nie'],['prefer_private','Wolę omówić prywatnie']])}${textarea('healthAvoid','RUCHY LUB ĆWICZENIA, KTÓRYCH NALEŻY UNIKAĆ',{full:true,maxLength:700})}${textarea('healthNotes','KRÓTKI OPIS OGRANICZENIA',{full:true,maxLength:800})}</div>
      </fieldset>
      ${radio('adultConfirmed','POTWIERDZENIE PEŁNOLETNOŚCI',[['yes','Potwierdzam, że mam ukończone 18 lat']],{required:true,full:true})}
      <label class="form-consent full"><input type="checkbox" name="termsAccepted" required><span>Akceptuję <a href="/regulamin.html" target="_blank" rel="noopener">Regulamin</a> usługi. *</span></label>
      <label class="form-consent full"><input type="checkbox" name="privacyAcknowledged" required><span>Potwierdzam, że zapoznałem(-am) się z <a href="/polityka-prywatnosci.html" target="_blank" rel="noopener">Polityką prywatności</a>. *</span></label>
      ${isElite ? '<p class="survey-note full">Potwierdzenie gotowości do raportowania jest wymagane w ELITE. Brak pojedynczego raportu nie oznacza automatycznej utraty gwarancji — obowiązuje procedura przypomnienia i indywidualnej oceny.</p>' : ''}`;

    const steps = [
      step(0,'Dane i cel','Podstawowe informacje i cel dopasowany do zakupionej usługi.',identityGoal),
      step(1,'Doświadczenie treningowe','Historia i poziom, które pomogą dobrać realny poziom obciążenia.',experienceHtml),
      step(2,'Miejsce i sprzęt','Pokażemy tylko wyposażenie odpowiednie dla wybranego miejsca treningu.',conditionsHtml),
      step(3,'Organizacja i wyniki','Wyniki testów są dobrowolne. Nie wykonuj prób maksymalnych.',scheduleHtml + testsHtml),
      step(4,'Preferencje i regeneracja','Dodatkowe informacje zależą od zakupionego produktu.',preferencesHtml + lifestyleHtml),
      step(5,isElite?'Karta Celu ELITE':isPro?'Kontrola postępów PRO': 'Dodatkowy zakres wariantu','Ta sekcja odpowiada wyłącznie zakresowi zakupionej usługi.',proDetails + eliteCard + individualDetails + techniqueDetails),
      step(6,'Zdrowie i potwierdzenia','Dane zdrowotne pozostają całkowicie dobrowolne i są oddzielone od pozostałych odpowiedzi.',healthAndConfirm),
      `<section class="survey-step survey-review" data-wizard-step="7" hidden><div class="survey-step-heading"><span class="survey-step-kicker">OSTATNI KROK</span><h3>Sprawdź odpowiedzi</h3><p>Przed wysłaniem możesz wrócić do dowolnego poprzedniego kroku i poprawić dane.</p></div><div id="survey-review-content" class="survey-review-content"></div><div class="survey-submit-row"><button class="button button-light" type="submit" id="intake-submit">WYŚLIJ ANKIETĘ</button><p id="intake-status" class="realization-message" role="status" aria-live="polite"></p></div></section>`
    ];

    root.innerHTML = `
      <div class="realization-success">Płatność za <strong>${esc(data.product_name)}</strong> została potwierdzona. Poniżej znajduje się ankieta przypisana do zakupionego produktu.</div>
      <div class="survey-intro-block"><h2 class="survey-heading">${titleText}</h2><p class="realization-lead">${intro}</p><div class="survey-product-meta"><span>${esc(data.product_name)}</span><span>${esc(isElite?'12 tygodni':isPro?'8 tygodni':'4 tygodnie')}</span><span>Wariant: ${esc(variant)}</span></div></div>
      <form id="client-intake" class="realization-form survey-wizard" novalidate>
        <div class="survey-progress"><div class="survey-progress-top"><span id="survey-progress-label">Krok 1 z 8</span><strong id="survey-progress-percent">13%</strong></div><div class="survey-progress-track"><span id="survey-progress-bar"></span></div></div>
        <div class="survey-steps">${steps.join('')}</div>
        <div class="survey-navigation"><button type="button" class="button button-outline" id="survey-back" disabled>WSTECZ</button><button type="button" class="button button-light" id="survey-next">DALEJ</button></div>
      </form>`;

    const form = document.querySelector('#client-intake');
    const allSteps = Array.from(form.querySelectorAll('[data-wizard-step]'));
    const totalSteps = allSteps.length;
    let currentStep = 0;
    const uploadedFiles = [];
    const variantTitle = isIndividual ? variant : isElite ? 'ELITE' : 'PRO';
    form.elements.name.value = data.name || '';
    form.elements.email.value = data.email || '';

    function showStep(index) {
      currentStep = Math.max(0, Math.min(totalSteps - 1, index));
      allSteps.forEach((node, i) => { node.hidden = i !== currentStep; });
      $('#survey-back', form).disabled = currentStep === 0;
      $('#survey-next', form).hidden = currentStep === totalSteps - 1;
      const percent = Math.round(((currentStep + 1) / totalSteps) * 100);
      $('#survey-progress-label', form).textContent = currentStep === totalSteps - 1 ? 'Podsumowanie' : `Krok ${currentStep + 1} z ${totalSteps - 1}`;
      $('#survey-progress-percent', form).textContent = `${percent}%`;
      $('#survey-progress-bar', form).style.width = `${percent}%`;
      if (currentStep === totalSteps - 1) renderReview();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function validateActiveStep() {
      const active = allSteps[currentStep];
      const invalid = Array.from(active.querySelectorAll('input,select,textarea')).find(el => !el.disabled && !el.readOnly && !el.classList.contains('choice-required-proxy') && el.type !== 'file' && !el.checkValidity());
      if (invalid) { invalid.reportValidity(); invalid.focus({preventScroll:false}); return false; }
      for (const proxy of Array.from(active.querySelectorAll('[data-check-group]'))) {
        const groupName = proxy.dataset.checkGroup;
        const groupEnabled = !proxy.disabled;
        const requiredGroup = groupName === 'equipmentItems' || groupName === 'progressAreas' || (groupName === 'proMetrics' && getRadio('proMetricsHelp') !== 'yes');
        const selected = active.querySelectorAll(`input[type="checkbox"][name="${groupName}"]:checked`).length > 0;
        const fieldset = proxy.closest('fieldset');
        let message = fieldset?.querySelector('.choice-group-error');
        if (requiredGroup && groupEnabled && !selected) {
          if (!message) { message = document.createElement('p'); message.className = 'choice-group-error'; fieldset?.appendChild(message); }
          message.textContent = 'Wybierz co najmniej jedną odpowiedź.';
          fieldset?.querySelector('input[type="checkbox"]')?.focus();
          return false;
        }
        if (message) message.remove();
      }
      const techniqueProxy = active.querySelector('#technique-required-proxy');
      if (techniqueProxy && active.querySelectorAll('.technique-card').length === 0) {
        const list = active.querySelector('#technique-list');
        let message = active.querySelector('.technique-group-error');
        if (!message) { message = document.createElement('p'); message.className = 'choice-group-error technique-group-error'; list?.after(message); }
        message.textContent = 'Dodaj co najmniej jedno ćwiczenie do kontroli techniki.';
        $('#add-technique', active)?.focus();
        return false;
      }
      active.querySelector('.technique-group-error')?.remove();
      return true;
    }
    $('#survey-next', form).addEventListener('click', () => { if (validateActiveStep()) showStep(currentStep + 1); });
    $('#survey-back', form).addEventListener('click', () => showStep(currentStep - 1));

    function get(name) { return form.elements[name]?.value ?? ''; }
    function getAll(name) { return new FormData(form).getAll(name).map(value => String(value)); }
    function getRadio(name) { return form.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
    function updateProxy(groupName) {
      const proxy = form.querySelector(`[data-check-group="${groupName}"]`);
      if (!proxy) return;
      const selected = form.querySelectorAll(`input[type="checkbox"][name="${groupName}"]:checked`).length > 0;
      proxy.required = false;
      proxy.setCustomValidity('');
      proxy.value = selected ? 'ok' : '';
    }
    function conditionalUpdate() {
      const location = get('trainingLocation');
      const home = ['home','both'].includes(location);
      const gym = ['gym','both'].includes(location);
      toggleBlock('#home-equipment', home);
      toggleBlock('#home-tests', home);
      toggleBlock('#gym-tests', gym);
      form.querySelectorAll('[data-show-for-location]').forEach(node => toggleBlockNode(node, node.dataset.showForLocation.split(',').includes(location)));
      const none = form.querySelector('input[name="equipmentItems"][value="none"]');
      const other = form.querySelector('input[name="equipmentItems"][value="other"]');
      form.querySelectorAll('input[name="equipmentItems"]').forEach(el => {
        if (el !== none) el.disabled = !home || Boolean(none?.checked);
        else el.disabled = !home;
      });
      if (!home) form.querySelectorAll('input[name="equipmentItems"]').forEach(el => { el.checked = false; });
      if (none?.checked) form.querySelectorAll('input[name="equipmentItems"]').forEach(el => { if (el !== none) el.checked = false; });
      if (none && !none.checked && other) other.disabled = !home;
      const otherWrap = $('#equipment-other-wrap', form);
      if (otherWrap) {
        const showOther = home && Boolean(other?.checked);
        toggleBlockNode(otherWrap, showOther);
        const otherInput = otherWrap.querySelector('input');
        otherInput.required = showOther;
      }
      const standardGym = getRadio('standardGym');
      form.querySelectorAll('[data-show-when]').forEach(node => {
        const [name,value] = node.dataset.showWhen.split(':');
        let current = get(name);
        if (!current) current = getRadio(name);
        toggleBlockNode(node, current === value);
      });
      form.querySelectorAll('[data-test-key]').forEach(node => updateTestNode(node));
      form.querySelectorAll('[data-check-group]').forEach(proxy => {
        if (proxy.dataset.checkGroup === 'proMetrics' && getRadio('proMetricsHelp') === 'yes') { proxy.required = false; proxy.setCustomValidity(''); proxy.value = 'ok'; }
        else updateProxy(proxy.dataset.checkGroup);
      });
      const techniqueProxy = $('#technique-required-proxy', form);
      if (techniqueProxy) {
        const count = form.querySelectorAll('.technique-card').length;
        techniqueProxy.required = false;
        techniqueProxy.setCustomValidity('');
        techniqueProxy.value = count ? 'ok' : '';
      }
      void standardGym;
    }
    function toggleBlock(selector, show) { const node = form.querySelector(selector); if (node) toggleBlockNode(node, show); }
    function toggleBlockNode(node, show) {
      node.hidden = !show;
      if (node.tagName === 'FIELDSET') node.disabled = !show;
      node.querySelectorAll('input,select,textarea,button').forEach(el => { if (el.type !== 'checkbox' && el.type !== 'radio') { if (!show) el.dataset.wasRequired = el.required ? '1' : '0'; el.disabled = !show; if (!show) el.required = false; else if (el.dataset.wasRequired === '1') el.required = true; } else el.disabled = !show; });
    }
    function updateTestNode(node) {
      const status = node.querySelector('[data-test-status]');
      const values = node.querySelectorAll('[data-test-value]');
      const entered = status?.value === 'provided';
      values.forEach(el => { el.disabled = !entered; el.required = entered; if (!entered) el.value = ''; });
    }
    form.addEventListener('change', event => {
      if (event.target.matches('[data-test-status]')) updateTestNode(event.target.closest('[data-test-key]'));
      conditionalUpdate();
    });
    form.addEventListener('input', event => { if (event.target.matches('[data-test-value]')) conditionalUpdate(); });

    $('#f-healthConsent', form)?.addEventListener('change', event => toggleBlock('#health-fields', event.target.checked));
    form.querySelectorAll('input[name="equipmentItems"]').forEach(el => el.addEventListener('change', conditionalUpdate));
    form.querySelectorAll('input[name="proMetrics"],input[name="progressAreas"],input[name="musclePriorities"],input[name="preferredDays"]').forEach(el => el.addEventListener('change', conditionalUpdate));

    function addTechniqueCard() {
      const list = $('#technique-list', form);
      const index = list.children.length + 1;
      const card = document.createElement('div');
      card.className = 'technique-card';
      card.innerHTML = `<div class="technique-card-head"><strong>Ćwiczenie ${index}</strong><button type="button" class="text-button" data-remove-technique>Usuń</button></div><div class="survey-grid">${input(`techniqueName${index}`,'NAZWA ĆWICZENIA',{required:true,maxLength:160})}${input(`techniqueVariant${index}`,'AKTUALNIE WYKONYWANY WARIANT',{maxLength:220})}${textarea(`techniqueDifficulty${index}`,'NAJWIĘKSZA TRUDNOŚĆ',{maxLength:500})}${textarea(`techniqueImprove${index}`,'CO CHCIAŁBYŚ POPRAWIĆ?',{maxLength:500})}${textarea(`techniqueComment${index}`,'DODATKOWY KOMENTARZ',{full:true,maxLength:500})}</div>`;
      list.appendChild(card);
      card.querySelector('[data-remove-technique]').addEventListener('click', () => { card.remove(); renumberTechniqueCards(); conditionalUpdate(); });
      renumberTechniqueCards(); conditionalUpdate();
    }
    function renumberTechniqueCards() {
      const list = $('#technique-list', form);
      Array.from(list.children).forEach((card,i) => { card.querySelector('.technique-card-head strong').textContent = `Ćwiczenie ${i+1}`; });
    }
    $('#add-technique', form)?.addEventListener('click', addTechniqueCard);
    if (individualFull) addTechniqueCard();

    function testField(key, label, type) {
      const values = type === 'loadreps' ? `<div class="test-value-row"><label>Ciężar (kg)<input type="number" min="0" max="500" step="0.5" data-test-value data-test-part="weightKg" disabled></label><label>Powtórzenia<input type="number" min="0" max="1000" step="1" data-test-value data-test-part="reps" disabled></label></div>` : `<div class="test-value-row"><label>Liczba powtórzeń<input type="number" min="0" max="1000" step="1" data-test-value data-test-part="reps" disabled></label></div>`;
      return `<div class="test-entry" data-test-key="${key}" data-test-type="${type}"><div class="test-entry-title">${label}</div><label class="test-status-label">WYNIK<select data-test-status><option value="not_provided">Nie podano</option><option value="unknown">Nie wiem</option><option value="not_performed">Nie wykonuję</option><option value="provided">Podaję wynik</option></select></label>${values}</div>`;
    }
    function fileUpload(name,label) { return `<div class="form-field full file-upload-field"><label for="upload-${name}">${label}</label><input id="upload-${name}" type="file" accept=".pdf,.doc,.docx,.odt,.txt"><p class="file-upload-status" data-upload-status="${name}">Plik opcjonalny. Maksymalnie 10 MB. PDF, DOC, DOCX, ODT lub TXT.</p></div>`; }

    function setupFileUploads() {
      form.querySelectorAll('input[type="file"]').forEach(fileInput => fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const status = form.querySelector(`[data-upload-status="${fileInput.id.replace('upload-','')}"]`);
        if (file.size > 10 * 1024 * 1024) { status.textContent = 'Plik przekracza limit 10 MB.'; fileInput.value = ''; return; }
        status.textContent = 'Przesyłanie pliku…'; fileInput.disabled = true;
        try {
          const body = new FormData(); body.append('session_id', sessionId); body.append('kind','training_plan'); body.append('file',file,file.name);
          const response = await fetch('/api/intake-upload',{method:'POST',body,cache:'no-store'});
          const result = await response.json().catch(()=>({}));
          if (!response.ok) throw new Error(result.error || 'Nie udało się przesłać pliku.');
          uploadedFiles.push(result.file);
          status.textContent = `Dodano: ${result.file.file_name}`;
        } catch (error) { status.textContent = error.message || 'Nie udało się przesłać pliku.'; fileInput.value = ''; }
        finally { fileInput.disabled = false; }
      }));
    }

    function testValues() {
      const tests = { home: {}, gym: {} };
      form.querySelectorAll('[data-test-key]').forEach(node => {
        const key = node.dataset.testKey; const status = node.querySelector('[data-test-status]').value;
        const entry = { status, value: null };
        if (node.dataset.testType === 'loadreps') {
          entry.value = { weightKg: node.querySelector('[data-test-part="weightKg"]').value, reps: node.querySelector('[data-test-part="reps"]').value };
        } else entry.value = node.querySelector('[data-test-part="reps"]').value;
        if (node.closest('#home-tests')) tests.home[key] = entry; else tests.gym[key] = entry;
      });
      return tests;
    }
    function productSpecific() {
      if (isPro) return {
        progress: { indicators: getAll('proMetrics'), helpChoose: getRadio('proMetricsHelp'), other: get('proOtherMetric'), supportNeeds: get('supportNeeds') }
      };
      if (isElite) return {
        elite: {
          goal: get('eliteGoal'), metric: get('eliteMetric'), metricOther: get('eliteMetricOther'),
          baseline: { status: get('baselineStatus'), value: get('baselineValue') },
          target: { status: get('targetStatus'), value: get('targetValue') }, unit: get('measurementUnit'),
          measurementMethodChoice: get('measurementMethodChoice'), measurementMethod: get('measurementMethod'),
          conditions: get('measurementConditions'), tolerance: get('measurementTolerance'),
          baselineMeasurementDate: get('baselineMeasurementDate'), notes: get('measurementNotes'), reportDay: get('eliteReportDay'),
          weeklyReporting: getRadio('weeklyReporting'), workoutLog: getRadio('workoutLog'), goalTracking: getRadio('goalTracking'), reportBarriers: get('reportBarriers'), status: 'to_agreement'
        }
      };
      return individualMonitor ? {
        monitoring: { areas: getAll('progressAreas'), parameters: get('monitoringParameters'), hasBaselineData: getRadio('hasBaselineData'), baselineData: get('baselineData'), contactDay: get('monitoringContactDay'), supportNeeds: get('monitoringSupportNeeds') },
        technique: individualFull ? Array.from(form.querySelectorAll('.technique-card')).map(card => ({ name: card.querySelector('[name^="techniqueName"]').value, variant: card.querySelector('[name^="techniqueVariant"]').value, difficulty: card.querySelector('[name^="techniqueDifficulty"]').value, improve: card.querySelector('[name^="techniqueImprove"]').value, comment: card.querySelector('[name^="techniqueComment"]').value })) : undefined
      } : { basic: { planOnly: true } };
    }
    function collectPayload() {
      const loc = get('trainingLocation');
      const selectedEquipment = getAll('equipmentItems');
      const tests = testValues();
      const healthConsent = $('#f-healthConsent',form).checked;
      return {
        session_id: sessionId,
        name: get('name'), email: get('email'), age: get('age'), adultConfirmed: getRadio('adultConfirmed') === 'yes',
        termsAccepted: form.elements.termsAccepted.checked, privacyAcknowledged: form.elements.privacyAcknowledged.checked,
        profile: { heightCm: get('heightCm'), gender: get('gender'), bodyWeightKg: get('bodyWeightKg') },
        goal: { primary: get('primaryGoal'), description: get('goalDescription'), secondary: get('secondaryGoal'), measurable: get('measurableGoal'), why: get('whyGoalMatters'), desired12Weeks: get('desired12Weeks'), musclePriorities: getAll('musclePriorities') },
        experience: { level: get('experienceLevel'), tenure: get('trainingTenure'), regularity: get('trainingRegularity'), trainingHistory: get('trainingHistory'), individualizedPlan: get('individualizedPlan'), recentTraining: get('recentTraining'), regularExercises: get('regularExercises'), hasCurrentPlan: getRadio('hasCurrentPlan'), currentPlanDescription: get('currentPlanDescription'), longBreak: getRadio('longBreak'), breakDescription: get('breakDescription'), whatWorked: get('whatWorked'), whatDidNotWork: get('whatDidNotWork') },
        conditions: { location: loc, equipmentItems: selectedEquipment, equipmentOther: get('equipmentOther'), standardGym: getRadio('standardGym'), gymLimitations: get('gymLimitations') },
        organization: { daysPerWeek: get('daysPerWeek'), sessionMinutes: get('sessionMinutes'), preferredDays: getAll('preferredDays'), availability: get('availability'), availabilityChange: getRadio('availabilityChange'), upcomingObstacles: get('upcomingObstacles'), preferredStartDate: get('preferredStartDate') },
        tests, preferences: { preferredExercises: get('preferredExercises'), excludedExercises: get('excludedExercises'), trainingStyle: get('trainingStyle'), musclePriorities: getAll('musclePriorities'), additional: get('trainingAdditional'), otherWorkingSets: get('otherWorkingSets') },
        lifestyle: isIndividual ? {} : { workType: get('workType'), dailyActivity: get('dailyActivity'), sleepHours: get('sleepHours'), typicalWeek: get('typicalWeek'), consistencyBarriers: get('consistencyBarriers'), recovery: get('recovery'), nutritionRegularity: get('nutritionRegularity'), nutritionDifficulties: get('nutritionDifficulties'), educationNeeds: get('educationNeeds') },
        productDetails: productSpecific(),
        healthConsent,
        health: healthConsent ? { pain: get('healthPain'), restriction: get('healthRestriction'), avoid: get('healthAvoid'), notes: get('healthNotes') } : null,
        attachments: uploadedFiles.map(file => file.file_id)
      };
    }
    function renderReview() {
      const payload = collectPayload();
      const fieldNames = {
        name:'Imię i nazwisko',email:'E-mail',age:'Wiek',heightCm:'Wzrost (cm)',gender:'Płeć',bodyWeightKg:'Masa ciała (kg)',
        primary:'Główny cel',description:'Opis celu',secondary:'Dodatkowy cel',measurable:'Konkretny wynik',why:'Dlaczego cel jest ważny',desired12Weeks:'Oczekiwane efekty po 12 tygodniach',musclePriorities:'Priorytetowe partie mięśniowe',
        level:'Poziom zaawansowania',tenure:'Staż treningowy',regularity:'Regularność z ostatnich 3 miesięcy',trainingHistory:'Historia treningowa',individualizedPlan:'Wcześniejszy plan indywidualny',recentTraining:'Trening z ostatnich 3 miesięcy',regularExercises:'Regularne ćwiczenia',hasCurrentPlan:'Aktualny plan',currentPlanDescription:'Opis aktualnego planu',longBreak:'Dłuższe przerwy',breakDescription:'Opis przerw',whatWorked:'Co działało',whatDidNotWork:'Co nie działało',
        location:'Miejsce treningu',equipmentItems:'Sprzęt domowy',equipmentOther:'Inny sprzęt',standardGym:'Standardowa siłownia',gymLimitations:'Ograniczenia siłowni',daysPerWeek:'Dni treningowe w tygodniu',sessionMinutes:'Czas jednej sesji (min)',preferredDays:'Preferowane dni',availability:'Dostępność',availabilityChange:'Zmiana dostępności',upcomingObstacles:'Planowane przeszkody',preferredStartDate:'Preferowana data rozpoczęcia',
        pushUps:'Pompki',bodyweightSquats:'Przysiady z masą ciała',benchPress:'Wyciskanie leżąc',barbellSquat:'Przysiad ze sztangą',pullUps:'Podciąganie',weightKg:'Ciężar (kg)',reps:'Powtórzenia',status:'Status wyniku',otherWorkingSets:'Inne ćwiczenia — serie i ciężary',
        preferredExercises:'Preferowane ćwiczenia',excludedExercises:'Ćwiczenia wykluczone',trainingStyle:'Preferowany styl',additional:'Dodatkowe informacje',workType:'Rodzaj pracy',dailyActivity:'Aktywność poza treningiem',sleepHours:'Sen',typicalWeek:'Typowy tydzień',consistencyBarriers:'Trudności z regularnością',recovery:'Regeneracja',nutritionRegularity:'Regularność odżywiania',nutritionDifficulties:'Trudności żywieniowe',educationNeeds:'Potrzeby edukacyjne',
        indicators:'Wskaźniki monitorowania',helpChoose:'Pomoc w doborze wskaźników',other:'Inny wskaźnik',supportNeeds:'Oczekiwane wsparcie',goal:'Proponowany cel',metric:'Wskaźnik celu',metricOther:'Inny wskaźnik',baseline:'Wartość początkowa',target:'Wartość docelowa',unit:'Jednostka',measurementMethodChoice:'Metoda pomiaru',measurementMethod:'Metoda pomiaru',conditions:'Warunki pomiaru',tolerance:'Tolerancja',baselineMeasurementDate:'Data pomiaru początkowego',notes:'Uwagi do pomiaru',reportDay:'Dzień raportowania',weeklyReporting:'Cotygodniowe raportowanie',workoutLog:'Zapisywanie treningów',goalTracking:'Przekazywanie danych celu',reportBarriers:'Trudności z raportowaniem',areas:'Obszary monitorowania',parameters:'Zapisywane parametry',hasBaselineData:'Dostępność danych początkowych',baselineData:'Wartości początkowe',contactDay:'Preferowany dzień kontaktu',
        pain:'Bóle lub urazy',restriction:'Zalecenia ograniczenia aktywności',avoid:'Ruchy do unikania',notes:'Dodatkowy opis'
      };
      const values = {
        yes:'Tak',no:'Nie',unsure:'Nie wiem',prefer_private:'Wolę omówić prywatnie',home:'Dom',gym:'Siłownia',both:'Dom i siłownia',dumbbells:'Hantle',barbell:'Sztanga',bench:'Ławka',rack:'Stojaki / klatka',pullup_bar:'Drążek',bands:'Gumy oporowe',kettlebell:'Kettlebell',mat:'Mata',treadmill:'Bieżnia',stationary_bike:'Rower stacjonarny',elliptical:'Orbitrek',jump_rope:'Skakanka',trx:'TRX',cable_machine:'Wyciąg',none:'Brak sprzętu',other:'Inne',poniedzialek:'Poniedziałek',wtorek:'Wtorek',sroda:'Środa',czwartek:'Czwartek',piatek:'Piątek',sobota:'Sobota',niedziela:'Niedziela',workouts:'Realizacja treningów',exerciseProgress:'Postępy w ćwiczeniach',bodyWeight:'Masa ciała',measurements:'Obwody',strength:'Siła',goal:'Realizacja celu',
        poczatkujacy:'Początkujący',sredniozaawansowany:'Średniozaawansowany',zaawansowany:'Zaawansowany',powrot:'Powrót po przerwie',
        redukcja:'Redukcja tkanki tłuszczowej',masa:'Budowa masy mięśniowej',rekompozycja:'Rekompozycja',sila:'Zwiększenie siły',kondycja:'Kondycja i sprawność',inny:'Inny cel',
        machines:'Maszyny',free:'Wolne ciężary',mixed:'Trening mieszany',no_preference:'Bez preferencji',fixed:'Stała',variable:'Zmienna',unknown:'Nie wiem',
        sitting:'Praca siedząca',standing:'Praca stojąca',physical:'Praca fizyczna',mixed:'Mieszana',good:'Dobra',average:'Przeciętna',poor:'Słaba',
        regular:'Regularne',irregular:'Nieregularne',provided:'Podaję wynik',not_provided:'Nie podano',not_performed:'Nie wykonuję',help:'Potrzebuję pomocy',known:'Znam wartość',defined:'Metoda określona',to_agree:'Do ustalenia z SYSTEM FORMY',never:'Nigdy wcześniej',under6:'Poniżej 6 miesięcy','6to12':'6–12 miesięcy','1to2':'1–2 lata','2to5':'2–5 lat',over5:'Powyżej 5 lat',none:'Nie trenowałem',irregular:'Nieregularnie','1to2':'1–2 razy w tygodniu','3to4':'3–4 razy w tygodniu','5plus':'5 lub więcej razy w tygodniu',exerciseProgress:'Postępy w wybranych ćwiczeniach',bodyWeight:'Masa ciała',measurements:'Wybrane obwody',trainingConsistency:'Regularność treningów'
      };
      const equipmentReviewLabels = { dumbbells:'Hantle',barbell:'Sztanga',bench:'Ławka',rack:'Stojaki / klatka',pullup_bar:'Drążek',bands:'Gumy oporowe',kettlebell:'Kettlebell',mat:'Mata',treadmill:'Bieżnia',stationary_bike:'Rower stacjonarny',elliptical:'Orbitrek',jump_rope:'Skakanka',trx:'TRX',cable_machine:'Wyciąg',none:'Brak sprzętu',other:'Inny sprzęt' };
      const weekdayReviewLabels = { poniedzialek:'Poniedziałek',wtorek:'Wtorek',sroda:'Środa',czwartek:'Czwartek',piatek:'Piątek',sobota:'Sobota',niedziela:'Niedziela' };
      function pretty(value, contextKey = '') {
        if (value === null || value === undefined || value === '') return 'Nie podano';
        if (Array.isArray(value)) {
          if (!value.length) return 'Nie podano';
          return value.map(item => contextKey === 'equipmentItems' ? (equipmentReviewLabels[item] || String(item)) : contextKey === 'preferredDays' ? (weekdayReviewLabels[item] || String(item)) : (values[item] || String(item))).join(', ');
        }
        if (typeof value === 'object') return Object.entries(value).map(([key,item]) => `${fieldNames[key] || key}: ${pretty(item, key)}`).join(' · ') || 'Nie podano';
        if (value === 'unknown') return 'Nie wiem';
        if (contextKey === 'equipmentItems' && value === 'none') return 'Brak sprzętu';
        if (contextKey === 'regularity' && value === 'none') return 'Nie trenowałem';
        if (['indicators','areas'].includes(contextKey) && value === 'other') return 'Inne';
        if (contextKey === 'primary' && value === 'inny') return 'Inny cel';
        return values[value] || String(value);
      }
      function section(title, object) {
        const rows = Object.entries(object || {}).map(([key,value]) => `<div class="survey-review-row"><strong>${esc(fieldNames[key] || key)}</strong><span>${esc(pretty(value))}</span></div>`).join('');
        return `<div class="survey-review-section"><h4>${esc(title)}</h4>${rows || '<p>Nie podano.</p>'}</div>`;
      }
      let html = section('Dane klienta', { name:payload.name,email:payload.email,age:payload.age,...payload.profile });
      html += section('Cel', payload.goal);
      html += section('Doświadczenie', payload.experience);
      html += section('Miejsce, sprzęt i organizacja', { ...payload.conditions,...payload.organization });
      html += section('Wyniki testów — dobrowolne', payload.tests);
      html += section('Preferencje treningowe', payload.preferences);
      if (!isIndividual) html += section('Aktywność i regeneracja', payload.lifestyle);
      html += section('Dodatkowe dane zakupionego produktu', payload.productDetails);
      html += section('Ograniczenia zdrowotne', payload.healthConsent ? payload.health : { informacja:'Brak zgody — pola zdrowotne nie były wyświetlane ani zapisywane.' });
      html += section('Potwierdzenia', { pelnoletnosc:payload.adultConfirmed,regulamin:payload.termsAccepted,politykaPrywatnosci:payload.privacyAcknowledged,oddzielnaZgodaZdrowotna:payload.healthConsent });
      html += `<p class="survey-note">Załączniki: ${esc(uploadedFiles.map(file => file.file_name).join(', ') || 'Nie dodano')}. Po wysłaniu odpowiedzi zostaną zapisane w bazie SYSTEM FORMY i udostępnione wyłącznie administratorowi w panelu realizacji.</p>`;
      $('#survey-review-content',form).innerHTML = html;
    }

    function setupCheckGroups() {
      form.querySelectorAll('[data-check-group]').forEach(proxy => {
        const name = proxy.dataset.checkGroup;
        form.querySelectorAll(`input[type="checkbox"][name="${name}"]`).forEach(box => box.addEventListener('change', () => {
          if (name === 'equipmentItems') {
            const none = form.querySelector('input[name="equipmentItems"][value="none"]');
            if (box === none && box.checked) form.querySelectorAll('input[name="equipmentItems"]').forEach(other => { if (other !== none) other.checked = false; });
            else if (box.checked && none) none.checked = false;
          }
          updateProxy(name); conditionalUpdate();
        }));
        updateProxy(name);
      });
    }
    setupCheckGroups(); setupFileUploads(); conditionalUpdate(); showStep(0);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentStep !== totalSteps - 1) { if (validateActiveStep()) showStep(currentStep + 1); return; }
      const savedStep = currentStep;
      for (let i = 0; i < totalSteps - 1; i++) {
        showStep(i);
        conditionalUpdate();
        if (!validateActiveStep()) return;
      }
      showStep(savedStep);
      const submit = $('#intake-submit',form); const status = $('#intake-status',form);
      submit.disabled = true; status.textContent = 'Zapisuję ankietę…'; status.classList.remove('realization-error');
      try {
        const response = await fetch('/api/submit-intake',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(collectPayload())});
        const result = await response.json().catch(()=>({}));
        if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać ankiety.');
        form.innerHTML = `<div class="realization-success"><strong>Ankieta została wysłana.</strong><br>${esc(result.message || 'Dziękujemy. Otrzymaliśmy Twoje odpowiedzi.')}</div><p class="realization-lead">Identyfikator zgłoszenia: <strong>${esc(result.submission_id || 'zapisano')}</strong></p><a class="button button-outline" href="/">WRÓĆ NA STRONĘ GŁÓWNĄ</a>`;
      } catch (error) {
        showStep(totalSteps - 1); status.textContent = error instanceof Error ? error.message : 'Nie udało się zapisać ankiety.'; status.classList.add('realization-error'); submit.disabled = false;
      }
    });
  }

  function showError(message) {
    root.innerHTML = `<p class="realization-message realization-error">${esc(message)}</p><p><a class="button button-outline" href="/">WRÓĆ DO STRONY GŁÓWNEJ</a></p>`;
  }
  checkPayment();
})();
