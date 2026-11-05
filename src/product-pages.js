(() => {
  'use strict';
  const CATALOG = {
    start: {
      eyebrow: '01 / PRODUKT CYFROWY', title: 'SYSTEM <span>START.</span>',
      subtitle: 'Gotowy plan treningowy i uporządkowany system działania. Wybierasz dom lub siłownię i realizujesz trening samodzielnie, we własnym tempie.',
      price: '99,00', duration: 'JEDNORAZOWY ZAKUP',
      bullets: ['Gotowy plan treningowy do wyboru: dom lub siłownia', 'Trzy jednostki treningowe A/B/C', 'Instrukcje wykonywania ćwiczeń', 'E-book startowy z podstawami treningu', 'Podstawy żywienia i regeneracji', 'Instrukcja progresowania', 'Arkusz monitorowania postępów'],
      process: ['Wybierasz plan do domu lub na siłownię.', 'Po płatności wybierasz odpowiednią wersję materiałów.', 'Pobierasz pakiet i realizujesz go samodzielnie.'],
      note: 'SYSTEM START jest produktem do samodzielnej realizacji. Nie obejmuje indywidualnego monitorowania ani konsultacji.'
    },
    pro: {
      eyebrow: '02 / WSPÓŁPRACA INDYWIDUALNA', title: 'SYSTEM <span>PRO.</span>',
      subtitle: 'Osiem tygodni indywidualnej współpracy. Otrzymujesz plan dopasowany do celu i możliwości, regularną kontrolę postępów oraz kontakt z trenerem.',
      price: '699,00', duration: '8 TYGODNI WSPÓŁPRACY',
      bullets: ['Analiza celu, doświadczenia i możliwości', 'Indywidualny plan treningowy', 'Dobór ćwiczeń do dostępnego sprzętu', 'Wskazówki dotyczące żywienia i regeneracji', 'Materiały edukacyjne i arkusz postępów', 'Kontrola postępów co 2 tygodnie', 'Jedna zaplanowana korekta planu', 'Kontakt z trenerem przez czat'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę startową.', 'Na podstawie ankiety przygotowywany jest indywidualny plan i rozpoczyna się współpraca.'],
      note: 'Pakiet obejmuje 8 tygodni współpracy. Kontakt odbywa się w standardowej kolejności obsługi.'
    },
    elite: {
      eyebrow: '03 / ROZSZERZONA WSPÓŁPRACA', title: 'SYSTEM <span>ELITE.</span>',
      subtitle: 'Dwanaście tygodni najbardziej rozbudowanego prowadzenia: cotygodniowa analiza, regularne korekty i priorytetowy kontakt z trenerem.',
      price: '1499,00', duration: '12 TYGODNI WSPÓŁPRACY',
      bullets: ['Szczegółowa analiza celu, doświadczenia i możliwości', 'Indywidualny plan treningowy', 'Wskazówki dotyczące żywienia i regeneracji', 'Materiały edukacyjne i arkusz postępów', 'Cotygodniowa analiza i raporty', 'Regularne aktualizacje planu treningowego', 'Priorytetowy kontakt z trenerem przez czat', 'Analiza trudności i podsumowanie współpracy', 'Dalsze rekomendacje', 'Gwarancja kontynuacji na zasadach określonych w ofercie i karcie celu ELITE'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę startową i ustalany jest mierzalny cel.', 'Rozpoczynasz 12 tygodni współpracy z cotygodniową analizą.'],
      note: 'Warunki gwarancji ELITE, w tym zaakceptowany cel i obowiązki uczestnika, są określane przed rozpoczęciem współpracy w karcie celu.'
    },
    'individual-basic': {
      eyebrow: '04 / PLAN INDYWIDUALNY', title: 'SAM <span>PLAN.</span>',
      subtitle: 'Indywidualny plan treningowy przygotowany na cztery tygodnie na podstawie Twojego celu, doświadczenia, możliwości i dostępnego sprzętu.',
      price: '99,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dobór ćwiczeń do celu, poziomu i możliwości', 'Uwzględnienie dostępnego sprzętu i warunków treningowych', 'Instrukcje realizacji planu i progresji'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę, która pozwoli dopasować plan.', 'Otrzymujesz indywidualny plan do samodzielnej realizacji.'],
      note: 'Ten wariant obejmuje wyłącznie przygotowanie planu. Nie zawiera monitorowania postępów ani bieżącego wsparcia trenera.'
    },
    'individual-monitor': {
      eyebrow: '05 / PLAN + MONITORING', title: 'MONITORING <span>I WSPARCIE.</span>',
      subtitle: 'Indywidualny plan na cztery tygodnie rozszerzony o monitorowanie postępów i wsparcie trenera podczas realizacji.',
      price: '149,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dopasowanie do celu, doświadczenia, możliwości i dostępnego sprzętu', 'Monitorowanie postępów przez 4 tygodnie', 'Kontakt i wsparcie w realizacji planu', 'Możliwość zgłoszenia ćwiczenia do wymiany, jeśli nie pasuje do Twoich możliwości — po wspólnym ustaleniu w ramach planu'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę startową.', 'Otrzymujesz plan i korzystasz z monitorowania oraz wsparcia przez 4 tygodnie.'],
      note: 'Wariant obejmuje 4 tygodnie planu, monitorowania, kontaktu i wsparcia. Ewentualna podmiana ćwiczenia jest ustalana na podstawie zgłoszonej trudności i uzgodnionego zakresu planu.'
    },
    'individual-full': {
      eyebrow: '06 / PLAN + PEŁNIEJSZA KONTROLA', title: 'INDYWIDUALNY <span>FULL.</span>',
      subtitle: 'Indywidualny plan na cztery tygodnie, monitoring i wsparcie, rozszerzone o kontrolę techniki na podstawie uzgodnionych nagrań wskazanych ćwiczeń.',
      price: '199,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dopasowanie do celu, doświadczenia, możliwości i dostępnego sprzętu', 'Monitorowanie postępów przez 4 tygodnie', 'Kontakt i wsparcie w realizacji planu', 'Kontrola techniki na podstawie uzgodnionych nagrań wskazanych ćwiczeń', 'Wskazówki dotyczące poprawy techniki wykonywania ćwiczeń'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę startową.', 'Otrzymujesz plan, monitoring, wsparcie i analizę przesłanych nagrań w czasie 4 tygodni.'],
      note: 'Zakres kontroli dotyczy nagrań wybranych ćwiczeń przekazanych w ramach współpracy.'
    }
  };

  const body = document.body;
  const productKey = body?.dataset.productPage;
  const product = CATALOG[productKey];
  const root = document.querySelector('#product-page-content');
  if (!root) return;
  if (!product) {
    root.innerHTML = '<div class="product-error"><h1>Nie znaleziono produktu.</h1><p>Wróć do <a href="/#oferta">oferty SYSTEM FORMY</a> i wybierz produkt ponownie.</p></div>';
    return;
  }

  document.title = `${product.title.replace(/<[^>]+>/g, '').replace(/\./g, '')} — SYSTEM FORMY`;
  const pageParams = new URLSearchParams(window.location.search);
  // ELITE: domyślnie aplikacja i bezpłatna analiza celu. Bezpośredni zakup tylko pod linkiem
  // produkt-elite.html?zakup=1, który trener wysyła po zaakceptowaniu zgłoszenia.
  const eliteApplyMode = productKey === 'elite' && pageParams.get('zakup') !== '1';
  const applyUrl = productKey === 'pro' ? '/produkt-elite.html?z=pro#aplikuj' : '#aplikuj';
  const processItems = eliteApplyMode
    ? ['Wypełniasz krótkie zgłoszenie z celem, doświadczeniem i możliwościami.', 'Analizuję zgłoszenie i odsyłam propozycję współpracy na e-mail.', 'Po akceptacji opłacasz pakiet, wypełniasz ankietę startową i zaczynasz 12 tygodni współpracy.']
    : product.process;
  const stepLabels = eliteApplyMode ? ['APLIKUJESZ', 'ANALIZA', 'ROZPOCZYNASZ'] : ['WYBIERASZ', 'UZUPEŁNIASZ', 'ROZPOCZYNASZ'];
  const bullets = product.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const steps = processItems.map((item, index) => `<article class="product-step"><b>0${index + 1}</b><strong>${stepLabels[index]}</strong><p>${escapeHtml(item)}</p></article>`).join('');
  const serviceProducts = new Set(['pro', 'elite', 'individual-monitor', 'individual-full']);
  const needsEarlyServiceStart = serviceProducts.has(productKey);
  const digitalContentProducts = new Set(['start', 'individual-basic']);
  const isDigitalOnly = digitalContentProducts.has(productKey);
  const digitalContentLabel = productKey === 'start'
    ? 'Wyrażam uprzednią zgodę na rozpoczęcie dostarczania materiałów cyfrowych SYSTEM START przed upływem 14 dni. Przyjmuję do wiadomości, że po rozpoczęciu ich dostarczania utracę prawo odstąpienia od umowy w zakresie tych treści cyfrowych, jeżeli zostaną spełnione wszystkie warunki ustawowe.'
    : 'Wyrażam uprzednią zgodę na rozpoczęcie dostarczania indywidualnego planu jako treści cyfrowej przed upływem 14 dni. Przyjmuję do wiadomości, że po rozpoczęciu jego dostarczania utracę prawo odstąpienia od umowy w zakresie tej treści cyfrowej, jeżeli zostaną spełnione wszystkie warunki ustawowe.';
  const consentMarkup = `
    <div class="checkout-consents" aria-labelledby="checkout-consents-title">
      <p class="checkout-consents-title" id="checkout-consents-title">OŚWIADCZENIA PRZED ZAKUPEM</p>
      <label class="checkout-consent"><input type="checkbox" data-consent="termsAccepted" required><span>Akceptuję <a href="/regulamin.html" target="_blank" rel="noopener">Regulamin sprzedaży i usług</a>. *</span></label>
      <label class="checkout-consent"><input type="checkbox" data-consent="privacyAcknowledged" required><span>Potwierdzam, że zapoznałem(-am) się z <a href="/polityka-prywatnosci.html" target="_blank" rel="noopener">Polityką prywatności</a>. *</span></label>
      ${isDigitalOnly ? `<label class="checkout-consent"><input type="checkbox" data-consent="digitalContentConsent" required><span>${escapeHtml(digitalContentLabel)} *</span></label>` : ''}
      ${needsEarlyServiceStart ? `<label class="checkout-consent"><input type="checkbox" data-consent="serviceStartRequested" required><span>Wyraźnie żądam rozpoczęcia świadczenia usługi przed upływem 14 dni. Przyjmuję do wiadomości, że w razie odstąpienia po rozpoczęciu usługi zapłacę proporcjonalnie za część usługi wykonaną do chwili odstąpienia, w tym za analizę i przygotowanie planu, jeżeli te prace zostały już wykonane. Przyjmuję również do wiadomości, że po pełnym wykonaniu usługi na moje wyraźne żądanie mogę utracić prawo odstąpienia, jeżeli zostaną spełnione wszystkie warunki ustawowe. *</span></label>` : ''}
      <p class="checkout-consents-note">Oświadczenia dotyczące treści cyfrowej i wcześniejszego rozpoczęcia usługi są zapisywane przy zamówieniu. Gwiazdka oznacza oświadczenie wymagane do przejścia do płatności.</p>
    </div>`;
  root.innerHTML = `
    <a class="product-back" href="${productKey.startsWith('individual-') ? '/plan-indywidualny.html' : '/#oferta'}">WRÓĆ DO ${productKey.startsWith('individual-') ? 'PLANÓW INDYWIDUALNYCH' : 'OFERTY'}</a>
    <p class="eyebrow"><span class="eyebrow-line"></span> ${escapeHtml(product.eyebrow)}</p>
    <h1>${product.title}</h1>
    <p class="product-subtitle">${escapeHtml(product.subtitle)}</p>
    <div class="product-details-grid">
      <section class="product-includes" aria-labelledby="product-includes-title">
        <h2 id="product-includes-title">CO <span>OTRZYMUJESZ?</span></h2>
        <ul>${bullets}</ul>
      </section>
      <aside class="checkout-box" aria-label="Zakup produktu">
        <p class="eyebrow"><span class="eyebrow-line"></span> WYBRANA OFERTA</p>
        <h2>${product.title}</h2>
        <div class="price-line"><strong>${product.price}</strong><span>zł</span></div>
        <p class="price-caption">${escapeHtml(product.duration)}</p>
        ${eliteApplyMode ? `
        <a class="button button-light elite-apply-cta" href="#aplikuj">APLIKUJ DO ELITE – BEZPŁATNA ANALIZA CELU</a>
        <p class="checkout-microcopy">Zgłoszenie jest bezpłatne i do niczego nie zobowiązuje. Po analizie celu otrzymasz propozycję współpracy na e-mail.</p>` : `
        ${consentMarkup}
        <button class="button button-light" type="button" id="product-buy" data-product="${escapeHtml(productKey)}" disabled>KUPUJĘ I PRZECHODZĘ DO PŁATNOŚCI</button>
        ${productKey === 'pro' ? `<a class="button button-outline elite-analysis-link" href="${applyUrl}">NIE WIESZ, CZY TO DLA CIEBIE? BEZPŁATNA ANALIZA</a>` : ''}
        <p class="checkout-microcopy">Płatność obsługuje Stripe. Po opłaceniu zamówienia wrócisz na stronę SYSTEM FORMY, gdzie pobierzesz materiały lub wypełnisz ankietę.</p>
        <p class="checkout-policy">Płatność jest jednorazowa. Przed zakupem sprawdź zakres świadczenia, czas trwania i warunki realizacji przedstawione na tej stronie.</p>`}
      </aside>
    </div>
    <div class="product-steps" aria-label="Jak wygląda zakup">${steps}</div>
    <div class="product-guarantee-note">${escapeHtml(product.note)}</div>
    <p id="product-buy-status" class="realization-message" role="status" aria-live="polite"></p>
  `;

  const buy = document.querySelector('#product-buy');
  const status = document.querySelector('#product-buy-status');
  const consentInputs = Array.from(root.querySelectorAll('[data-consent]'));
  const readConsents = () => Object.fromEntries(consentInputs.map(input => [input.dataset.consent, input.checked]));
  const updateBuyState = () => {
    const complete = consentInputs.length > 0 && consentInputs.every(input => input.checked);
    if (buy) buy.disabled = !complete || buy.dataset.loading === 'true';
    return complete;
  };
  consentInputs.forEach(input => input.addEventListener('change', updateBuyState));
  updateBuyState();
  const applySection = document.querySelector('#aplikuj');
  if (applySection) applySection.hidden = !eliteApplyMode;

  buy?.addEventListener('click', async () => {
    if (buy.disabled || !updateBuyState()) {
      consentInputs.find(input => !input.checked)?.focus();
      if (status) status.textContent = 'Zaznacz wszystkie wymagane oświadczenia, aby przejść do płatności.';
      return;
    }
    buy.dataset.loading = 'true';
    buy.disabled = true;
    const original = 'KUPUJĘ I PRZECHODZĘ DO PŁATNOŚCI';
    buy.textContent = 'PRZYGOTOWUJĘ PŁATNOŚĆ…';
    status.textContent = '';
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ product: productKey, consents: readConsents() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się rozpocząć płatności.');
      const checkout = new URL(data.url);
      if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('Stripe zwrócił nieprawidłowy adres płatności.');
      window.location.assign(checkout.href);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się rozpocząć płatności.';
      status.classList.add('realization-error');
      buy.dataset.loading = 'false';
      buy.disabled = !consentInputs.every(input => input.checked);
      buy.textContent = original;
    }
  });

  // Linki prawne są wspólne dla wszystkich podstron sprzedażowych.
  const productFooter = document.querySelector('.product-footer');
  if (productFooter && !productFooter.querySelector('.footer-legal-links')) {
    const legalNav = document.createElement('nav');
    legalNav.className = 'footer-legal-links';
    legalNav.setAttribute('aria-label', 'Dokumenty prawne');
    legalNav.innerHTML = '<a href="/regulamin.html">REGULAMIN</a><a href="/polityka-prywatnosci.html">POLITYKA PRYWATNOŚCI</a><a href="/cookies.html">COOKIES</a>';
    productFooter.appendChild(legalNav);
  }

  const toast = document.querySelector('#site-toast');
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'cancelled' && toast) {
    toast.textContent = 'Płatność została anulowana. Możesz spróbować ponownie.';
    toast.classList.add('show');
  }
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
})();
