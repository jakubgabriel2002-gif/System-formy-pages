(() => {
  'use strict';
  const root = document.querySelector('#realization-state');
  const title = document.querySelector('#realization-title');
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

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
    return `<article class="download-option"><div><strong>${heading}</strong><span>${description}</span><button class="button button-light" type="button" data-download="${key}">POBIERZ PAKIET ↓</button></div></article>`;
  }

  function renderIntake(data) {
    root.innerHTML = `
      <div class="realization-success">Płatność za <strong>${escapeHtml(data.product_name)}</strong> została potwierdzona. Wypełnij ankietę startową, abyśmy mogli rozpocząć realizację zamówienia.</div>
      <p class="realization-lead">Ankieta dotyczy informacji potrzebnych do przygotowania planu i prowadzenia współpracy. Nie podawaj pełnej diagnozy, listy leków ani dokumentacji medycznej. Moduł dotyczący ograniczeń zdrowotnych jest opcjonalny i ma odrębną zgodę.</p>
      <form id="client-intake" class="realization-form">
        <div class="form-field"><label for="intake-name">IMIĘ I NAZWISKO *</label><input id="intake-name" name="name" autocomplete="name" required maxlength="120"></div>
        <div class="form-field"><label for="intake-email">E-MAIL ZAMÓWIENIA *</label><input id="intake-email" name="email" type="email" autocomplete="email" value="${escapeAttr(data.email || '')}" required maxlength="254"></div>
        <div class="form-field"><label for="intake-age">WIEK *</label><input id="intake-age" name="age" type="number" min="18" max="100" required></div>
        <div class="form-field"><label for="intake-location">GDZIE TRENUJESZ? *</label><select id="intake-location" name="trainingLocation" required><option value="">Wybierz</option><option value="dom">W domu</option><option value="siłownia">Na siłowni</option><option value="oba">W obu miejscach</option></select></div>
        <div class="form-field full"><label for="intake-goal">JAKI JEST TWÓJ GŁÓWNY CEL? *</label><textarea id="intake-goal" name="goal" required maxlength="1500" placeholder="Opisz, nad czym chcesz pracować."></textarea></div>
        <div class="form-field full"><label for="intake-measurable">CZY MASZ KONKRETNY CEL LICZBOWY? (OPCJONALNIE)</label><textarea id="intake-measurable" name="measurableGoal" maxlength="800" placeholder="Np. obwód, masa ciała, wynik siłowy lub test sprawnościowy."></textarea></div>
        <div class="form-field"><label for="intake-experience">DOŚWIADCZENIE TRENINGOWE *</label><select id="intake-experience" name="experience" required><option value="">Wybierz</option><option>początkujący</option><option>średniozaawansowany</option><option>zaawansowany</option><option>powrót po przerwie</option></select></div>
        <div class="form-field"><label for="intake-days">ILE DNI W TYGODNIU MOŻESZ TRENOWAĆ? *</label><select id="intake-days" name="daysPerWeek" required><option value="">Wybierz</option><option value="2">2 dni</option><option value="3">3 dni</option><option value="4">4 dni</option><option value="5">5 dni</option><option value="6">6 dni</option><option value="7">7 dni</option></select></div>
        <div class="form-field"><label for="intake-minutes">CZAS JEDNEGO TRENINGU *</label><select id="intake-minutes" name="sessionMinutes" required><option value="">Wybierz</option><option value="30">30 minut</option><option value="45">45 minut</option><option value="60">60 minut</option><option value="75">75 minut</option><option value="90">90 minut</option></select></div>
        <div class="form-field"><label for="intake-start">PREFEROWANY START (OPCJONALNIE)</label><input id="intake-start" name="startDate" type="date"></div>
        <div class="form-field full"><label for="intake-equipment">JAKI SPRZĘT MASZ DO DYSPOZYCJI?</label><textarea id="intake-equipment" name="equipment" maxlength="800" placeholder="Wpisz sprzęt dostępny w domu lub na siłowni."></textarea></div>
        <div class="form-field full"><label for="intake-current">JAK WYGLĄDA TWÓJ OBECNY PLAN? (OPCJONALNIE)</label><textarea id="intake-current" name="currentPlan" maxlength="1000"></textarea></div>
        <div class="form-field full"><label for="intake-difficulty">CO NAJTRUDNIEJ CI OSIĄGNĄĆ LUB UTRZYMAĆ? (OPCJONALNIE)</label><textarea id="intake-difficulty" name="difficulty" maxlength="1000"></textarea></div>
        <fieldset class="health-module">
          <legend>OPCJONALNE INFORMACJE O OGRANICZENIACH ZDROWOTNYCH</legend>
          <p>Możesz pominąć tę część. Informacje mają pomóc uwzględnić ograniczenia w planie treningowym i nie służą diagnozowaniu. Nie wpisuj diagnoz ani danych, które nie są potrzebne do określenia bezpiecznego zakresu treningu.</p>
          <label class="form-consent"><input id="health-consent" name="healthConsent" type="checkbox"><span>Wyrażam wyraźną zgodę na przetwarzanie przekazanych przeze mnie w tej sekcji informacji dotyczących zdrowia w celu uwzględnienia ograniczeń przy przygotowaniu i realizacji planu. Zgodę mogę wycofać.</span></label>
          <div class="health-fields" id="health-fields" hidden>
            <div class="form-field"><label for="health-pain">CZY WYSTĘPUJE BÓL LUB URAZ OGRANICZAJĄCY TRENING?</label><select id="health-pain" name="healthPain"><option value="">Nie podaję</option><option value="tak">Tak</option><option value="nie">Nie</option><option value="nie wiem">Nie wiem</option></select></div>
            <div class="form-field"><label for="health-restriction">CZY MASZ ZALECENIE OGRANICZENIA AKTYWNOŚCI?</label><select id="health-restriction" name="healthRestriction"><option value="">Nie podaję</option><option value="tak">Tak</option><option value="nie">Nie</option><option value="wolę omówić prywatnie">Wolę omówić prywatnie</option></select></div>
            <div class="form-field full"><label for="health-notes">KRÓTKI OPIS OGRANICZENIA (OPCJONALNIE)</label><textarea id="health-notes" name="healthNotes" maxlength="800"></textarea></div>
          </div>
        </fieldset>
        <label class="form-consent"><input id="adult-confirmed" name="adultConfirmed" type="checkbox" required><span>Potwierdzam, że mam ukończone 18 lat. *</span></label>
        <div class="realization-submit"><button class="button button-light" type="submit" id="intake-submit">WYŚLIJ ANKIETĘ <span>↗</span></button><p id="intake-status" class="realization-message" role="status" aria-live="polite"></p></div>
      </form>
    `;
    const form = document.querySelector('#client-intake');
    const healthCheckbox = document.querySelector('#health-consent');
    const healthFields = document.querySelector('#health-fields');
    healthCheckbox?.addEventListener('change', () => { healthFields.hidden = !healthCheckbox.checked; });
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const submit = document.querySelector('#intake-submit');
      const status = document.querySelector('#intake-status');
      submit.disabled = true;
      status.textContent = 'Zapisuję ankietę…';
      const value = name => form.elements[name]?.value ?? '';
      const payload = {
        session_id: sessionId, name: value('name'), email: value('email'), age: value('age'),
        goal: value('goal'), measurableGoal: value('measurableGoal'), experience: value('experience'),
        trainingLocation: value('trainingLocation'), equipment: value('equipment'), daysPerWeek: value('daysPerWeek'),
        sessionMinutes: value('sessionMinutes'), currentPlan: value('currentPlan'), difficulty: value('difficulty'), startDate: value('startDate'),
        adultConfirmed: document.querySelector('#adult-confirmed').checked,
        healthConsent: healthCheckbox.checked,
        healthPain: value('healthPain'), healthRestriction: value('healthRestriction'), healthNotes: value('healthNotes')
      };
      try {
        const response = await fetch('/api/submit-intake', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Nie udało się zapisać ankiety.');
        form.innerHTML = `<div class="realization-success"><strong>Ankieta została wysłana.</strong><br>${escapeHtml(data.message || 'Dziękujemy. Otrzymaliśmy Twoje odpowiedzi.')}</div><a class="button button-outline" href="/">WRÓĆ NA STRONĘ GŁÓWNĄ</a>`;
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
