export const CATALOG = Object.freeze({
  start: {
    key: 'start', name: 'SYSTEM START', amount: 9900, displayPrice: '99,00 zł',
    duration: 'Produkt cyfrowy', fulfillment: 'download', page: 'produkt-start.html',
    stripeDescription: 'Gotowy plan A/B/C do domu lub na siłownię, instrukcje ćwiczeń, materiały edukacyjne, podstawy żywienia i regeneracji oraz arkusz postępów.',
    bullets: [
      'Gotowy plan treningowy do wyboru: dom lub siłownia',
      'Trzy jednostki treningowe A/B/C',
      'Instrukcje wykonywania ćwiczeń',
      'E-book startowy z podstawami treningu',
      'Podstawy żywienia i regeneracji',
      'Instrukcja progresowania i arkusz monitorowania postępów'
    ]
  },
  pro: {
    key: 'pro', name: 'SYSTEM PRO', amount: 69900, displayPrice: '699,00 zł',
    duration: '8 tygodni współpracy', fulfillment: 'intake', page: 'produkt-pro.html',
    stripeDescription: '8 tygodni współpracy: analiza celu, indywidualny plan, wskazówki żywieniowe i regeneracyjne, kontrola co 2 tygodnie, jedna aktualizacja i kontakt przez czat.',
    bullets: [
      'Analiza celu, doświadczenia i możliwości',
      'Indywidualny plan treningowy dopasowany do dostępnego sprzętu',
      'Wskazówki dotyczące żywienia i regeneracji',
      'Materiały edukacyjne i arkusz monitorowania postępów',
      'Kontrola postępów co 2 tygodnie',
      'Jedna zaplanowana aktualizacja planu',
      'Kontakt z trenerem przez czat'
    ]
  },
  elite: {
    key: 'elite', name: 'SYSTEM ELITE', amount: 149900, displayPrice: '1499,00 zł',
    duration: '12 tygodni współpracy', fulfillment: 'intake', page: 'produkt-elite.html',
    stripeDescription: '12 tygodni indywidualnej współpracy: analiza, plan, cotygodniowa kontrola, regularne korekty, raporty i priorytetowy kontakt.',
    bullets: [
      'Szczegółowa analiza celu, doświadczenia i możliwości',
      'Indywidualny plan treningowy oraz wskazówki żywieniowe i regeneracyjne',
      'Materiały edukacyjne i arkusz monitorowania postępów',
      'Cotygodniowa analiza postępów i raporty',
      'Regularne aktualizacje planu treningowego',
      'Priorytetowy kontakt z trenerem przez czat',
      'Analiza trudności, podsumowanie 12 tygodni i dalsze rekomendacje',
      'Gwarancja kontynuacji na warunkach określonych w ofercie i karcie celu ELITE'
    ]
  },
  'individual-basic': {
    key: 'individual-basic', name: 'PLAN INDYWIDUALNY — SAM PLAN', amount: 9999, displayPrice: '99,99 zł',
    duration: '4 tygodnie', fulfillment: 'intake', page: 'produkt-plan-basic.html',
    stripeDescription: 'Indywidualny plan treningowy na 4 tygodnie, przygotowany na podstawie celu, doświadczenia, możliwości i dostępnego sprzętu. Bez monitoringu i wsparcia.',
    bullets: [
      'Indywidualny plan treningowy na 4 tygodnie',
      'Dobór ćwiczeń do celu, poziomu i możliwości',
      'Uwzględnienie dostępnego sprzętu i warunków treningowych',
      'Instrukcje realizacji planu i progresji'
    ]
  },
  'individual-monitor': {
    key: 'individual-monitor', name: 'PLAN INDYWIDUALNY + MONITORING I WSPARCIE', amount: 14999, displayPrice: '149,99 zł',
    duration: '4 tygodnie', fulfillment: 'intake', page: 'produkt-plan-monitoring.html',
    stripeDescription: 'Indywidualny plan treningowy na 4 tygodnie, monitorowanie postępów i wsparcie trenera przez cały okres realizacji.',
    bullets: [
      'Indywidualny plan treningowy na 4 tygodnie',
      'Dobór ćwiczeń do celu, poziomu i dostępnego sprzętu',
      'Monitorowanie postępów podczas realizacji planu',
      'Analiza przekazywanych raportów',
      'Wsparcie i kontakt z trenerem'
    ]
  },
  'individual-full': {
    key: 'individual-full', name: 'PLAN INDYWIDUALNY + MONITORING + KONTROLA ĆWICZEŃ', amount: 19999, displayPrice: '199,99 zł',
    duration: '4 tygodnie', fulfillment: 'intake', page: 'produkt-plan-full.html',
    stripeDescription: 'Indywidualny plan na 4 tygodnie, monitoring postępów, wsparcie trenera oraz analizę nagrań i kontrolę techniki ćwiczeń.',
    bullets: [
      'Indywidualny plan treningowy na 4 tygodnie',
      'Dobór ćwiczeń do celu, poziomu i dostępnego sprzętu',
      'Monitorowanie postępów podczas realizacji planu',
      'Wsparcie i kontakt z trenerem',
      'Analiza przesłanych nagrań wybranych ćwiczeń',
      'Wskazówki dotyczące poprawy techniki wykonywania ćwiczeń'
    ]
  }
});

export function isValidProductKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(CATALOG, key);
}
