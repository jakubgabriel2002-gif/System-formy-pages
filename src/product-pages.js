(() => {
  'use strict';
  const CATALOG = {
    pro: {
      eyebrow: '02 / WSPÓŁPRACA INDYWIDUALNA', title: 'SYSTEM <span>PRO.</span>',
      subtitle: 'Osiem tygodni indywidualnej współpracy. Otrzymujesz plan dopasowany do celu i możliwości, regularną kontrolę postępów oraz kontakt z trenerem.',
      price: '699,00', duration: '8 TYGODNI WSPÓŁPRACY',
      bullets: ['Analiza celu, doświadczenia i możliwości', 'Indywidualny plan treningowy', 'Dobór ćwiczeń do dostępnego sprzętu', 'Wskazówki dotyczące żywienia i regeneracji', 'Materiały edukacyjne i arkusz postępów', 'Kontrola postępów co 2 tygodnie', 'Jedna zaplanowana korekta planu', 'Kontakt z trenerem przez czat'],
      process: ['Wypełniasz bezpłatną ankietę zgłoszeniową.', 'Otrzymujesz e-mail z propozycją współpracy i linkiem do płatności.', 'Po płatności wypełniasz ankietę startową, a ja przygotowuję plan i zaczynamy 8 tygodni współpracy.'],
      note: 'Pakiet obejmuje 8 tygodni współpracy. Kontakt odbywa się w standardowej kolejności obsługi.'
    },
    elite: {
      eyebrow: '03 / ROZSZERZONA WSPÓŁPRACA', title: 'SYSTEM <span>ELITE.</span>',
      subtitle: 'Dwanaście tygodni najbardziej rozbudowanego prowadzenia: cotygodniowa analiza, regularne korekty i priorytetowy kontakt z trenerem.',
      price: '1499,00', duration: '12 TYGODNI WSPÓŁPRACY',
      bullets: ['Szczegółowa analiza celu, doświadczenia i możliwości', 'Indywidualny plan treningowy', 'Wskazówki dotyczące żywienia i regeneracji', 'Materiały edukacyjne i arkusz postępów', 'Cotygodniowa analiza i raporty', 'Regularne aktualizacje planu treningowego', 'Priorytetowy kontakt z trenerem przez czat', 'Analiza trudności i podsumowanie współpracy', 'Dalsze rekomendacje', 'Gwarancja kontynuacji na zasadach określonych w ofercie i karcie celu ELITE'],
      process: ['Wypełniasz bezpłatną ankietę zgłoszeniową.', 'Otrzymujesz e-mail z propozycją współpracy i linkiem do płatności.', 'Po płatności wypełniasz ankietę startową, ustalamy mierzalny cel i zaczynamy 12 tygodni współpracy.'],
      note: 'Warunki gwarancji ELITE, w tym zaakceptowany cel i obowiązki uczestnika, są określane przed rozpoczęciem współpracy w karcie celu.'
    },
    'individual-basic': {
      eyebrow: '04 / PLAN INDYWIDUALNY', title: 'SAM <span>PLAN.</span>',
      subtitle: 'Indywidualny plan treningowy przygotowany na cztery tygodnie na podstawie Twojego celu, doświadczenia, możliwości i dostępnego sprzętu.',
      price: '99,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dobór ćwiczeń do celu, poziomu i możliwości', 'Uwzględnienie dostępnego sprzętu i warunków treningowych', 'Instrukcje realizacji planu i progresji'],
      process: ['Opłacasz zamówienie przez bezpieczną płatność Stripe.', 'Zostajesz przekierowany do ankiety o plan treningowy.', 'Otrzymujesz indywidualny plan do samodzielnej realizacji.'],
      note: 'Ten wariant obejmuje wyłącznie przygotowanie planu. Nie zawiera monitorowania postępów ani bieżącego wsparcia trenera.'
    },
    'individual-monitor': {
      eyebrow: '05 / PLAN + MONITORING', title: 'MONITORING <span>I WSPARCIE.</span>',
      subtitle: 'Indywidualny plan na cztery tygodnie rozszerzony o monitorowanie postępów i wsparcie trenera podczas realizacji.',
      price: '149,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dopasowanie do celu, doświadczenia, możliwości i dostępnego sprzętu', 'Monitorowanie postępów przez 4 tygodnie', 'Kontakt i wsparcie w realizacji planu', 'Możliwość zgłoszenia ćwiczenia do wymiany, jeśli nie pasuje do Twoich możliwości — po wspólnym ustaleniu w ramach planu'],
      process: ['Opłacasz zamówienie przez bezpieczną płatność Stripe.', 'Zostajesz przekierowany do ankiety o plan treningowy.', 'Otrzymujesz plan i korzystasz z monitorowania oraz wsparcia przez 4 tygodnie.'],
      note: 'Wariant obejmuje 4 tygodnie planu, monitorowania, kontaktu i wsparcia. Ewentualna podmiana ćwiczenia jest ustalana na podstawie zgłoszonej trudności i uzgodnionego zakresu planu.'
    },
    'individual-full': {
      eyebrow: '06 / PLAN + PEŁNIEJSZA KONTROLA', title: 'INDYWIDUALNY <span>FULL.</span>',
      subtitle: 'Indywidualny plan na cztery tygodnie, monitoring i wsparcie, rozszerzone o kontrolę techniki na podstawie uzgodnionych nagrań wskazanych ćwiczeń.',
      price: '199,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dopasowanie do celu, doświadczenia, możliwości i dostępnego sprzętu', 'Monitorowanie postępów przez 4 tygodnie', 'Kontakt i wsparcie w realizacji planu', 'Kontrola techniki na podstawie uzgodnionych nagrań wskazanych ćwiczeń', 'Wskazówki dotyczące poprawy techniki wykonywania ćwiczeń'],
      process: ['Opłacasz zamówienie przez bezpieczną płatność Stripe.', 'Zostajesz przekierowany do ankiety o plan treningowy.', 'Otrzymujesz plan, monitoring, wsparcie i analizę przesłanych nagrań w czasie 4 tygodni.'],
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
  // PRO i ELITE nie są kupowane na stronie: najpierw bezpłatna ankieta, potem link płatności e-mailem.
  // Plany indywidualne kupuje się przez stałe linki płatności Stripe (src/payment-links.js).
  const isCoaching = productKey === 'pro' || productKey === 'elite';
  const paymentLink = String((window.SF_PAYMENT_LINKS || {})[productKey] || '');
  const stepLabels = isCoaching ? ['ANKIETA', 'PROPOZYCJA', 'START'] : ['PŁATNOŚĆ', 'ANKIETA', 'PLAN'];
  const bullets = product.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const steps = product.process.map((item, index) => `<article class="product-step"><b>0${index + 1}</b><strong>${stepLabels[index]}</strong><p>${escapeHtml(item)}</p></article>`).join('');
  const coachingBox = `
        <p class="price-caption">${escapeHtml(product.duration)}</p>
        <p class="elite-price-note">Szczegóły współpracy i cenę otrzymasz e-mailem po bezpłatnej ankiecie zgłoszeniowej.</p>
        <a class="button button-light product-cta" href="/ankieta.html?zakres=${escapeHtml(productKey)}">WYPEŁNIJ BEZPŁATNĄ ANKIETĘ</a>
        <p class="checkout-microcopy">Ankieta jest bezpłatna i do niczego nie zobowiązuje. Po jej wysłaniu od razu pobierzesz ebook „Zacznij trenować”.</p>`;
  const planBox = `
        <div class="price-line"><strong>${product.price}</strong><span>zł</span></div>
        <p class="price-caption">${escapeHtml(product.duration)}</p>
        ${paymentLink
          ? `<a class="button button-light product-cta" href="${escapeHtml(paymentLink)}" rel="noopener">KUPUJĘ I PRZECHODZĘ DO PŁATNOŚCI</a>`
          : '<p class="elite-price-note">Płatność za ten plan będzie dostępna wkrótce.</p>'}
        <p class="checkout-microcopy">Płatność obsługuje Stripe. Na stronie płatności akceptujesz <a href="/regulamin.html" target="_blank" rel="noopener">Regulamin</a>. Po opłaceniu zostaniesz przekierowany do ankiety, na podstawie której przygotuję plan.</p>
        <p class="checkout-policy">Płatność jest jednorazowa. Przed zakupem sprawdź zakres, czas trwania i warunki realizacji przedstawione na tej stronie.</p>`;
  root.innerHTML = `
    <a class="product-back" href="${isCoaching ? '/#oferta' : '/plan-indywidualny.html'}">WRÓĆ DO ${isCoaching ? 'OFERTY' : 'PLANÓW TRENINGOWYCH'}</a>
    <p class="eyebrow"><span class="eyebrow-line"></span> ${escapeHtml(product.eyebrow)}</p>
    <h1>${product.title}</h1>
    <p class="product-subtitle">${escapeHtml(product.subtitle)}</p>
    <div class="product-details-grid">
      <section class="product-includes" aria-labelledby="product-includes-title">
        <h2 id="product-includes-title">CO <span>OTRZYMUJESZ?</span></h2>
        <ul>${bullets}</ul>
      </section>
      <aside class="checkout-box" aria-label="${isCoaching ? 'Zgłoszenie do współpracy' : 'Zakup planu'}">
        <p class="eyebrow"><span class="eyebrow-line"></span> WYBRANA OFERTA</p>
        <h2>${product.title}</h2>
        ${isCoaching ? coachingBox : planBox}
      </aside>
    </div>
    <div class="product-steps" aria-label="Jak to wygląda">${steps}</div>
    <div class="product-guarantee-note">${escapeHtml(product.note)}</div>
  `;

  // Linki prawne są wspólne dla wszystkich podstron sprzedażowych.
  const productFooter = document.querySelector('.product-footer');
  if (productFooter && !productFooter.querySelector('.footer-legal-links')) {
    const legalNav = document.createElement('nav');
    legalNav.className = 'footer-legal-links';
    legalNav.setAttribute('aria-label', 'Dokumenty prawne');
    legalNav.innerHTML = '<a href="/regulamin.html">REGULAMIN</a><a href="/polityka-prywatnosci.html">POLITYKA PRYWATNOŚCI</a><a href="/cookies.html">COOKIES</a>';
    productFooter.appendChild(legalNav);
  }

  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
})();
