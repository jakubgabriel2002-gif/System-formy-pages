// Bezpłatna ankieta zgłoszeniowa (/ankieta.html) — słowniki, teksty zgód i walidacja.
// Używane przez publiczny endpoint i panel trenera.
export { userAgentShort } from './raport-lead.js';

// Kroki anonimowego licznika darmowej ankiety (tabela sf_lead_funnel).
export const FUNNEL_STEPS = ['wejscie', 'krok2', 'krok3', 'krok4', 'krok5', 'krok6', 'krok7', 'wyslano'];

export const LEAD_STATUSES = ['nowe', 'w_analizie', 'propozycja', 'klient', 'odrzucone'];
export const LEAD_ENUMS = {
  zakres: ['pro', 'elite', 'plan', 'niewiem'],
  cel: ['redukcja', 'masa', 'sylwetka', 'sila', 'kondycja', 'powrot', 'inne'],
  doswiadczenie: ['poczatkujacy', 'do1roku', '1do3lat', 'powyzej3lat', 'powrot'],
  miejsce: ['dom', 'silownia', 'oba'],
  inwestycja: ['tak', 'nie']
};

// Dokładne brzmienie zgód — to samo jest na stronie i zapisuje się przy każdym zgłoszeniu.
export const LEAD_CONSENT_VERSION = 'ankieta-quiz-v2-2026-11-11';
export const LEAD_CONSENT_PROCESSING_TEXT = 'Zgadzam się na przetwarzanie moich odpowiedzi i danych w celu przygotowania i przesłania mi wskazówek treningowych oraz informacji o możliwej współpracy. Polityka prywatności: https://systemformy.com.pl/polityka-prywatnosci.html';
export const LEAD_CONSENT_MARKETING_TEXT = 'Chcę dostawać od Jakuba Gabriela, prowadzącego SYSTEM FORMY, informacje handlowe i marketingowe na podany e-mail. Zgodę mogę wycofać w każdej chwili.';

export function leadConsentRecord(marketing) {
  return [
    `[${LEAD_CONSENT_VERSION}]`,
    `Zgoda wymagana (zaznaczona): ${LEAD_CONSENT_PROCESSING_TEXT}`,
    `Zgoda opcjonalna (${marketing ? 'zaznaczona' : 'niezaznaczona'}): ${LEAD_CONSENT_MARKETING_TEXT}`
  ].join('\n');
}

const clean = (value, max) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);
const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;
const int = (value, min, max) => { const n = Number(value); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
const num = (value, min, max) => { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null; };

// Zwraca { ok: true, data } albo { ok: false, field, error }.
export function validateLead(body) {
  const data = {
    imie: clean(body?.imie, 80),
    email: clean(body?.email, 254).toLowerCase(),
    wiek: int(body?.wiek, 16, 90),
    wzrost_cm: int(body?.wzrost_cm, 120, 230),
    waga_kg: num(body?.waga_kg, 35, 300),
    zakres: clean(body?.zakres, 10),
    cel: clean(body?.cel, 20),
    cel_opis: clean(body?.cel_opis, 300),
    doswiadczenie: clean(body?.doswiadczenie, 20),
    miejsce: clean(body?.miejsce, 20),
    dni: int(body?.dni, 1, 7),
    inwestycja: clean(body?.inwestycja, 10),
    zgoda_przetwarzanie: body?.zgoda_przetwarzanie === true,
    zgoda_marketing: body?.zgoda_marketing === true
  };
  const fail = (field, error) => ({ ok: false, field, error });
  if (data.imie.length < 2) return fail('imie', 'Podaj imię (min. 2 znaki).');
  if (!EMAIL_RE.test(data.email)) return fail('email', 'Podaj poprawny adres e-mail.');
  if (data.wiek === null) return fail('wiek', 'Podaj wiek (16–90 lat).');
  if (data.wzrost_cm === null) return fail('wzrost_cm', 'Podaj wzrost w centymetrach (120–230).');
  if (data.waga_kg === null) return fail('waga_kg', 'Podaj wagę w kilogramach (35–300).');
  if (!LEAD_ENUMS.zakres.includes(data.zakres)) return fail('zakres', 'Wybierz, jaka współpraca Cię interesuje.');
  if (!LEAD_ENUMS.cel.includes(data.cel)) return fail('cel', 'Wybierz główny cel.');
  if (!LEAD_ENUMS.doswiadczenie.includes(data.doswiadczenie)) return fail('doswiadczenie', 'Wybierz doświadczenie treningowe.');
  if (!LEAD_ENUMS.miejsce.includes(data.miejsce)) return fail('miejsce', 'Wybierz, gdzie trenujesz.');
  if (data.dni === null) return fail('dni', 'Wybierz, ile dni w tygodniu możesz trenować.');
  if (!LEAD_ENUMS.inwestycja.includes(data.inwestycja)) return fail('inwestycja', 'Zaznacz odpowiedź Tak albo Nie.');
  if (!data.zgoda_przetwarzanie) return fail('zgoda_przetwarzanie', 'Zaznacz zgodę, żebym mógł przygotować i wysłać wskazówki.');
  return { ok: true, data };
}
