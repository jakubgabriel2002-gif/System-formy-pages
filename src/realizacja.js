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

  let currentProduct = null;
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
      currentProduct = data;
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
      <div class="download-options">
        ${downloadCard('home', 'PLAN DO DOMU', 'Zestaw treningowy do realizacji w domu.')}
        ${downloadCard('gym', 'PLAN NA SIŁOWNIĘ', 'Zestaw treningowy do realizacji na siłowni.')}
      </div>
      <p id="download-status" class="realization-message" role="status" aria-live="polite"></p>
    `;
    root.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', async () => {
      const variant = button.dataset.download;
      button.disabled = true;
      const status = document.querySelector('#download-status');
      status.textContent = 'Przygotowuję bezpieczne pobieranie…';
      try {
        const response = await fetch(`/api/download-start?session_id=${encodeURIComponent(sessionId)}&variant=${encodeURIComponent(variant)}`, { cache: 'no-store' });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Nie udało się pobrać materiałów.');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = variant === 'home' ? 'SYSTEM-FORMY-PLAN-DO-DOMU.zip' : 'SYSTEM-FORMY-PLAN-NA-SILOWNIE.zip';
        document.body.appendChild(link); link.click(); link.remove();
        URL.revokeObjectURL(url);
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

  function renderIntake(data) {
    const key = data.product_key;
    const isElite = key === 'elite';
    const isPro = key === 'pro';
    const isIndividual = key.startsWith('individual-');
    const individualFull = key === 'individual-full';
    const individualMonitor = key === 'individual-monitor' || individualFull;
    const surveyTitle = isElite ? 'ANKIETA SYSTEM ELITE' : isPro ? 'ANKIETA SYSTEM PRO' : 'ANKIETA PLANU INDYWIDUALNEGO';
    const surveyIntro = isElite
      ? 'Ta ankieta zbiera informacje do szczegółowej analizy i przygotowania Karty Celu ELITE. Cel, punkt startowy, wartość docelowa i metoda pomiaru zostaną wspólnie zweryfikowane przed rozpoczęciem gwarantowanej współpracy.'
      : isPro
        ? 'Ta ankieta pozwoli dopasować plan i osiem tygodni współpracy PRO do Twojego celu, doświadczenia, grafiku oraz warunków treningowych.'
        : 'Ta ankieta służy przygotowaniu czterotygodniowego planu indywidualnego. Zakres dodatkowych pytań zależy od wybranego wariantu monitorowania i kontroli ćwiczeń.';

    let productFields = '';
    let detailNames = [];
    if (isElite) {
      detailNames = ['goalMetric', 'baselineValue', 'targetValue', 'measurementMethod', 'reportDay', 'weeklySchedule', 'nutrition', 'sleep', 'dailyActivity', 'barriers'];
      productFields = `
        <h2 class="survey-heading full">KARTA CELU ELITE</h2>
        <p class="survey-note">Wskaż jeden główny, możliwy do obiektywnego sprawdzenia cel. Jeżeli okaże się nierealny lub niebezpieczny w zakładanym czasie, zaproponuję mierzalną alternatywę. Gwarancja obowiązuje dopiero po wspólnej akceptacji Karty Celu ELITE.</p>
        <div class="form-field"><label for="goal-metric">JAKI WSKAŹNIK BĘDZIEMY OCENIAĆ? *</label><select id="goal-metric" name="goalMetric" data-survey-detail required><option value="">Wybierz</option><option value="masa">Masa ciała</option><option value="obwód">Obwód ciała</option><option value="siła">Wynik siłowy</option><option value="kondycja">Kondycja / wytrzymałość</option><option value="test">Wynik konkretnego testu</option><option value="inny">Inny mierzalny wskaźnik</option></select></div>
        <div class="form-field"><label for="baseline-value">WARTOŚĆ POCZĄTKOWA I JEDNOSTKA *</label><input id="baseline-value" name="baselineValue" data-survey-detail required maxlength="160" placeholder="Np. 82 kg, 92 cm, 60 kg x 5 powtórzeń"></div>
        <div class="form-field"><label for="target-value">WARTOŚĆ DOCELOWA I JEDNOSTKA *</label><input id="target-value" name="targetValue" data-survey-detail required maxlength="160" placeholder="Np. 78 kg, 86 cm, 70 kg x 5 powtórzeń"></div>
        <div class="form-field"><label for="measurement-method">JAK BĘDZIEMY MIERZYĆ WYNIK? *</label><input id="measurement-method" name="measurementMethod" data-survey-detail required maxlength="500" placeholder="Opisz warunki pomiaru lub nazwę testu"></div>
        <div class="form-field"><label for="report-day">W JAKI DZIEŃ MOŻESZ WYSYŁAĆ RAPORT? *</label><select id="report-day" name="reportDay" data-survey-detail required><option value="">Wybierz</option><option>Poniedziałek</option><option>Wtorek</option><option>Środa</option><option>Czwartek</option><option>Piątek</option><option>Sobota</option><option>Niedziela</option></select></div>
        <div class="form-field full"><label for="weekly-schedule">JAK WYGLĄDA TWÓJ TYPOWY TYDZIEŃ I DOSTĘPNOŚĆ? (OPCJONALNIE)</label><textarea id="weekly-schedule" name="weeklySchedule" data-survey-detail maxlength="900" placeholder="Praca, nauka, pory dnia, dni z największą dostępnością."></textarea></div>
        <div class="form-field"><label for="nutrition">JAK OCENIASZ SWOJE OBECNE NAWYKI ŻYWIENIOWE? (OPCJONALNIE)</label><textarea id="nutrition" name="nutrition" data-survey-detail maxlength="800"></textarea></div>
        <div class="form-field"><label for="sleep">ILE ŚREDNIO ŚPISZ? (OPCJONALNIE)</label><input id="sleep" name="sleep" data-survey-detail maxlength="100" placeholder="Np. 7 godzin"></div>
        <div class="form-field"><label for="daily-activity">JAK WYGLĄDA TWOJA AKTYWNOŚĆ POZA TRENINGIEM? (OPCJONALNIE)</label><textarea id="daily-activity" name="dailyActivity" data-survey-detail maxlength="700"></textarea></div>
        <div class="form-field"><label for="barriers">JAKIE PRZESZKODY MOGĄ UTRUDNIAĆ REALIZACJĘ? (OPCJONALNIE)</label><textarea id="barriers" name="barriers" data-survey-detail maxlength="800"></textarea></div>`;
    } else if (isPro) {
      detailNames = ['weeklySchedule', 'nutrition', 'sleep', 'dailyActivity', 'barriers', 'supportNeeds'];
      productFields = `
        <h2 class="survey-heading full">TWOJA CODZIENNOŚĆ I WSPÓŁPRACA PRO</h2>
        <div class="form-field full"><label for="weekly-schedule">JAK WYGLĄDA TWÓJ TYPOWY TYDZIEŃ? (OPCJONALNIE)</label><textarea id="weekly-schedule" name="weeklySchedule" data-survey-detail maxlength="900" placeholder="Praca, nauka, obowiązki i pory, w których możesz trenować."></textarea></div>
        <div class="form-field"><label for="nutrition">JAK WYGLĄDA TWOJE ODŻYWIANIE? (OPCJONALNIE)</label><textarea id="nutrition" name="nutrition" data-survey-detail maxlength="900"></textarea></div>
        <div class="form-field"><label for="sleep">ILE ŚREDNIO ŚPISZ? (OPCJONALNIE)</label><input id="sleep" name="sleep" data-survey-detail maxlength="100" placeholder="Np. 7 godzin"></div>
        <div class="form-field"><label for="daily-activity">JAKA JEST TWOJA AKTYWNOŚĆ POZA TRENINGIEM? (OPCJONALNIE)</label><textarea id="daily-activity" name="dailyActivity" data-survey-detail maxlength="700"></textarea></div>
        <div class="form-field"><label for="barriers">CO NAJCZĘŚCIEJ UTRUDNIA CI REGULARNOŚĆ? (OPCJONALNIE)</label><textarea id="barriers" name="barriers" data-survey-detail maxlength="900"></textarea></div>
        <div class="form-field full"><label for="support-needs">W JAKICH OBSZARACH NAJBARDZIEJ POTRZEBUJESZ WSPARCIA? (OPCJONALNIE)</label><textarea id="support-needs" name="supportNeeds" data-survey-detail maxlength="900"></textarea></div>`;
    } else if (isIndividual) {
      detailNames = ['height', 'trainingHistory', 'preferredExercises', 'progressFocus', 'reportDay', 'techniqueExercises'];
      productFields = `
        <h2 class="survey-heading full">DOPASOWANIE PLANU INDYWIDUALNEGO</h2>

        <div class="form-field"><label for="height">WZROST (OPCJONALNIE)</label><input id="height" name="height" data-survey-detail maxlength="40" placeholder="Np. 180 cm"></div>
        <div class="form-field full"><label for="training-history">JAK WYGLĄDAŁ TWÓJ DOTYCHCZASOWY TRENING? (OPCJONALNIE)</label><textarea id="training-history" name="trainingHistory" data-survey-detail maxlength="900"></textarea></div>
        <div class="form-field full"><label for="preferred-exercises">CZY SĄ ĆWICZENIA, KTÓRE LUBISZ LUB CHCESZ UWZGLĘDNIĆ? (OPCJONALNIE)</label><textarea id="preferred-exercises" name="preferredExercises" data-survey-detail maxlength="800"></textarea></div>
        ${individualMonitor ? `<div class="form-field full"><label for="progress-focus">NA JAKICH POSTĘPACH NAJBARDZIEJ CI ZALEŻY? (OPCJONALNIE)</label><textarea id="progress-focus" name="progressFocus" data-survey-detail maxlength="800"></textarea></div>
        <div class="form-field"><label for="report-day">PREFEROWANY DZIEŃ RAPORTU (OPCJONALNIE)</label><select id="report-day" name="reportDay" data-survey-detail><option value="">Wybierz</option><option>Poniedziałek</option><option>Wtorek</option><option>Środa</option><option>Czwartek</option><option>Piątek</option><option>Sobota</option><option>Niedziela</option></select></div>` : ''}
        ${individualFull ? `<div class="form-field full"><label for="technique-exercises">KTÓRE ĆWICZENIA CHCESZ OBJĄĆ KONTROLĄ TECHNIKI? (OPCJONALNIE)</label><textarea id="technique-exercises" name="techniqueExercises" data-survey-detail maxlength="800" placeholder="Wymień ćwiczenia, które możesz nagrywać do analizy."></textarea></div>` : ''}`;
    }

    root.innerHTML = `
      <div class="realization-success">Płatność za <strong>${escapeHtml(data.product_name)}</strong> została potwierdzona. Teraz wypełnij właściwą ankietę, abyśmy mogli rozpocząć realizację zamówienia.</div>
      <h2 class="survey-heading">${surveyTitle}</h2>
      <p class="realization-lead">${surveyIntro}</p>
      <p class="realization-lead">Nie podawaj pełnych diagnoz, listy leków ani dokumentacji medycznej. Informacje o ograniczeniach zdrowotnych są opcjonalne i mają osobną zgodę.</p>
      <form id="client-intake" class="realization-form">
        <div class="form-field"><label for="intake-name">IMIĘ I NAZWISKO *</label><input id="intake-name" name="name" autocomplete="name" value="${escapeAttr(data.name || '')}" required maxlength="120"></div>
        <div class="form-field"><label for="intake-email">E-MAIL ZAMÓWIENIA *</label><input id="intake-email" name="email" type="email" autocomplete="email" value="${escapeAttr(data.email || '')}" required maxlength="254"></div>
        <div class="form-field"><label for="intake-age">WIEK *</label><input id="intake-age" name="age" type="number" min="18" max="100" step="1" required></div>
        <div class="form-field"><label for="intake-gender">PŁEĆ *</label><select id="intake-gender" name="gender" required><option value="">Wybierz</option><option value="kobieta">Kobieta</option><option value="mężczyzna">Mężczyzna</option><option value="inna">Inna</option><option value="nie_podaję">Wolę nie podawać</option></select></div>
        <div class="form-field"><label for="intake-weight">AKTUALNA MASA CIAŁA (KG) *</label><input id="intake-weight" name="bodyWeightKg" type="number" min="25" max="350" step="0.1" required placeholder="Np. 82.5"></div>
        <div class="form-field"><label for="intake-location">GDZIE TRENUJESZ? *</label><select id="intake-location" name="trainingLocation" required><option value="">Wybierz</option><option value="dom">W domu</option><option value="siłownia">Na siłowni</option><option value="oba">W obu miejscach</option></select></div>
        <div class="form-field full"><label for="intake-goal">JAKI JEST TWÓJ GŁÓWNY CEL? *</label><textarea id="intake-goal" name="goal" required maxlength="1500" placeholder="Opisz, nad czym chcesz pracować."></textarea></div>
        <div class="form-field full"><label for="intake-measurable">CZY MASZ DODATKOWY KONKRETNY CEL LICZBOWY? (OPCJONALNIE)</label><textarea id="intake-measurable" name="measurableGoal" maxlength="800" placeholder="Np. obwód, masa ciała, wynik siłowy lub test sprawnościowy."></textarea></div>
        <div class="form-field"><label for="intake-experience">DOŚWIADCZENIE TRENINGOWE *</label><select id="intake-experience" name="experience" required><option value="">Wybierz</option><option>początkujący</option><option>średniozaawansowany</option><option>zaawansowany</option><option>powrót po przerwie</option></select></div>
        <div class="form-field"><label for="intake-days">ILE DNI W TYGODNIU MOŻESZ TRENOWAĆ? *</label><select id="intake-days" name="daysPerWeek" required><option value="">Wybierz</option><option value="2">2 dni</option><option value="3">3 dni</option><option value="4">4 dni</option><option value="5">5 dni</option><option value="6">6 dni</option><option value="7">7 dni</option></select></div>
        <div class="form-field"><label for="intake-minutes">CZAS JEDNEGO TRENINGU *</label><select id="intake-minutes" name="sessionMinutes" required><option value="">Wybierz</option><option value="30">30 minut</option><option value="45">45 minut</option><option value="60">60 minut</option><option value="75">75 minut</option><option value="90">90 minut</option></select></div>
        <div class="form-field"><label for="intake-start">PREFEROWANY START (OPCJONALNIE)</label><input id="intake-start" name="startDate" type="date"></div>
        <fieldset class="equipment-module full" id="equipment-module" hidden disabled>
          <legend>SPRZĘT, KTÓRY MASZ W DOMU</legend>
          <p>Zaznacz wszystkie dostępne rzeczy. Ta sekcja pojawi się przy treningu w domu lub w obu miejscach.</p>
          <div class="equipment-grid" id="equipment-grid">
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="dumbbells"><span>Hantle</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="barbell"><span>Sztanga</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="bench"><span>Ławka</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="rack"><span>Stojaki / klatka</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="pullup_bar"><span>Drążek</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="bands"><span>Gumy oporowe</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="kettlebell"><span>Kettlebell</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="mat"><span>Mata</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="treadmill"><span>Bieżnia</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="stationary_bike"><span>Rower stacjonarny</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="elliptical"><span>Orbitrek</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="jump_rope"><span>Skakanka</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="trx"><span>TRX</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="cable_machine"><span>Wyciąg</span></label>
            <label class="equipment-option equipment-option-wide"><input type="checkbox" name="equipmentItems" value="none"><span>Nie mam żadnego sprzętu</span></label>
            <label class="equipment-option"><input type="checkbox" name="equipmentItems" value="other"><span>Inny sprzęt</span></label>
          </div>
          <div class="form-field equipment-other" id="equipment-other-wrap" hidden><label for="equipment-other">JAKI INNY SPRZĘT? *</label><input id="equipment-other" name="equipmentOther" maxlength="300" placeholder="Wpisz posiadany sprzęt"></div>
        </fieldset>
        <fieldset class="training-test-fieldset full" id="home-tests" hidden disabled>
          <legend>TEST SPRAWNOŚCIOWY — TRENING W DOMU</legend>
          <p>Wpisz maksymalną liczbę poprawnych powtórzeń, które wykonujesz bez przerwy w jednej serii.</p>
          <div class="test-grid">
            <div class="form-field"><label for="home-pushups">POMPKI — MAKS. POWTÓRZEŃ *</label><input id="home-pushups" name="homePushUps" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="home-squats">PRZYSIADY — MAKS. POWTÓRZEŃ *</label><input id="home-squats" name="homeSquats" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="home-situps">BRZUSZKI — MAKS. POWTÓRZEŃ *</label><input id="home-situps" name="homeSitUps" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="home-jumping-jacks">PAJACYKI — MAKS. POWTÓRZEŃ *</label><input id="home-jumping-jacks" name="homeJumpingJacks" type="number" min="0" max="1000" step="1" required></div>
          </div>
        </fieldset>
        <fieldset class="training-test-fieldset full" id="gym-tests" hidden disabled>
          <legend>WYNIKI TRENINGOWE — SIŁOWNIA</legend>
          <p>Nie wykonuj testu 1RM ani prób maksymalnego ciężaru. Przy wyciskaniu i przysiadzie wpisz używany ciężar oraz liczbę poprawnych powtórzeń w bezpiecznej serii. Jeżeli jeszcze nie wykonujesz ćwiczenia, wpisz 0.</p>
          <div class="test-grid">
            <div class="form-field"><label for="gym-bench-kg">WYCISKANIE LEŻĄC — CIĘŻAR (KG) *</label><input id="gym-bench-kg" name="gymBenchPressKg" type="number" min="0" max="500" step="0.5" required></div>
            <div class="form-field"><label for="gym-bench-reps">WYCISKANIE LEŻĄC — POWTÓRZENIA *</label><input id="gym-bench-reps" name="gymBenchPressReps" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="gym-squat-kg">PRZYSIAD ZE SZTANGĄ — CIĘŻAR (KG) *</label><input id="gym-squat-kg" name="gymSquatKg" type="number" min="0" max="500" step="0.5" required></div>
            <div class="form-field"><label for="gym-squat-reps">PRZYSIAD ZE SZTANGĄ — POWTÓRZENIA *</label><input id="gym-squat-reps" name="gymSquatReps" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="gym-situps">BRZUSZKI — MAKS. POWTÓRZEŃ *</label><input id="gym-situps" name="gymSitUps" type="number" min="0" max="1000" step="1" required></div>
            <div class="form-field"><label for="gym-pullups">PODCIĄGANIE — MAKS. POWTÓRZEŃ *</label><input id="gym-pullups" name="gymPullUps" type="number" min="0" max="1000" step="1" required></div>
          </div>
        </fieldset>
        <div class="form-field full"><label for="intake-current">JAK WYGLĄDA TWÓJ OBECNY PLAN LUB AKTYWNOŚĆ? (OPCJONALNIE)</label><textarea id="intake-current" name="currentPlan" maxlength="1000"></textarea></div>
        <div class="form-field full"><label for="intake-difficulty">CO NAJTRUDNIEJ CI OSIĄGNĄĆ LUB UTRZYMAĆ? (OPCJONALNIE)</label><textarea id="intake-difficulty" name="difficulty" maxlength="1000"></textarea></div>
        ${productFields}
        <fieldset class="health-module full">
          <legend>OPCJONALNE INFORMACJE O OGRANICZENIACH ZDROWOTNYCH</legend>
          <p>Możesz pominąć tę część. Przekazuj wyłącznie informacje potrzebne do określenia bezpiecznego zakresu treningu. Nie wpisuj pełnej diagnozy ani dokumentacji medycznej.</p>
          <label class="form-consent"><input id="health-consent" name="healthConsent" type="checkbox"><span>Wyrażam wyraźną zgodę na przetwarzanie przekazanych przeze mnie w tej sekcji informacji dotyczących zdrowia w celu uwzględnienia ograniczeń przy przygotowaniu i realizacji planu. Zgodę mogę wycofać.</span></label>
          <div class="health-fields" id="health-fields" hidden>
            <div class="form-field"><label for="health-pain">CZY WYSTĘPUJE BÓL LUB URAZ OGRANICZAJĄCY TRENING?</label><select id="health-pain" name="healthPain"><option value="">Nie podaję</option><option value="tak">Tak</option><option value="nie">Nie</option><option value="nie wiem">Nie wiem</option></select></div>
            <div class="form-field"><label for="health-restriction">CZY MASZ ZALECENIE OGRANICZENIA AKTYWNOŚCI?</label><select id="health-restriction" name="healthRestriction"><option value="">Nie podaję</option><option value="tak">Tak</option><option value="nie">Nie</option><option value="wolę omówić prywatnie">Wolę omówić prywatnie</option></select></div>
            <div class="form-field full"><label for="health-notes">KRÓTKI OPIS OGRANICZENIA (OPCJONALNIE)</label><textarea id="health-notes" name="healthNotes" maxlength="800"></textarea></div>
          </div>
        </fieldset>
        <label class="form-consent full"><input id="adult-confirmed" name="adultConfirmed" type="checkbox" required><span>Potwierdzam, że mam ukończone 18 lat. *</span></label>
        <div class="realization-submit full"><button class="button button-light" type="submit" id="intake-submit">WYŚLIJ ANKIETĘ</button><p id="intake-status" class="realization-message" role="status" aria-live="polite"></p></div>
      </form>
    `;

    const form = document.querySelector('#client-intake');
    const healthCheckbox = document.querySelector('#health-consent');
    const healthFields = document.querySelector('#health-fields');
    const locationSelect = document.querySelector('#intake-location');
    const equipmentModule = document.querySelector('#equipment-module');
    const homeTests = document.querySelector('#home-tests');
    const gymTests = document.querySelector('#gym-tests');
    const equipmentInputs = Array.from(form.querySelectorAll('input[name="equipmentItems"]'));
    const equipmentOther = document.querySelector('#equipment-other');
    const equipmentOtherWrap = document.querySelector('#equipment-other-wrap');
    const equipmentNone = equipmentInputs.find(input => input.value === 'none');
    const equipmentOtherChoice = equipmentInputs.find(input => input.value === 'other');
    healthCheckbox?.addEventListener('change', () => { healthFields.hidden = !healthCheckbox.checked; });

    function updateEquipmentState() {
      const show = ['dom', 'oba'].includes(locationSelect.value);
      equipmentModule.hidden = !show;
      equipmentModule.disabled = !show;
      if (!show) {
        equipmentInputs.forEach(input => { input.checked = false; input.setCustomValidity(''); });
        equipmentOther.value = '';
      }
      const noneSelected = Boolean(equipmentNone?.checked);
      equipmentInputs.forEach(input => {
        if (input === equipmentNone) return;
        input.disabled = !show || noneSelected;
      });
      if (equipmentNone) equipmentNone.disabled = !show;
      const otherSelected = Boolean(equipmentOtherChoice?.checked && show);
      equipmentOtherWrap.hidden = !otherSelected;
      equipmentOther.disabled = !otherSelected;
      equipmentOther.required = otherSelected;
      equipmentOther.setCustomValidity(otherSelected && !equipmentOther.value.trim() ? 'Wpisz, jaki inny sprzęt posiadasz.' : '');
      const firstActive = equipmentInputs.find(input => input !== equipmentNone && input !== equipmentOtherChoice) || equipmentInputs[0];
      if (firstActive) firstActive.setCustomValidity(show && !equipmentInputs.some(input => input.checked) ? 'Zaznacz przynajmniej jedną opcję sprzętu.' : '');
    }

    function updateConditionalFields() {
      const location = locationSelect.value;
      const showHome = ['dom', 'oba'].includes(location);
      const showGym = ['siłownia', 'oba'].includes(location);
      homeTests.hidden = !showHome;
      homeTests.disabled = !showHome;
      gymTests.hidden = !showGym;
      gymTests.disabled = !showGym;
      updateEquipmentState();
    }

    locationSelect?.addEventListener('change', updateConditionalFields);
    equipmentInputs.forEach(input => input.addEventListener('change', () => {
      if (input === equipmentNone && input.checked) {
        equipmentInputs.filter(item => item !== equipmentNone).forEach(item => { item.checked = false; });
      } else if (input.checked && equipmentNone) {
        equipmentNone.checked = false;
      }
      updateEquipmentState();
    }));
    equipmentOther?.addEventListener('input', updateEquipmentState);
    updateConditionalFields();

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      updateConditionalFields();
      if (!form.reportValidity()) return;
      const submit = document.querySelector('#intake-submit');
      const status = document.querySelector('#intake-status');
      submit.disabled = true;
      status.textContent = 'Zapisuję ankietę…';
      const value = name => form.elements[name]?.value ?? '';
      const details = Object.fromEntries(detailNames.map(name => [name, value(name)]));
      const location = value('trainingLocation');
      const equipmentItems = equipmentInputs.filter(input => input.checked).map(input => input.value);
      const equipmentOtherValue = value('equipmentOther').trim();
      const equipmentLabels = {
        dumbbells: 'hantle', barbell: 'sztanga', bench: 'ławka', rack: 'stojaki / klatka',
        pullup_bar: 'drążek', bands: 'gumy oporowe', kettlebell: 'kettlebell', mat: 'mata',
        treadmill: 'bieżnia', stationary_bike: 'rower stacjonarny', elliptical: 'orbitrek',
        jump_rope: 'skakanka', trx: 'TRX', cable_machine: 'wyciąg', none: 'brak sprzętu', other: equipmentOtherValue
      };
      const maxTests = {
        home: ['dom', 'oba'].includes(location) ? {
          pushUps: value('homePushUps'), squats: value('homeSquats'), sitUps: value('homeSitUps'), jumpingJacks: value('homeJumpingJacks')
        } : null,
        gym: ['siłownia', 'oba'].includes(location) ? {
          benchPress: { weightKg: value('gymBenchPressKg'), reps: value('gymBenchPressReps') },
          squat: { weightKg: value('gymSquatKg'), reps: value('gymSquatReps') },
          sitUps: value('gymSitUps'), pullUps: value('gymPullUps')
        } : null
      };
      const payload = {
        session_id: sessionId, name: value('name'), email: value('email'), age: value('age'),
        gender: value('gender'), bodyWeightKg: value('bodyWeightKg'),
        goal: value('goal'), measurableGoal: value('measurableGoal'), experience: value('experience'),
        trainingLocation: location,
        equipmentItems, equipmentOther: equipmentOtherValue,
        equipment: equipmentItems.map(item => equipmentLabels[item]).filter(Boolean).join(', '),
        daysPerWeek: value('daysPerWeek'), sessionMinutes: value('sessionMinutes'),
        currentPlan: value('currentPlan'), difficulty: value('difficulty'), startDate: value('startDate'),
        maxTests, details,
        adultConfirmed: document.querySelector('#adult-confirmed').checked,
        healthConsent: healthCheckbox.checked,
        healthPain: value('healthPain'), healthRestriction: value('healthRestriction'), healthNotes: value('healthNotes')
      };
      try {
        const response = await fetch('/api/submit-intake', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać ankiety.');
        form.innerHTML = `<div class="realization-success"><strong>Ankieta została wysłana.</strong><br>${escapeHtml(result.message || 'Dziękujemy. Otrzymaliśmy Twoje odpowiedzi.')}</div><a class="button button-outline" href="/">WRÓĆ NA STRONĘ GŁÓWNĄ</a>`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Nie udało się zapisać ankiety.';
        status.classList.add('realization-error');
        submit.disabled = false;
      }
    });
  }

  function showError(message) {
    root.innerHTML = `<p class="realization-message realization-error">${escapeHtml(message)}</p><p><a class="button button-outline" href="/">WRÓĆ DO STRONY GŁÓWNEJ</a></p>`;
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function escapeAttr(value) { return escapeHtml(value); }

  checkPayment();
})();
