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
      bullets: ['Analiza celu, doświadczenia i możliwości', 'Indywidualny plan treningowy', 'Dobór ćwiczeń do dostępnego sprzętu', 'Wskazówki dotyczące żywienia i regeneracji', 'Materiały edukacyjne i arkusz postępów', 'Kontrola postępów co 2 tygodnie', 'Jedna zaplanowana aktualizacja planu', 'Kontakt z trenerem przez czat'],
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
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dobór ćwiczeń do celu, poziomu i dostępnego sprzętu', 'Monitorowanie postępów podczas realizacji planu', 'Analiza przekazywanych raportów', 'Wsparcie i kontakt z trenerem'],
      process: ['Opłacasz zamówienie.', 'Wypełniasz ankietę startową.', 'Otrzymujesz plan i korzystasz z monitorowania oraz wsparcia przez 4 tygodnie.'],
      note: 'Wariant obejmuje cztery tygodnie planu, monitorowania postępów i kontaktu z trenerem.'
    },
    'individual-full': {
      eyebrow: '06 / PLAN + PEŁNIEJSZA KONTROLA', title: 'INDYWIDUALNY <span>FULL.</span>',
      subtitle: 'Indywidualny plan na cztery tygodnie, monitoring i wsparcie, rozszerzone o kontrolę techniki ćwiczeń na podstawie przesłanych nagrań.',
      price: '199,99', duration: '4 TYGODNIE / JEDNORAZOWO',
      bullets: ['Indywidualny plan treningowy na 4 tygodnie', 'Dobór ćwiczeń do celu, poziomu i dostępnego sprzętu', 'Monitorowanie postępów podczas realizacji planu', 'Wsparcie i kontakt z trenerem', 'Analiza przesłanych nagrań wybranych ćwiczeń', 'Wskazówki dotyczące poprawy techniki wykonywania ćwiczeń'],
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
  const bullets = product.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const steps = product.process.map((item, index) => `<article class="product-step"><b>0${index + 1}</b><strong>${['WYBIERASZ', 'UZUPEŁNIASZ', 'ROZPOCZYNASZ'][index]}</strong><p>${escapeHtml(item)}</p></article>`).join('');
  root.innerHTML = `
    <a class="product-back" href="${productKey.startsWith('individual-') ? '/plan-indywidualny.html' : '/#oferta'}">← WRÓĆ DO ${productKey.startsWith('individual-') ? 'PLANÓW INDYWIDUALNYCH' : 'OFERTY'}</a>
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
        <button class="button button-light" type="button" id="product-buy" data-product="${escapeHtml(productKey)}">KUPUJĘ I PRZECHODZĘ DO PŁATNOŚCI <span>↗</span></button>
        <p class="checkout-microcopy">Płatność obsługuje Stripe. Po opłaceniu zamówienia wrócisz na stronę SYSTEM FORMY, gdzie pobierzesz materiały lub wypełnisz ankietę.</p>
        <p class="checkout-policy">Płatność jest jednorazowa. Przed zakupem sprawdź zakres świadczenia, czas trwania i warunki realizacji przedstawione na tej stronie.</p>
      </aside>
    </div>
    <div class="product-steps" aria-label="Jak wygląda zakup">${steps}</div>
    <div class="product-guarantee-note">${escapeHtml(product.note)}</div>
    <p id="product-buy-status" class="realization-message" role="status" aria-live="polite"></p>
  `;

  const buy = document.querySelector('#product-buy');
  const status = document.querySelector('#product-buy-status');
  buy?.addEventListener('click', async () => {
    if (buy.disabled) return;
    buy.disabled = true;
    const original = buy.innerHTML;
    buy.textContent = 'PRZYGOTOWUJĘ PŁATNOŚĆ…';
    status.textContent = '';
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ product: productKey })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się rozpocząć płatności.');
      const checkout = new URL(data.url);
      if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('Stripe zwrócił nieprawidłowy adres płatności.');
      window.location.assign(checkout.href);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się rozpocząć płatności.';
      status.classList.add('realization-error');
      buy.disabled = false;
      buy.innerHTML = original;
    }
  });

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
