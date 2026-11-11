(() => {
  'use strict';

  // Darmowa ankieta jako quiz (/ankieta.html) → POST /api/zgloszenie.
  // Po zapisie od razu pokazujemy wskazówki dopasowane do odpowiedzi + ebook.
  const form = document.querySelector('#lead-form');
  const result = document.querySelector('#lead-success');
  const intro = document.querySelector('#quiz-intro');
  const status = document.querySelector('#lead-status');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!form || !result) return;

  const TOTAL = 7;
  const steps = [...form.querySelectorAll('.quiz-step')];
  const progressBar = document.querySelector('#quiz-progress-bar');
  const stepCount = document.querySelector('#quiz-step-count');
  const backButton = document.querySelector('#quiz-back');
  const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;

  // Źródło: z którego przycisku na stronie przyszła osoba (?zakres=pro|elite|plan). Bez parametru: ankieta ogólna.
  const presetMap = { pro: 'pro', elite: 'elite', plan: 'plan', plany: 'plan' };
  const zakres = presetMap[new URLSearchParams(location.search).get('zakres')] || 'niewiem';

  const FIELD_STEP = { cel: 1, doswiadczenie: 2, miejsce: 3, dni: 4, wiek: 5, wzrost_cm: 5, waga_kg: 5, inwestycja: 6, imie: 7, email: 7, zgoda_przetwarzanie: 7 };
  const MESSAGES = {
    cel: 'Wybierz główny cel.',
    doswiadczenie: 'Wybierz, jak długo trenujesz.',
    miejsce: 'Wybierz, gdzie trenujesz.',
    dni: 'Wybierz liczbę dni.',
    wiek: 'Podaj wiek (16–90 lat).',
    wzrost_cm: 'Podaj wzrost w cm (120–230).',
    waga_kg: 'Podaj wagę w kg (35–300).',
    inwestycja: 'Wybierz Tak albo Nie.',
    imie: 'Podaj imię (min. 2 znaki).',
    email: 'Podaj poprawny adres e-mail.',
    zgoda_przetwarzanie: 'Zaznacz zgodę, żebym mógł przygotować i wysłać wskazówki.'
  };

  // ---------- Anonimowy licznik kroków (bez danych osobowych i bez cookies) ----------
  const tracked = new Set();
  function track(step) {
    if (tracked.has(step)) return;
    tracked.add(step);
    try {
      fetch('/api/ankieta-krok', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ krok: step })
      }).catch(() => {});
    } catch { /* licznik nie może blokować ankiety */ }
  }

  // ---------- Odczyt pól ----------
  const value = name => {
    const field = form.elements[name];
    if (!field) return '';
    if (field instanceof RadioNodeList) return field.value || '';
    if (field.type === 'checkbox') return field.checked;
    return String(field.value || '').trim();
  };
  const intIn = (raw, min, max) => { const n = Number(raw); return raw !== '' && Number.isInteger(n) && n >= min && n <= max; };
  const weight = () => Number(String(value('waga_kg')).replace(',', '.'));

  function setError(name, text) {
    const el = form.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = text || '';
    form.querySelectorAll(`[name="${name}"]`).forEach(field => {
      if (text) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    });
  }
  function clearFieldError(event) {
    if (!event.target.name) return;
    setError(event.target.name, '');
    if (status.classList.contains('is-error')) { status.textContent = ''; status.classList.remove('is-error'); }
  }
  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);

  function errorsFor(stepNumber) {
    const e = {};
    if (stepNumber === 1 && !value('cel')) e.cel = MESSAGES.cel;
    if (stepNumber === 2 && !value('doswiadczenie')) e.doswiadczenie = MESSAGES.doswiadczenie;
    if (stepNumber === 3 && !value('miejsce')) e.miejsce = MESSAGES.miejsce;
    if (stepNumber === 4 && !value('dni')) e.dni = MESSAGES.dni;
    if (stepNumber === 5) {
      if (!intIn(value('wiek'), 16, 90)) e.wiek = MESSAGES.wiek;
      if (!intIn(value('wzrost_cm'), 120, 230)) e.wzrost_cm = MESSAGES.wzrost_cm;
      const w = weight();
      if (!value('waga_kg') || !Number.isFinite(w) || w < 35 || w > 300) e.waga_kg = MESSAGES.waga_kg;
    }
    if (stepNumber === 6 && !value('inwestycja')) e.inwestycja = MESSAGES.inwestycja;
    if (stepNumber === 7) {
      if (value('imie').length < 2) e.imie = MESSAGES.imie;
      if (!EMAIL_RE.test(value('email'))) e.email = MESSAGES.email;
      if (!value('zgoda_przetwarzanie')) e.zgoda_przetwarzanie = MESSAGES.zgoda_przetwarzanie;
    }
    return e;
  }

  // ---------- Nawigacja ----------
  let current = 1;
  function show(stepNumber, { focus = true } = {}) {
    current = stepNumber;
    steps.forEach(step => {
      const active = Number(step.dataset.step) === stepNumber;
      step.hidden = !active;
      step.classList.toggle('is-entering', active);
    });
    if (progressBar) progressBar.style.width = `${Math.round(((stepNumber - 1) / TOTAL) * 100)}%`;
    if (stepCount) stepCount.textContent = stepNumber === TOTAL ? 'OSTATNI KROK' : `PYTANIE ${stepNumber} Z ${TOTAL - 1}`;
    if (backButton) backButton.hidden = stepNumber === 1;
    if (intro) intro.hidden = stepNumber > 1;
    status.textContent = '';
    status.classList.remove('is-error');
    track(stepNumber === 1 ? 'wejscie' : `krok${stepNumber}`);
    if (stepNumber > 1 && focus) {
      form.scrollIntoView({ block: 'start', behavior: 'smooth' });
      const target = form.querySelector(`.quiz-step[data-step="${stepNumber}"] legend`);
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  }

  function next() {
    const errors = errorsFor(current);
    const names = Object.keys(errors);
    if (names.length) {
      names.forEach(name => setError(name, errors[name]));
      form.querySelector(`[name="${names[0]}"]`)?.focus();
      return;
    }
    if (current < TOTAL) show(current + 1);
  }

  // Kafelki: wybór od razu przechodzi dalej.
  // „click” obsługuje też ponowne tapnięcie już zaznaczonej odpowiedzi po cofnięciu się.
  let advanceTimer = null;
  function scheduleAdvance(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio' || !input.checked) return;
    const stepNumber = Number(input.closest('.quiz-step')?.dataset.step);
    if (stepNumber !== current) return;
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => { if (current === stepNumber) next(); }, 220);
  }
  form.addEventListener('change', scheduleAdvance);
  form.addEventListener('click', scheduleAdvance);
  form.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', next));
  backButton?.addEventListener('click', () => { if (current > 1) show(current - 1); });

  // ---------- Wskazówki ----------
  const LABELS = {
    cel: { redukcja: 'Redukcja', masa: 'Budowa masy', sylwetka: 'Lepsza sylwetka', sila: 'Więcej siły', kondycja: 'Lepsza kondycja', powrot: 'Powrót po przerwie', inne: 'Inny cel' },
    doswiadczenie: { poczatkujacy: 'Początkujący', do1roku: 'Do 1 roku treningu', '1do3lat': '1–3 lata treningu', powyzej3lat: 'Ponad 3 lata treningu', powrot: 'Powrót po przerwie' },
    miejsce: { dom: 'Dom', silownia: 'Siłownia', oba: 'Dom i siłownia' }
  };
  const DAY_NAMES = ['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'];
  const WEEK = {
    1: ['', '', 'FBW', '', '', '', ''],
    2: ['A', '', '', 'B', '', '', ''],
    3: ['A', '', 'B', '', 'C', '', ''],
    4: ['GÓRA', 'DÓŁ', '', 'GÓRA', 'DÓŁ', '', ''],
    5: ['GÓRA', 'DÓŁ', '', 'GÓRA', 'DÓŁ', 'FBW', ''],
    6: ['PUSH', 'PULL', 'NOGI', 'PUSH', 'PULL', 'NOGI', ''],
    7: ['PUSH', 'PULL', 'NOGI', 'PUSH', 'PULL', 'NOGI', '']
  };
  const WEEK_TEXT = {
    1: '1 trening całego ciała (FBW) w tygodniu. To dobre minimum, żeby utrzymać nawyk. Jeśli tylko możesz, dołóż drugi dzień — dwa treningi tygodniowo dają dużo więcej miejsca na progres.',
    2: '2 treningi całego ciała (FBW): A i B, z co najmniej 1–2 dniami przerwy między nimi. Każda partia pracuje 2 razy w tygodniu.',
    3: '3 treningi całego ciała: A, B i C, z dniem przerwy po każdym. Prosty i skuteczny układ, który łatwo utrzymać.',
    4: 'Góra / dół ciała, każdy 2 razy w tygodniu. Każda partia pracuje dwa razy, a Ty masz czas na regenerację.',
    5: 'Góra / dół 2 razy + 1 trening całego ciała. Piąty trening może być lżejszy — na słabsze partie albo technikę.',
    6: 'Push / Pull / Nogi (pchanie, przyciąganie, nogi) 2 razy w tygodniu. Jeden dzień zostaw na pełną regenerację.',
    7: 'Push / Pull / Nogi 2 razy w tygodniu. Nawet jeśli masz czas codziennie, zostaw 1 dzień bez treningu siłowego — na spacer i regenerację. Zmiana zachodzi, kiedy odpoczywasz.'
  };
  const PROGRESS = {
    poczatkujacy: [
      'Podwójna progresja: wybierz zakres, np. 8–12 powtórzeń w 2–3 seriach. Ten sam ciężar — dokładaj powtórzenia. Gdy zrobisz górę zakresu we wszystkich seriach, zwiększ ciężar o najmniejszy krok.',
      'Kończ serie z 2–3 powtórzeniami w zapasie. Ostatnie powtórzenie ma wyglądać jak pierwsze.',
      'Pierwsze 2 tygodnie traktuj jako naukę ruchów, a nie pogoń za rekordami.'
    ],
    do1roku: [
      'Podwójna progresja: ten sam ciężar, dokładaj powtórzenia w zakresie (np. 8–12). Gdy zrobisz górę zakresu we wszystkich seriach — dołóż najmniejszy możliwy ciężar.',
      'Zapisuj każdy trening: ćwiczenie, ciężar, serie, powtórzenia. Bez zapisu nie wiesz, czy robisz postęp.',
      'Trzymaj te same ćwiczenia główne przez min. 4–6 tygodni, zamiast zmieniać je co tydzień.'
    ],
    '1do3lat': [
      'Postęp nie będzie już co trening. Oceniaj trend w ćwiczeniach głównych co 2–4 tygodnie.',
      'Wybierz 1–2 ćwiczenia główne na partię i pracuj na nich przez cały blok 4–8 tygodni.',
      'Gdy wyniki stoją, a zmęczenie rośnie, zrób lżejszy tydzień (mniej serii), zamiast dokładać.'
    ],
    powyzej3lat: [
      'Pracuj w blokach 4–8 tygodni z jednym priorytetem (np. siła w przysiadzie albo rozbudowa pleców).',
      'Przy stagnacji zmieniaj jedną rzecz naraz — liczbę serii, zakres powtórzeń albo ćwiczenie — i oceniaj po kilku tygodniach.',
      'Planuj lżejsze tygodnie, zanim zmęczenie zacznie obniżać wyniki.'
    ],
    powrot: [
      'Zacznij wyraźnie lżej niż kiedyś — np. ok. 60–70% dawnych ciężarów — i pełnym zakresem ruchu.',
      'Przez pierwsze 2 tygodnie kończ serie z ok. 3 powtórzeniami w zapasie. Potem dokładaj stopniowo.',
      'W pierwszym miesiącu nie porównuj się do formy sprzed przerwy. Porównuj tydzień 1 z tygodniem 4.'
    ]
  };
  const MISTAKES = {
    redukcja: [
      'Rezygnacja z treningu siłowego na rzecz samego cardio. Trening siłowy pomaga zachować mięśnie, kiedy chudniesz.',
      'Zbyt duże cięcie jedzenia na start. Spada energia, a razem z nią regularność.',
      'Ocenianie efektów po jednym ważeniu. Waga waha się z dnia na dzień — patrz na średnią z tygodnia.'
    ],
    masa: [
      'Brak progresji — ten sam ciężar i te same powtórzenia przez tygodnie.',
      'Jedzenie „na oko”. Bez lekkiej nadwyżki kalorii masa rośnie bardzo wolno albo wcale.',
      'Za mało snu i za dużo naraz. Mięśnie rosną, kiedy się regenerujesz, a nie w trakcie treningu.'
    ],
    sylwetka: [
      'Zmiana planu co tydzień. Nic nie trwa na tyle długo, żeby było widać, co działa.',
      'Patrzenie tylko na wagę. Przy poprawie sylwetki waga może stać, a talia i zdjęcia się zmieniają.',
      'Za mało białka w posiłkach.'
    ],
    sila: [
      'Za krótkie przerwy w ćwiczeniach głównych. Daj sobie ok. 2–3 minuty między seriami.',
      'Gonienie ciężaru kosztem techniki. Powtórzenie, które wygląda inaczej, to nie progres.',
      'Za dużo ćwiczeń. Mniej, a lepiej — skup się na kilku ćwiczeniach głównych.'
    ],
    kondycja: [
      'Każdy trening w tym samym, „średnio ciężkim” tempie. Mieszaj spokojne, dłuższe wysiłki z krótszymi i mocniejszymi.',
      'Pomijanie treningu siłowego. Silniejsze mięśnie to lepsza wydolność i mniej przeciążeń.',
      'Za duży skok na start. Dokładaj czas lub dystans stopniowo, tydzień po tygodniu.'
    ],
    powrot: [
      'Powrót do dawnych ciężarów od pierwszego treningu.',
      'Nadrabianie przerwy dodatkowymi treningami. Opuszczony trening? Wróć do kolejnego zaplanowanego.',
      'Za dużo dni na start. Lepiej 2–3 treningi, które utrzymasz, niż 5, które rzucisz po tygodniu.'
    ],
    inne: [
      'Zmiana planu za szybko. Daj mu min. 4–6 tygodni.',
      'Wszystko naraz — więcej ćwiczeń, serii i dni jednocześnie.',
      'Trening „na czuja”, bez zapisu wyników.'
    ]
  };
  const MEASURE = {
    redukcja: ['Średnią wagę z tygodnia (ważenie rano, po toalecie, przed jedzeniem).', 'Obwód talii na wysokości pępka co 2 tygodnie.', 'Wyniki w ćwiczeniach głównych — przy redukcji mają się co najmniej utrzymać.'],
    masa: ['Średnią wagę z tygodnia — szukasz spokojnego, stałego wzrostu.', 'Wyniki w ćwiczeniach głównych: ciężar i powtórzenia.', 'Obwody ramienia, klatki i talii co 2 tygodnie.'],
    sylwetka: ['Zdjęcia przód, bok, tył co 2–4 tygodnie — to samo światło i pora dnia.', 'Obwód talii co 2 tygodnie.', 'Wyniki w ćwiczeniach głównych.'],
    sila: ['Ciężar i powtórzenia w 2–3 ćwiczeniach głównych po każdym treningu.', 'Ile powtórzeń zostało w zapasie w ostatniej serii.', 'Trend co 2–4 tygodnie, a nie wynik jednego treningu.'],
    kondycja: ['Czas albo dystans na stałej trasie (np. 2 km).', 'Jak szybko łapiesz oddech po wysiłku.', 'Ile zaplanowanych treningów zrobiłeś w tygodniu.'],
    powrot: ['Ile zaplanowanych treningów zrobiłeś (np. 7 z 8).', 'Wyniki w ćwiczeniach głównych: tydzień 1 i tydzień 4.', 'Samopoczucie po treningu — czy regeneracja nadąża.'],
    inne: ['Zapis każdego treningu: ćwiczenie, ciężar, serie, powtórzenia.', 'Ile zaplanowanych treningów zrobiłeś.', 'Zdjęcia i obwody co 2–4 tygodnie.']
  };
  const FOOD = {
    redukcja: 'Do redukcji potrzebny jest deficyt kaloryczny. Wprowadzaj go umiarkowanie i obserwuj średnią wagę przez kilka tygodni.',
    masa: 'Do budowy masy potrzebna jest lekka nadwyżka kaloryczna. Bez przesady — obserwuj średnią wagę co tydzień.',
    sylwetka: 'Przy poprawie sylwetki jedz w okolicach swojego zapotrzebowania i pilnuj białka oraz regularnych posiłków.',
    sila: 'Przy treningu siłowym nie oszczędzaj na jedzeniu — regularne posiłki pomagają utrzymać jakość treningów.',
    kondycja: 'Przy treningu wytrzymałościowym dbaj o regularne posiłki i nawodnienie — więcej w dni treningowe.',
    powrot: 'Na powrót wystarczą podstawy: regularne posiłki, białko w każdym głównym posiłku i woda.',
    inne: 'Na start: regularne posiłki, białko w każdym głównym posiłku, warzywa i woda.'
  };
  const PLACE = {
    dom: { lead: 'W domu progresujesz nie tylko ciężarem:', list: ['trudniejszy wariant (np. pompki na podwyższeniu → klasyczne → z nogami wyżej),', 'wolniejsze opuszczanie — ok. 3 sekundy,', 'więcej powtórzeń w serii.'], tail: 'Najbardziej przydatny sprzęt na start: regulowane hantle, gumy oporowe, drążek.' },
    silownia: { lead: 'Zacznij od ćwiczeń wielostawowych, a maszyny traktuj jako uzupełnienie:', list: ['przysiad lub suwnica, martwy ciąg rumuński,', 'wyciskanie na ławce lub nad głowę,', 'wyciąg górny i wiosłowanie.'], tail: 'Do każdego ćwiczenia miej zamiennik na wypadek zajętego sprzętu.' },
    oba: { lead: 'Ułóż plan tak, żeby każde ćwiczenie miało wersję domową i na siłownię — wtedy jeden plan działa wszędzie:', list: ['przysiad ze sztangą ↔ przysiad z hantlą lub wykroki,', 'wyciskanie na ławce ↔ pompki lub wyciskanie hantli,', 'wyciąg górny ↔ podciąganie lub wiosłowanie hantlą.'], tail: '' }
  };

  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  const card = (no, title, body) => `<article class="result-card"><h2><b>${no}</b>${esc(title)}</h2>${body}</article>`;
  const daysWord = n => (n === 1 ? 'dzień' : 'dni');
  const trainingsWord = n => (n === 1 ? 'trening' : (n >= 2 && n <= 4 ? 'treningi' : 'treningów'));
  const round5 = n => Math.round(n / 5) * 5;

  function renderTips(a) {
    const cel = MISTAKES[a.cel] ? a.cel : 'inne';
    const exp = PROGRESS[a.doswiadczenie] ? a.doswiadczenie : 'poczatkujacy';
    const place = PLACE[a.miejsce] ? a.miejsce : 'oba';
    const days = Math.min(7, Math.max(1, a.dni || 3));

    const nameEl = document.querySelector('#result-name');
    if (nameEl) nameEl.textContent = a.imie ? `, ${a.imie.toUpperCase()}` : '';
    const chips = document.querySelector('#result-chips');
    if (chips) chips.innerHTML = [LABELS.cel[a.cel], LABELS.doswiadczenie[a.doswiadczenie], LABELS.miejsce[a.miejsce], `${days} ${daysWord(days)} w tygodniu`]
      .filter(Boolean).map(text => `<li>${esc(text)}</li>`).join('');

    const week = WEEK[days].map((slot, i) => `<div class="${slot ? 'is-training' : ''}"><b>${DAY_NAMES[i]}</b>${slot ? esc(slot) : '–'}</div>`).join('');
    const caution = (['poczatkujacy', 'powrot'].includes(a.doswiadczenie) && days >= 5)
      ? '<p class="result-note">Na start rozważ 3–4 treningi i dokładaj kolejne dopiero wtedy, gdy przez kilka tygodni utrzymasz regularność. Wolne dni wykorzystaj na spacer.</p>' : '';
    const cards = [];
    cards.push(card('01', 'Twój tydzień', `<div class="result-week">${week}</div><p>${esc(WEEK_TEXT[days])}</p>${caution}<p class="result-note">Każdy trening: rozgrzewka 5–10 min → 1–2 ćwiczenia główne → 2–3 uzupełniające → 2 minuty na zapis wyników. Dni tygodnia są przykładowe.</p>`));
    cards.push(card('02', 'Jak progresować', list(PROGRESS[exp])));
    cards.push(card('03', '3 błędy, które blokują ten cel', list(MISTAKES[cel])));
    const p = PLACE[place];
    cards.push(card('04', 'Gdzie trenujesz', `<p>${esc(p.lead)}</p>${list(p.list)}${p.tail ? `<p>${esc(p.tail)}</p>` : ''}`));
    cards.push(card('05', 'Co mierzyć', list(MEASURE[cel])));
    const w = Number(a.waga_kg);
    const protein = Number.isFinite(w) && w > 0
      ? `<p>Białko: dla osób trenujących siłowo często podaje się ok. 1,6–2,2 g na kg masy ciała dziennie. Przy Twojej wadze to ok. <strong>${round5(w * 1.6)}–${round5(w * 2.2)} g</strong>. Najprościej: źródło białka w każdym głównym posiłku.</p>` : '';
    cards.push(card('06', 'Jedzenie pod Twój cel', `${protein}<p>${esc(FOOD[cel])}</p><p class="result-note">Ogólna wskazówka, nie dieta. Przy chorobach (np. nerek), lekach lub zaleceniach lekarza skonsultuj się z lekarzem albo dietetykiem.</p>`));
    const plannedDays = caution ? '3–4 treningi' : `${days} ${trainingsWord(days)}`;
    cards.push(card('07', 'Twój pierwszy krok w tym tygodniu', `<p>Wpisz ${plannedDays} do kalendarza — konkretny dzień i godzinę. Po każdym zapisz: ćwiczenie, ciężar, serie i powtórzenia. W ebooku masz gotowy dziennik i plan na pierwsze 4 tygodnie.</p>`));
    const container = document.querySelector('#result-cards');
    if (container) container.innerHTML = cards.join('');
  }

  // ---------- Wysyłka ----------
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    // Enter w polach wcześniejszych kroków: przejdź dalej zamiast wysyłać.
    if (current < TOTAL) { next(); return; }

    for (let stepNumber = 1; stepNumber <= TOTAL; stepNumber += 1) {
      const errors = errorsFor(stepNumber);
      const names = Object.keys(errors);
      if (names.length) {
        if (stepNumber !== current) show(stepNumber);
        names.forEach(name => setError(name, errors[name]));
        status.textContent = 'Uzupełnij zaznaczone pola.';
        status.classList.add('is-error');
        form.querySelector(`[name="${names[0]}"]`)?.focus();
        return;
      }
    }

    const answers = {
      imie: value('imie'), email: value('email'), wiek: Number(value('wiek')), wzrost_cm: Number(value('wzrost_cm')),
      waga_kg: weight(), zakres, cel: value('cel'), cel_opis: '', doswiadczenie: value('doswiadczenie'),
      miejsce: value('miejsce'), dni: Number(value('dni')), inwestycja: value('inwestycja'),
      zgoda_przetwarzanie: value('zgoda_przetwarzanie') === true, zgoda_marketing: value('zgoda_marketing') === true,
      website: String(form.elements.website?.value || '')
    };

    const submit = form.querySelector('.quiz-submit');
    const label = submit.textContent;
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'PRZYGOTOWUJĘ WSKAZÓWKI…';
    status.textContent = '';
    status.classList.remove('is-error');
    try {
      const response = await fetch('/api/zgloszenie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(answers)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.field && FIELD_STEP[data.field]) {
          if (FIELD_STEP[data.field] !== current) show(FIELD_STEP[data.field]);
          setError(data.field, data.error);
        }
        throw new Error(data.error || 'Nie udało się wysłać ankiety. Spróbuj ponownie.');
      }
      renderTips(answers);
      track('wyslano');
      form.hidden = true;
      if (intro) intro.hidden = true;
      result.hidden = false;
      // Meta Pixel: zdarzenie Lead tylko po udanym zapisie i tylko, gdy jest zgoda na cookies marketingowe (skrypt ładuje się dopiero po zgodzie).
      if (typeof window.fbq === 'function') {
        try { window.fbq('track', 'Lead', { content_name: 'bezplatna-ankieta', content_category: zakres }); } catch { /* bez wpływu na ankietę */ }
      }
      result.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  show(1, { focus: false });
})();
