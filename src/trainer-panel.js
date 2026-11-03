(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const loginView = $('#login-view');
  const dashboardView = $('#dashboard-view');
  const fatalView = $('#fatal-view');
  const clientList = $('#client-list');
  const detailPanel = $('#detail-panel');
  const workspace = $('.workspace');
  const statsGrid = $('#client-stats');
  const reviewsView = $('#reviews-admin-view');
  const reviewsList = $('#reviews-admin-list');
  const state = { orders: [], selectedOrderRef: null, debounce: null, productFilter: 'all', reviews: [], dashboardTab: 'clients' };

  const labels = {
    name:'Imię i nazwisko',email:'E-mail',age:'Wiek',gender:'Płeć',heightCm:'Wzrost (cm)',bodyWeightKg:'Masa ciała (kg)',
    primary:'Główny cel',description:'Opis celu',secondary:'Cel dodatkowy',measurable:'Mierzalny cel dodatkowy',why:'Dlaczego cel jest ważny',desired12Weeks:'Oczekiwane efekty po 12 tygodniach',
    level:'Poziom zaawansowania',tenure:'Staż treningowy',regularity:'Regularność z ostatnich 3 miesięcy',trainingHistory:'Historia treningowa',individualizedPlan:'Wcześniejszy plan indywidualny',recentTraining:'Trening w ostatnich 3 miesiącach',regularExercises:'Regularne ćwiczenia',hasCurrentPlan:'Aktualny plan',currentPlanDescription:'Opis aktualnego planu',longBreak:'Dłuższa przerwa',breakDescription:'Opis przerwy',whatWorked:'Co działało',whatDidNotWork:'Co nie działało',
    location:'Miejsce treningu',equipmentItems:'Sprzęt domowy',equipmentOther:'Inny sprzęt',standardGym:'Dostęp do standardowej siłowni',gymLimitations:'Ograniczenia siłowni',daysPerWeek:'Dni treningowe w tygodniu',sessionMinutes:'Czas treningu (min)',preferredDays:'Preferowane dni',availability:'Stałość dostępności',availabilityChange:'Zmiana dostępności',upcomingObstacles:'Planowane przeszkody',preferredStartDate:'Preferowana data rozpoczęcia',
    pushUps:'Pompki',bodyweightSquats:'Przysiady z masą ciała',benchPress:'Wyciskanie leżąc',barbellSquat:'Przysiad ze sztangą',pullUps:'Podciąganie',weightKg:'Ciężar (kg)',reps:'Powtórzenia',status:'Status wyniku',otherWorkingSets:'Inne ćwiczenia i serie',
    preferredExercises:'Preferowane ćwiczenia',excludedExercises:'Ćwiczenia wykluczone',trainingStyle:'Preferowany styl treningu',musclePriorities:'Priorytetowe partie mięśniowe',additional:'Dodatkowe informacje',workType:'Rodzaj pracy',dailyActivity:'Aktywność poza treningiem',sleepHours:'Sen',typicalWeek:'Typowy tydzień',consistencyBarriers:'Trudności z regularnością',recovery:'Regeneracja',nutritionRegularity:'Regularność odżywiania',nutritionDifficulties:'Trudności żywieniowe',educationNeeds:'Potrzeby edukacyjne',
    indicators:'Wskaźniki monitorowania',helpChoose:'Pomoc w doborze wskaźników',supportNeeds:'Oczekiwane wsparcie',goal:'Proponowany cel ELITE',metric:'Wskaźnik celu ELITE',metricOther:'Inny wskaźnik',baseline:'Wartość początkowa',target:'Wartość docelowa',unit:'Jednostka pomiaru',measurementMethodChoice:'Metoda pomiaru',measurementMethod:'Metoda pomiaru',conditions:'Warunki pomiaru',tolerance:'Tolerancja',baselineMeasurementDate:'Data pomiaru początkowego',notes:'Uwagi do pomiaru',reportDay:'Dzień raportowania',weeklyReporting:'Gotowość do cotygodniowego raportowania',workoutLog:'Zapisywanie treningów',goalTracking:'Przekazywanie danych celu',reportBarriers:'Trudności z raportowaniem',areas:'Obszary monitorowania',parameters:'Zapisywane parametry',hasBaselineData:'Początkowe wartości',baselineData:'Wartości początkowe',contactDay:'Preferowany dzień kontaktu',
    consent:'Zgoda zdrowotna',pain:'Ból lub uraz',restriction:'Zalecenia ograniczenia aktywności',avoid:'Ruchy / ćwiczenia do unikania',submitted_at:'Data wysłania ankiety'
  };
  const equipmentLabels = { dumbbells:'Hantle',barbell:'Sztanga',bench:'Ławka',rack:'Stojaki / klatka',pullup_bar:'Drążek',bands:'Gumy oporowe',kettlebell:'Kettlebell',mat:'Mata',treadmill:'Bieżnia',stationary_bike:'Rower stacjonarny',elliptical:'Orbitrek',jump_rope:'Skakanka',trx:'TRX',cable_machine:'Wyciąg',none:'Brak sprzętu',other:'Inny sprzęt' };
  const enumLabels = { home:'Dom',gym:'Siłownia',both:'Dom i siłownia',poczatkujacy:'Początkujący',sredniozaawansowany:'Średniozaawansowany',zaawansowany:'Zaawansowany',powrot:'Powrót po przerwie',never:'Nigdy wcześniej',under6:'Poniżej 6 miesięcy','6to12':'6–12 miesięcy','1to2':'1–2 lata','2to5':'2–5 lat',over5:'Powyżej 5 lat',none:'Nie trenowałem',irregular:'Nieregularnie', '1to2':'1–2 razy w tygodniu','3to4':'3–4 razy w tygodniu','5plus':'5 lub więcej razy w tygodniu',poniedzialek:'Poniedziałek',wtorek:'Wtorek',sroda:'Środa',czwartek:'Czwartek',piatek:'Piątek',sobota:'Sobota',niedziela:'Niedziela',redukcja:'Redukcja tkanki tłuszczowej',masa:'Budowa masy mięśniowej',rekompozycja:'Rekompozycja',sila:'Zwiększenie siły',kondycja:'Poprawa kondycji i sprawności',inny:'Inny cel',machines:'Maszyny',free:'Wolne ciężary',mixed:'Trening mieszany',no_preference:'Bez preferencji',sitting:'Siedząca',standing:'Stojąca',physical:'Fizyczna',good:'Dobra',average:'Przeciętna',poor:'Słaba',regular:'Regularna',variable:'Zmienna',unknown:'Nie wiem',workouts:'Realizacja treningów',exerciseProgress:'Postępy w wybranych ćwiczeniach',bodyWeight:'Masa ciała',measurements:'Obwody',strength:'Siła',goal:'Realizacja celu',not_provided:'Nie podano',not_performed:'Nie wykonuję',provided:'Podano wynik',yes:'Tak',no:'Nie',unsure:'Nie wiem',prefer_private:'Wolę omówić prywatnie',to_agree:'Do ustalenia z SYSTEM FORMY'};
  const statusLabels = {
    new_survey:'Nowa ankieta', needs_more_data:'Wymaga uzupełnienia danych', to_analyze:'Do analizy',
    plan_in_progress:'Plan w przygotowaniu', elite_card_pending:'Karta Celu ELITE do uzgodnienia',
    awaiting_acceptance:'Oczekuje na akceptację', completed:'Zrealizowane',
    new:'Nowa ankieta',in_progress:'Plan w przygotowaniu',waiting_client:'Oczekuje na klienta',ready:'Do analizy'
  };
  const cardLabels = { draft:'Robocza',to_agreement:'Do uzgodnienia',approved:'Zatwierdzona' };
  const productGroup = key => key === 'pro' ? 'pro' : key === 'elite' ? 'elite' : key?.startsWith('individual-') ? 'individual' : 'other';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate = value => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pl-PL',{dateStyle:'medium',timeStyle:'short'}).format(date); };
  const formatMoney = (amount,currency='pln') => new Intl.NumberFormat('pl-PL',{style:'currency',currency:String(currency||'pln').toUpperCase()}).format((Number(amount)||0)/100);
  function showOnly(view) { [loginView,dashboardView,fatalView].forEach(item => { item.hidden = item !== view; }); }
  async function api(url, options = {}) {
    const response = await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const data = await response.json().catch(()=>({}));
    if (response.status === 401) { state.selectedOrderRef=null; showOnly(loginView); throw new Error(data.error || 'Sesja wygasła. Zaloguj się ponownie.'); }
    if (!response.ok) throw new Error(data.error || 'Wystąpił błąd. Spróbuj ponownie.');
    return data;
  }

  function renderStats() {
    const orders=state.orders;
    $('#stat-total').textContent=String(orders.length);
    $('#stat-new').textContent=String(orders.filter(o=>['new_survey','new'].includes(o.work_status)).length);
    $('#stat-progress').textContent=String(orders.filter(o=>['plan_in_progress','in_progress','to_analyze'].includes(o.work_status)).length);
    $('#stat-missing').textContent=String(orders.filter(o=>!o.intake_submitted_at).length);
    $('#loaded-count').textContent=String(orders.length);
    $('#results-count').textContent=orders.length ? 'Opłacone zamówienia wymagające ankiety' : 'Brak pasujących klientów';
  }
  function renderOrders() {
    renderStats();
    if (!state.orders.length) { clientList.innerHTML='<div class="empty-state">Nie znaleziono klientów dla wybranych filtrów.<br>Usuń filtr lub zmień wyszukiwaną frazę.</div>'; return; }
    clientList.innerHTML=state.orders.map(order=>{
      const ref=escapeHtml(order.order_ref); const name=order.customer_name || order.customer_email || 'Klient bez danych';
      const submitted=Boolean(order.intake_submitted_at);
      return `<button class="client-row${state.selectedOrderRef===order.order_ref?' active':''}" type="button" data-order-ref="${ref}">
        <span class="client-row-top"><span class="client-name">${escapeHtml(name)}</span><span class="badge badge-status">${escapeHtml(statusLabels[order.work_status]||'Nowa ankieta')}</span></span>
        <span class="client-product">${escapeHtml(order.product_name||order.product_key)} · ${escapeHtml(formatMoney(order.amount_minor,order.currency))}</span>
        <span class="client-email">${escapeHtml(order.customer_email||'Brak e-maila')}</span>
        <span class="client-row-bottom"><span class="badge ${submitted?'badge-ok':'badge-missing'}">${submitted?'Ankieta wypełniona':'Brak ankiety'}</span><span class="row-date">${escapeHtml(formatDate(order.intake_submitted_at||order.paid_at||order.created_at))}</span></span>
      </button>`;
    }).join('');
  }
  function valueForDisplay(value) {
    if (value===null || value===undefined || value==='') return '<span class="data-empty">Nie podano</span>';
    if (typeof value==='boolean') return value?'Tak':'Nie';
    if (Array.isArray(value)) return value.length ? escapeHtml(value.map(item=>equipmentLabels[item]||item).join(', ')) : '<span class="data-empty">Nie podano</span>';
    if (typeof value==='object') {
      const rows=Object.entries(value).filter(([,v])=>v!==null&&v!==undefined&&v!=='');
      if (!rows.length) return '<span class="data-empty">Nie podano</span>';
      return `<div class="data-object">${rows.map(([key,v])=>`<div class="data-object-row"><div>${escapeHtml(labels[key]||key)}</div><div>${valueForDisplay(v)}</div></div>`).join('')}</div>`;
    }
    if (value==='not_provided') return 'Nie podano';
    if (value==='unknown') return 'Nie wiem';
    if (value==='not_performed') return 'Nie wykonuję';
    if (value==='provided') return 'Podano wynik';
    return escapeHtml(value);
  }
  function cell(label,value,wide=false) { return `<div class="data-cell${wide?' wide':''}"><span class="data-label">${escapeHtml(label)}</span><div class="data-value">${valueForDisplay(value)}</div></div>`; }
  function section(title,content) { return `<section class="detail-section"><h3>${escapeHtml(title)}</h3>${content}</section>`; }
  function renderDataSection(title,object) {
    const entries=Object.entries(object||{}).filter(([,v])=>v!==null&&v!==undefined&&v!=='' && !(Array.isArray(v)&&!v.length));
    return section(title,`<div class="data-grid">${entries.map(([key,value])=>cell(labels[key]||key,value,true)).join('')||cell('Odpowiedzi',null,true)}</div>`);
  }
  function getVariant(intake,order) {
    if(order.product_key==='individual-basic') return 'BASIC';
    if(order.product_key==='individual-monitor') return 'MONITORING I WSPARCIE';
    if(order.product_key==='individual-full') return 'KONTROLA TECHNIKI';
    return order.product_name||order.product_key;
  }
  function renderAttachments(files,orderRef) {
    if(!Array.isArray(files)||!files.length) return section('Załączniki','<p class="muted">Nie dodano plików.</p>');
    return section('Załączniki',`<div class="attachment-list">${files.map(file=>`<a class="attachment-link" href="/api/trainer/attachment?order_ref=${encodeURIComponent(orderRef)}&file_id=${encodeURIComponent(file.file_id)}" target="_blank" rel="noopener">${escapeHtml(file.file_name)} <span>(${Math.ceil((file.size_bytes||0)/1024)} KB)</span></a>`).join('')}</div>`);
  }
  function inputField(id,label,value,type='text') { return `<label class="admin-field" for="${id}">${escapeHtml(label)}<input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value||'')}"></label>`; }
  function textareaField(id,label,value) { return `<label class="admin-field" for="${id}">${escapeHtml(label)}<textarea id="${id}" name="${id}" rows="3">${escapeHtml(value||'')}</textarea></label>`; }

  function renderDetail(data) {
    const order=data.order||{}; const intake=data.intake||{}; const profile=intake.profile||{}; const details=intake.productDetails||{};
    const group=productGroup(order.product_key); const isElite=group==='elite';
    const health=intake.health||null; const attachments=intake.attachments||[];
    const content=[];
    content.push(renderDataSection('Dane klienta',{name:profile.name,email:profile.email||order.customer_email,age:profile.age,gender:profile.gender,heightCm:profile.heightCm,bodyWeightKg:profile.bodyWeightKg}));
    content.push(renderDataSection('Cel treningowy',intake.goal||{}));
    content.push(renderDataSection('Doświadczenie treningowe',intake.experience||{}));
    content.push(renderDataSection('Miejsce, sprzęt i organizacja',{...(intake.conditions||{}),...(intake.organization||{})}));
    content.push(renderDataSection('Wyniki testów (opcjonalne)',intake.tests||{}));
    content.push(renderDataSection('Preferencje treningowe',intake.preferences||{}));
    if(group!=='individual') content.push(renderDataSection('Aktywność i regeneracja',intake.lifestyle||{}));
    if(group==='pro') content.push(renderDataSection('Dodatkowe dane SYSTEM PRO',{...(details.progress||{}),zakres:'Kontrola co 2 tygodnie; jedna zaplanowana korekta planu; standardowa kolejność kontaktu.'}));
    if(isElite) content.push(renderDataSection('Dodatkowe dane SYSTEM ELITE',{...(details.elite||{}),zakres:'Cotygodniowe raporty i ich analiza; regularne korekty; priorytetowa kolejność obsługi; podsumowanie po 12 tygodniach.'}));
    if(group==='individual') {
      content.push(renderDataSection(`Dodatkowe dane wariantu ${getVariant(intake,order)}`,details.monitoring||details.basic||{}));
      if(order.product_key==='individual-full') content.push(renderDataSection('Ćwiczenia do kontroli techniki',{ćwiczenia:details.technique||[]}));
    }
    content.push(section('Ograniczenia zdrowotne',health?`<div class="health-review${intake.healthReviewRequired?' required-review':''}">${intake.healthReviewRequired?'<strong>WYMAGA INDYWIDUALNEJ WERYFIKACJI</strong>':''}<div class="data-grid">${cell('Zgoda zdrowotna',health.consent)}${cell('Ból / uraz',health.pain)}${cell('Ograniczenia aktywności',health.restriction)}${cell('Ruchy do unikania',health.avoid,true)}${cell('Opis',health.notes,true)}</div></div>`:'<p class="muted">Klient nie przekazał informacji zdrowotnych (brak zgody lub brak odpowiedzi w tej sekcji).</p>'));
    content.push(renderAttachments(attachments,order.order_ref));
    content.push(section('Kopiowanie i eksport odpowiedzi',`<div class="response-export-actions"><button class="button button-outline" type="button" id="copy-all-responses">KOPIUJ PEŁNE ODPOWIEDZI</button><button class="button button-outline" type="button" id="download-all-responses">POBIERZ JSON ODPOWIEDZI</button></div><p class="save-state" id="response-export-state" role="status"></p>`));
    const meta=data.trainer||{}; const goalCard=data.goalCard||{}; const cardData=goalCard.card_json||details.elite||{};
    const cardFields=isElite?`<div class="detail-section card-admin-section"><h3>Karta Celu ELITE — status i uzgodnienia</h3><p class="muted small">Propozycja klienta nie jest automatycznie zatwierdzona. Oznacz akceptację klienta dopiero po jej uzyskaniu i odnotowaniu poza panelem.</p>
      <div class="admin-fields-grid">
        <label class="admin-field" for="card-status">Status Karty Celu<select id="card-status"><option value="draft">Robocza</option><option value="to_agreement">Do uzgodnienia</option><option value="approved">Zatwierdzona</option></select></label>
        ${inputField('card-metric','Wskaźnik',cardData.metricOther||cardData.metric)}
        ${inputField('card-baseline','Wartość początkowa',typeof cardData.baseline==='object'?cardData.baseline?.value:cardData.baseline)}
        ${inputField('card-target','Wartość docelowa',typeof cardData.target==='object'?cardData.target?.value:cardData.target)}
        ${inputField('card-unit','Jednostka pomiaru',cardData.unit)}
        ${textareaField('card-method','Metoda pomiaru',cardData.measurement_method||cardData.measurementMethod)}
        ${textareaField('card-conditions','Warunki pomiaru',cardData.conditions)}
        ${inputField('card-tolerance','Tolerancja / margines błędu',cardData.tolerance)}
        ${inputField('card-measurement-date','Data pomiaru początkowego',cardData.measurement_date||cardData.baselineMeasurementDate,'date')}
        ${inputField('card-report-day','Dzień raportowania',cardData.report_day||cardData.reportDay)}
        ${inputField('card-start-date','Uzgodniona data rozpoczęcia',goalCard.agreed_start_date,'date')}
      </div>
      <label class="form-consent card-client-accept"><input id="card-client-accepted" type="checkbox" ${goalCard.client_accepted?'checked':''}><span>Potwierdzam, że klient zaakceptował Kartę Celu po uzgodnieniu jej ostatecznych parametrów.</span></label>
      <p class="muted small">Zatwierdzenie wymaga: akceptacji klienta, wartości początkowej i docelowej, metody, warunków oraz tolerancji. Data rozpoczęcia 12 tygodni jest zapisywana osobno.</p>
    </div>`:'';
    detailPanel.innerHTML=`
      <div class="detail-header"><div class="detail-title"><h2>${escapeHtml(profile.name||order.customer_email||'Karta klienta')}</h2><p>${escapeHtml(order.customer_email||profile.email||'Brak e-maila')}</p><div class="detail-order-meta"><span class="meta-chip">${escapeHtml(order.product_name||order.product_key)}</span><span class="meta-chip">${escapeHtml(getVariant(intake,order))}</span><span class="meta-chip">Zamówienie ${escapeHtml(order.order_ref||'')}</span></div></div><div class="detail-price">${escapeHtml(formatMoney(order.amount_minor,order.currency))}</div></div>
      ${section('Metadane zgłoszenia',`<div class="data-grid">${cell('Identyfikator zgłoszenia',intake.submission_id)}${cell('Typ ankiety',intake.survey_type)}${cell('Wysłano',formatDate(intake.submitted_at||order.intake_submitted_at))}${cell('Status ankiety',statusLabels[meta.work_status]||statusLabels.new_survey)}${cell('Brakujące / do ustalenia',intake.missing_fields||[])}</div>`)}
      ${content.join('')}
      <form class="detail-form" id="trainer-edit-form"><h3>Obsługa zgłoszenia</h3>
        <div><label for="work-status">Status realizacji</label><select id="work-status" name="work_status"><option value="new_survey">Nowa ankieta</option><option value="needs_more_data">Wymaga uzupełnienia danych</option><option value="to_analyze">Do analizy</option><option value="plan_in_progress">Plan w przygotowaniu</option><option value="elite_card_pending">Karta Celu ELITE do uzgodnienia</option><option value="awaiting_acceptance">Oczekuje na akceptację</option><option value="completed">Zrealizowane</option></select></div>
        <div><label for="trainer-notes">Notatki trenera (prywatne)</label><textarea id="trainer-notes" name="trainer_notes" maxlength="5000" placeholder="Wpisz ustalenia, uwagi do planu lub kolejne kroki…"></textarea></div>
        ${cardFields}
        <div class="detail-form-footer"><span class="save-state" id="save-state" role="status"></span><button class="button button-primary" type="submit">Zapisz zmiany</button></div>
      </form>
      <section class="detail-section ai-brief-section"><div class="ai-brief-heading"><div><h3>Brief dla agenta AI</h3><p class="muted small">Treść zostanie zbudowana wyłącznie z danych i świadczeń przypisanych do tego zamówienia.</p></div><button class="button button-primary" type="button" id="generate-brief">GENERUJ BRIEF DLA AGENTA AI</button></div><textarea id="ai-brief" rows="18" readonly placeholder="Kliknij „Generuj brief dla agenta AI”."></textarea><div class="brief-copy-row"><span class="save-state" id="brief-copy-state" role="status"></span><button class="button button-outline" type="button" id="copy-brief" disabled>KOPIUJ CAŁY BRIEF</button></div></section>
      <section class="detail-section danger-zone"><h3>Usuwanie danych treningowych</h3><p class="muted small">Usunie ankietę, dane treningowe, notatki, statusy, Kartę Celu ELITE i załączniki. Zamówienie, adres e-mail użyty przy zakupie oraz historia płatności Stripe pozostaną w systemie. Tej operacji nie można cofnąć.</p><button class="button button-danger" type="button" id="delete-client-data">USUŃ DANE TRENINGOWE KLIENTA</button><p class="save-state" id="delete-client-state" role="status"></p></section>`;
    $('#work-status').value=meta.work_status||'new_survey';
    $('#trainer-notes').value=meta.trainer_notes||'';
    if(isElite) $('#card-status').value=goalCard.card_status||'to_agreement';
    const exportData = JSON.stringify({
      order: { order_ref: order.order_ref, product_key: order.product_key, product_name: order.product_name, customer_email: order.customer_email, amount_minor: order.amount_minor, currency: order.currency, intake_submitted_at: order.intake_submitted_at },
      intake
    }, null, 2);
    $('#copy-all-responses').addEventListener('click',async()=>{
      const stateLabel=$('#response-export-state');
      try { await navigator.clipboard.writeText(exportData); stateLabel.textContent='Pełne odpowiedzi skopiowano do schowka.'; stateLabel.className='save-state success'; }
      catch { stateLabel.textContent='Schowek jest niedostępny w tej przeglądarce. Użyj opcji pobrania JSON.'; stateLabel.className='save-state error'; }
    });
    $('#download-all-responses').addEventListener('click',()=>{
      const blob=new Blob([exportData],{type:'application/json;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a');
      link.href=url; link.download=`system-formy-${String(order.order_ref||'zamowienie').replace(/[^a-z0-9-]/gi,'')}-ankieta.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      const stateLabel=$('#response-export-state'); stateLabel.textContent='Przygotowano plik JSON z pełnymi odpowiedziami.'; stateLabel.className='save-state success';
    });
    $('#trainer-edit-form').addEventListener('submit',saveTrainerMeta);
    $('#generate-brief').addEventListener('click',()=>{
      $('#ai-brief').value=buildBrief(intake,order,data.goalCard||{});
      $('#copy-brief').disabled=false;
      $('#brief-copy-state').textContent='Brief wygenerowany. Sprawdź dane przed przekazaniem agentowi.';
    });
    $('#copy-brief').addEventListener('click',async()=>{
      const text=$('#ai-brief').value;
      if(!text) return;
      try { await navigator.clipboard.writeText(text); $('#brief-copy-state').textContent='Skopiowano do schowka.'; }
      catch { $('#ai-brief').focus(); $('#ai-brief').select(); $('#brief-copy-state').textContent='Zaznaczony tekst możesz skopiować ręcznie.'; }
    });
    $('#delete-client-data').addEventListener('click',async()=>{
      const status=$('#delete-client-state');
      const confirmed=window.confirm('Czy na pewno usunąć dane treningowe tego klienta? Zamówienie i historia płatności pozostaną. Tej operacji nie można cofnąć.');
      if(!confirmed) return;
      const phrase=window.prompt('Aby potwierdzić, wpisz dokładnie: USUŃ DANE');
      if(phrase!=='USUŃ DANE') { status.textContent='Usuwanie anulowane — wpisano nieprawidłowe potwierdzenie.'; status.className='save-state error'; return; }
      const button=$('#delete-client-data'); button.disabled=true; status.textContent='Usuwanie danych i plików…'; status.className='save-state';
      try {
        await api('/api/trainer/delete-client-data',{method:'DELETE',body:JSON.stringify({order_ref:order.order_ref,confirmation:phrase})});
        status.textContent='Dane treningowe zostały usunięte. Zamówienie i płatność zachowano.'; status.className='save-state success';
        state.selectedOrderRef=null;
        await loadOrders();
        detailPanel.innerHTML='<div class="detail-placeholder"><div class="placeholder-icon">SF</div><h2>Dane treningowe usunięte</h2><p class="muted">Zamówienie i historia płatności pozostały w systemie.</p></div>';
      } catch(error) { status.textContent=error.message; status.className='save-state error'; button.disabled=false; }
    });
  }

  function fmt(value) {
    if(value===null||value===undefined||value==='') return 'Nie podano';
    if(Array.isArray(value)) return value.length?value.map(item=>equipmentLabels[item]||enumLabels[item]||item).join(', '):'Nie podano';
    if(typeof value==='object') {
      const parts=Object.entries(value).map(([key,v])=>`${labels[key]||key}: ${fmt(v)}`);
      return parts.length?parts.join('; '):'Nie podano';
    }
    if(value==='not_provided') return 'Nie podano';
    if(value==='unknown') return 'Nie wiem';
    if(value==='not_performed') return 'Nie wykonuję';
    if(value==='provided') return 'Podano';
    return enumLabels[value] || String(value);
  }
  function briefSection(title,rows) { return `\n${title.toUpperCase()}\n${rows.map(([label,value])=>`${label}: ${fmt(value)}`).join('\n')}`; }
  function buildBrief(intake,order,goalCard) {
    const group=productGroup(order.product_key); const profile=intake.profile||{}; const goal=intake.goal||{}; const ex=intake.experience||{}; const cond=intake.conditions||{}; const org=intake.organization||{}; const tests=intake.tests||{}; const prefs=intake.preferences||{}; const life=intake.lifestyle||{}; const product=intake.productDetails||{};
    let output=`SYSTEM FORMY — DANE KLIENTA\nRODZAJ PRODUKTU: ${order.product_name||order.product_key}\nWARIANT: ${getVariant(intake,order)}\nCZAS PLANU: ${group==='elite'?'12 tygodni':group==='pro'?'8 tygodni':'4 tygodnie'}\nIDENTYFIKATOR ZGŁOSZENIA: ${intake.submission_id||'Nie podano'}\nIDENTYFIKATOR ZAMÓWIENIA: ${order.order_ref||'Nie podano'}`;
    output+=briefSection('Dane klienta',[['Imię i nazwisko',profile.name],['E-mail',profile.email||order.customer_email],['Wiek',profile.age],['Wzrost (cm)',profile.heightCm],['Płeć',profile.gender],['Masa ciała (kg)',profile.bodyWeightKg]]);
    output+=briefSection('Cel',[['Główny cel',goal.primary],['Opis celu',goal.description],['Cel dodatkowy',goal.secondary],['Mierzalny cel dodatkowy',goal.measurable],['Dlaczego cel jest ważny',goal.why],['Oczekiwane efekty po 12 tygodniach',goal.desired12Weeks],['Priorytetowe partie mięśniowe',goal.musclePriorities]]);
    output+=briefSection('Doświadczenie',[['Poziom',ex.level],['Staż treningowy',ex.tenure],['Regularność',ex.regularity],['Historia treningowa',ex.trainingHistory],['Wcześniejszy plan indywidualny',ex.individualizedPlan],['Czy aktualnie realizuje plan',ex.hasCurrentPlan],['Trening w ostatnich 3 miesiącach',ex.recentTraining],['Regularne ćwiczenia',ex.regularExercises],['Aktualny plan',ex.currentPlanDescription],['Dłuższe przerwy',ex.longBreak],['Opis przerw',ex.breakDescription],['Co działało',ex.whatWorked],['Co nie działało',ex.whatDidNotWork]]);
    output+=briefSection('Warunki treningowe',[['Miejsce',cond.location],['Sprzęt domowy',cond.equipmentItems],['Inny sprzęt',cond.equipmentOther],['Standardowa siłownia',cond.standardGym],['Ograniczenia wyposażenia siłowni',cond.gymLimitations],['Treningi w tygodniu',org.daysPerWeek],['Czas sesji (min)',org.sessionMinutes],['Dostępne dni',org.preferredDays],['Zmienność dostępności',org.availability],['Czy dostępność zmieni się w okresie współpracy',org.availabilityChange],['Planowane przeszkody',org.upcomingObstacles],['Preferowany start',org.preferredStartDate]]);
    output+=briefSection('Wyniki testów',[['Testy domowe',tests.home],['Testy siłowniane',tests.gym],['Inne serie i ćwiczenia',prefs.otherWorkingSets]]);
    output+=briefSection('Preferencje',[['Preferowane ćwiczenia',prefs.preferredExercises],['Ćwiczenia wykluczone',prefs.excludedExercises],['Styl treningu',prefs.trainingStyle],['Priorytetowe partie',prefs.musclePriorities],['Dodatkowe uwagi',prefs.additional]]);
    if(group!=='individual') output+=briefSection('Aktywność i regeneracja',[['Rodzaj pracy',life.workType],['Aktywność poza treningiem',life.dailyActivity],['Sen',life.sleepHours],['Typowy tydzień',life.typicalWeek],['Trudności z regularnością',life.consistencyBarriers],['Regeneracja',life.recovery],['Regularność odżywiania',life.nutritionRegularity],['Trudności żywieniowe',life.nutritionDifficulties],['Potrzeby edukacyjne',life.educationNeeds]]);
    const health=intake.health;
    output+=briefSection('Ograniczenia i bezpieczeństwo',[['Informacje zdrowotne',health?`Zgoda udzielona; ból/uraz: ${fmt(health.pain)}; ograniczenia: ${fmt(health.restriction)}; ruchy: ${fmt(health.avoid)}; opis: ${fmt(health.notes)}`:'Klient nie wyraził zgody i nie przekazał danych zdrowotnych.'],['Wymaga indywidualnej weryfikacji',intake.healthReviewRequired?'TAK — nie dobieraj obciążających ćwiczeń do czasu wyjaśnienia ograniczeń.':'Nie wynika z odpowiedzi.']]);
    if(group==='pro') {
      const p=product.progress||{};
      output+=briefSection('Dodatkowe dane SYSTEM PRO',[['Wskaźniki kontroli co 2 tygodnie',p.indicators],['Pomoc w doborze wskaźników',p.helpChoose],['Inny wskaźnik',p.other],['Potrzeby wsparcia',p.supportNeeds],['Zakres kontaktu','Standardowa kolejność obsługi'],['Kontrola postępów','Co 2 tygodnie'],['Korekty planu','Jedna zaplanowana korekta w całym 8-tygodniowym okresie']]);
    } else if(group==='elite') {
      const e=product.elite||{}; const saved=goalCard.card_json||{}; const c={...e,...saved};
      output+=briefSection('Dodatkowe dane SYSTEM ELITE',[['Proponowany główny cel',c.goal],['Wskaźnik',c.metricOther||c.metric],['Wartość początkowa',typeof c.baseline==='object'?(c.baseline?.value||(c.baseline?.status==='help'?'Do ustalenia':'Nie podano')):c.baseline],['Wartość docelowa',typeof c.target==='object'?(c.target?.value||(c.target?.status==='help'?'Do ustalenia':'Nie podano')):c.target],['Jednostka',c.unit],['Metoda pomiaru',c.measurement_method|| (c.measurementMethodChoice==='to_agree'?'Do ustalenia z SYSTEM FORMY':c.measurementMethod)],['Warunki pomiaru',c.conditions],['Tolerancja',c.tolerance],['Data pomiaru początkowego',c.measurement_date||c.baselineMeasurementDate],['Preferowany dzień raportowania',c.report_day||c.reportDay],['Status Karty Celu',cardLabels[goalCard.card_status||c.status]||'Do uzgodnienia'],['Uzgodniona data rozpoczęcia 12 tygodni',goalCard.agreed_start_date],['Cotygodniowe raportowanie',c.weeklyReporting],['Zapisywanie wykonanych treningów',c.workoutLog],['Przekazywanie danych celu',c.goalTracking],['Przeszkody w raportowaniu',c.reportBarriers]]);
      if((goalCard.card_status||'to_agreement')!=='approved') output+='\nUWAGA: KARTA CELU NIE JEST ZATWIERDZONA. OZNACZ „DO UZGODNIENIA”. Nie traktuj propozycji ankietowej jako automatycznie uzgodnionego celu gwarancji.';
      output+='\nZakres ELITE: cotygodniowe raporty i ich analiza, regularne korekty planu, priorytetowa kolejność obsługi, analiza trudności i podsumowanie po 12 tygodniach. Nie obiecuj konkretnej utraty masy, przyrostu mięśni ani wyglądu.';
    } else if(order.product_key==='individual-basic') {
      output+='\nZAKRES PLANU INDYWIDUALNEGO BASIC\nIndywidualny plan na 4 tygodnie, instrukcje i zasady realizacji. Bez monitoringu, konsultacji, czatu i kontroli techniki po przekazaniu planu. Nie projektuj elementów spoza tego wariantu.';
    } else {
      const v=product.monitoring||{};
      output+=briefSection('Dodatkowe dane planu indywidualnego — monitoring',[['Obszary monitorowania',v.areas],['Parametry do zapisywania',v.parameters],['Początkowe wartości dostępne',v.hasBaselineData],['Wartości początkowe',v.baselineData],['Preferowany dzień kontaktu',v.contactDay],['Oczekiwane wsparcie',v.supportNeeds]]);
      if(order.product_key==='individual-monitor') output+='\nZakres MONITORING: indywidualny plan, monitoring i wsparcie przez 4 tygodnie. Nie zakładaj automatycznie cotygodniowych raportów ani z góry określonej częstotliwości kontaktu.';
      else {
        output+=briefSection('Ćwiczenia do kontroli techniki',[['Ćwiczenia i wskazane trudności',product.technique||[]]]);
        output+='\nZakres KONTROLA TECHNIKI: monitoring i wsparcie przez 4 tygodnie oraz kontrola techniki na podstawie uzgodnionych nagrań wskazanych ćwiczeń. Nagrania nie zostały wymagane na etapie ankiety.';
      }
    }
    output+='\nZADANIE DLA AGENTA\nPrzygotuj plan wyłącznie w zakresie zakupionego produktu. Nie wymyślaj brakujących danych. Jeżeli brakuje informacji krytycznych, najpierw zadaj konkretne pytania uzupełniające. Nie generuj jadłospisu, indywidualnej diety, suplementacji ani porad medycznych. Nie diagnozuj urazów. Nie ignoruj ograniczeń ani zaleceń medycznych. W przypadku niejasnego lub istotnego ograniczenia zdrowotnego wstrzymaj dobór obciążających ćwiczeń i wskaż konieczność indywidualnej weryfikacji przez odpowiedniego specjalistę. Testy są orientacyjne i nie uprawniają do wyznaczania ciężarów automatycznie. Nie wymagaj prób 1RM.';
    return output;
  }

  async function loadOrders() {
    const params=new URLSearchParams(); const query=$('#search-input').value.trim(); const intake=$('#intake-filter').value; const workStatus=$('#status-filter').value;
    if(query) params.set('q',query); if(intake) params.set('intake',intake); if(workStatus) params.set('work_status',workStatus); if(state.productFilter!=='all') params.set('product_group',state.productFilter);
    clientList.classList.add('loading');
    try {
      const data=await api(`/api/trainer/orders?${params.toString()}`); state.orders=Array.isArray(data.orders)?data.orders:[]; renderOrders();
      if(state.selectedOrderRef&&state.orders.some(o=>o.order_ref===state.selectedOrderRef)) await openOrder(state.selectedOrderRef,false);
      else if(state.selectedOrderRef){state.selectedOrderRef=null;detailPanel.innerHTML='<div class="detail-placeholder"><div class="placeholder-icon">SF</div><h2>Wybierz klienta</h2><p class="muted">Wybierz osobę z listy, aby otworzyć jej kartę.</p></div>';}
    } catch(error){clientList.innerHTML=`<div class="empty-state">${escapeHtml(error.message)}</div>`;}
    finally{clientList.classList.remove('loading');}
  }
  async function openOrder(orderRef,refreshList=true) {
    state.selectedOrderRef=orderRef; if(refreshList) renderOrders(); detailPanel.classList.add('loading'); detailPanel.innerHTML='<div class="empty-state">Otwieranie karty klienta…</div>';
    try {const data=await api(`/api/trainer/order?order_ref=${encodeURIComponent(orderRef)}`);renderDetail(data);if(window.matchMedia('(max-width: 760px)').matches)detailPanel.scrollIntoView({behavior:'smooth',block:'start'});}
    catch(error){detailPanel.innerHTML=`<div class="empty-state">${escapeHtml(error.message)}</div>`;}
    finally{detailPanel.classList.remove('loading');}
  }
  async function saveTrainerMeta(event) {
    event.preventDefault(); const button=$('#trainer-edit-form button[type="submit"]');const status=$('#save-state');button.disabled=true;status.className='save-state';status.textContent='Zapisywanie…';
    const body={order_ref:state.selectedOrderRef,work_status:$('#work-status').value,trainer_notes:$('#trainer-notes').value};
    const cardStatus=$('#card-status');
    if(cardStatus) body.goal_card={card_status:cardStatus.value,client_accepted:$('#card-client-accepted').checked,metric:$('#card-metric').value,baseline:$('#card-baseline').value,target:$('#card-target').value,unit:$('#card-unit').value,measurement_method:$('#card-method').value,conditions:$('#card-conditions').value,tolerance:$('#card-tolerance').value,measurement_date:$('#card-measurement-date').value,report_day:$('#card-report-day').value,agreed_start_date:$('#card-start-date').value};
    try {await api('/api/trainer/order',{method:'PATCH',body:JSON.stringify(body)});status.className='save-state success';status.textContent='Zapisano zmiany.';await loadOrders();}
    catch(error){status.className='save-state error';status.textContent=error.message;}
    finally{button.disabled=false;}
  }
  async function startDashboard(){showOnly(dashboardView);detailPanel.innerHTML='<div class="detail-placeholder"><div class="placeholder-icon">SF</div><h2>Wybierz klienta</h2><p class="muted">Kliknij osobę z listy, aby otworzyć jej kartę.</p></div>';await loadOrders();}
  async function loadReviews() {
    if (!reviewsList) return;
    reviewsList.innerHTML = '<div class="empty-state">Pobieranie opinii…</div>';
    try {
      const data = await api('/api/trainer/reviews');
      state.reviews = Array.isArray(data.reviews) ? data.reviews : [];
      renderAdminReviews();
    } catch (error) {
      reviewsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }
  function renderAdminReviews() {
    const filter = $('#reviews-status-filter')?.value || 'all';
    const rows = state.reviews.filter(review => filter === 'all' || review.status === filter);
    const labels = { pending: 'NIEZWERYFIKOWANA', verified: 'ZWERYFIKOWANA', rejected: 'ODRZUCONA' };
    if (!rows.length) {
      reviewsList.innerHTML = '<div class="empty-state">Brak opinii w wybranym widoku.</div>';
      return;
    }
    reviewsList.innerHTML = rows.map(review => `
      <article class="admin-review-card">
        <div class="admin-review-meta"><strong>${escapeHtml(review.author)}</strong><span>${escapeHtml(formatDate(review.created_at))}</span></div>
        <p>${escapeHtml(review.review)}</p>
        <div class="admin-review-meta"><span class="admin-review-status ${escapeHtml(review.status)}">${labels[review.status] || escapeHtml(review.status)}</span><span>Zgoda na publikację: ${review.consent_publication ? 'TAK' : 'NIE'}</span></div>
        <div class="admin-review-actions">
          ${review.status !== 'verified' ? `<button class="button button-primary" type="button" data-review-action="verified" data-review-id="${escapeHtml(review.review_id)}">ZWERYFIKUJ I PUBLIKUJ</button>` : ''}
          ${review.status !== 'rejected' ? `<button class="button button-outline" type="button" data-review-action="rejected" data-review-id="${escapeHtml(review.review_id)}">ODRZUĆ</button>` : ''}
          <button class="button button-danger" type="button" data-review-delete="${escapeHtml(review.review_id)}">USUŃ</button>
        </div>
      </article>`).join('');
  }
  function showDashboardTab(tab) {
    state.dashboardTab = tab;
    $$('[data-dashboard-tab]').forEach(button => button.classList.toggle('active', button.dataset.dashboardTab === tab));
    if (workspace) workspace.hidden = tab !== 'clients';
    if (statsGrid) statsGrid.hidden = tab !== 'clients';
    if (reviewsView) reviewsView.hidden = tab !== 'reviews';
    if (tab === 'reviews') loadReviews();
    else loadOrders();
  }

  async function boot(){
    try {const response=await fetch('/api/trainer/session',{credentials:'same-origin',cache:'no-store'});if(response.status===503){$('#fatal-message').textContent='Brakuje konfiguracji panelu lub wymaganej migracji bazy. Ustaw sekrety i wykonaj migrację D1.';showOnly(fatalView);return;}const data=await response.json();if(data.authenticated)await startDashboard();else showOnly(loginView);}
    catch{$('#fatal-message').textContent='Nie udało się połączyć z API panelu. Sprawdź deployment Cloudflare Pages.';showOnly(fatalView);}
  }
  $('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#login-form button[type="submit"]');const error=$('#login-error');button.disabled=true;button.textContent='Sprawdzanie…';error.textContent='';try{await api('/api/trainer/login',{method:'POST',body:JSON.stringify({password:$('#trainer-password').value})});$('#trainer-password').value='';await startDashboard();}catch(err){error.textContent=err.message;}finally{button.disabled=false;button.textContent='Zaloguj się';}});
  $('#logout-button').addEventListener('click',async()=>{try{await fetch('/api/trainer/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});}catch{}state.orders=[];state.selectedOrderRef=null;showOnly(loginView);});
  $('#refresh-button').addEventListener('click',loadOrders);
  $('#client-list').addEventListener('click',event=>{const button=event.target.closest('[data-order-ref]');if(button)openOrder(button.dataset.orderRef);});
  $('#search-input').addEventListener('input',()=>{clearTimeout(state.debounce);state.debounce=setTimeout(loadOrders,250);});
  $('#intake-filter').addEventListener('change',loadOrders);$('#status-filter').addEventListener('change',loadOrders);
  $$('.product-tab').forEach(button=>button.addEventListener('click',()=>{state.productFilter=button.dataset.productFilter;$$('.product-tab').forEach(tab=>tab.classList.toggle('active',tab===button));loadOrders();}));
  $$('[data-dashboard-tab]').forEach(button => button.addEventListener('click', () => showDashboardTab(button.dataset.dashboardTab)));
  $('#refresh-reviews')?.addEventListener('click', loadReviews);
  $('#reviews-status-filter')?.addEventListener('change', renderAdminReviews);
  reviewsList?.addEventListener('click', async event => {
    const action = event.target.closest('[data-review-action]');
    const remove = event.target.closest('[data-review-delete]');
    if (action) {
      action.disabled = true;
      try {
        await api('/api/trainer/reviews', { method: 'PATCH', body: JSON.stringify({ review_id: action.dataset.reviewId, status: action.dataset.reviewAction }) });
        await loadReviews();
      } catch (error) { window.alert(error.message); action.disabled = false; }
    } else if (remove) {
      if (!window.confirm('Usunąć tę opinię z bazy danych? Tej operacji nie można cofnąć.')) return;
      remove.disabled = true;
      try {
        await api(`/api/trainer/reviews?review_id=${encodeURIComponent(remove.dataset.reviewDelete)}`, { method: 'DELETE' });
        await loadReviews();
      } catch (error) { window.alert(error.message); remove.disabled = false; }
    }
  });
  boot();
})();
