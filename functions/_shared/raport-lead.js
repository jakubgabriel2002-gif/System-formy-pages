// Wspólne słowniki, teksty zgód i walidacja zgłoszeń "Bezpłatny Raport startowy".
// Używane przez publiczny endpoint i panel trenera.
import { normalizeProfileUrl } from './elite-application.js';

export const RAPORT_STATUSES = ['nowe', 'raport_wyslany', 'rozmowa', 'klient', 'odrzucone'];

export const RAPORT_ENUMS = {
  zrodlo: ['instagram', 'tiktok', 'youtube', 'facebook', 'inne'],
  cel: ['sylwetka', 'sila', 'powrot', 'inne'],
  doswiadczenie: ['poczatkujacy', 'do1roku', '1do3lat', 'powyzej3lat'],
  miejsce: ['dom', 'silownia', 'oba'],
  inwestycja: ['tak', 'nie']
};

// Dokładne brzmienie zgód. Ten sam tekst jest na stronie /raport-startowy.html
// i jest zapisywany przy każdym zgłoszeniu (kolumna tresc_zgody).
export const CONSENT_VERSION = 'raport-startowy-v1';
export const CONSENT_PROCESSING_TEXT = 'Zgadzam się na przetwarzanie moich danych w celu przygotowania i wysłania raportu. Polityka prywatności: https://systemformy.com.pl/polityka-prywatnosci.html';
export const CONSENT_MARKETING_TEXT = 'Chcę otrzymywać od System Formy wiadomości o ofercie.';

export function consentRecord(marketing) {
  return [
    `[${CONSENT_VERSION}]`,
    `Zgoda wymagana (zaznaczona): ${CONSENT_PROCESSING_TEXT}`,
    `Zgoda opcjonalna (${marketing ? 'zaznaczona' : 'niezaznaczona'}): ${CONSENT_MARKETING_TEXT}`
  ].join('\n');
}

const clean = (value, max) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);
const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;

// Zwraca { ok: true, data } albo { ok: false, field, error } — field wskazuje pole formularza.
export function validateRaportLead(body) {
  const days = Number(body?.dni);
  const data = {
    imie: clean(body?.imie, 80),
    email: clean(body?.email, 254).toLowerCase(),
    profil_link: clean(body?.profil_link, 200),
    zrodlo: clean(body?.zrodlo, 20),
    cel: clean(body?.cel, 20),
    cel_inne: clean(body?.cel_inne, 200),
    czas: clean(body?.czas, 100),
    doswiadczenie: clean(body?.doswiadczenie, 20),
    miejsce: clean(body?.miejsce, 20),
    sprzet: clean(body?.sprzet, 500),
    dni: Number.isInteger(days) && days >= 1 && days <= 6 ? days : null,
    co_nie_dzialalo: clean(body?.co_nie_dzialalo, 1000),
    inwestycja: clean(body?.inwestycja, 10),
    zgoda_przetwarzanie: body?.zgoda_przetwarzanie === true,
    zgoda_marketing: body?.zgoda_marketing === true
  };
  const fail = (field, error) => ({ ok: false, field, error });

  if (data.imie.length < 2) return fail('imie', 'Podaj imię (min. 2 znaki).');
  if (!EMAIL_RE.test(data.email)) return fail('email', 'Podaj poprawny adres e-mail.');
  const profile = normalizeProfileUrl(data.profil_link);
  if (!profile) return fail('profil_link', 'Wklej pełny link do profilu Instagram lub TikTok albo zostaw to pole puste.');
  data.profil_link = profile.url;
  if (!RAPORT_ENUMS.zrodlo.includes(data.zrodlo)) return fail('zrodlo', 'Wybierz, skąd wiesz o System Formy.');
  if (!RAPORT_ENUMS.cel.includes(data.cel)) return fail('cel', 'Wybierz główny cel.');
  if (data.czas.length < 2) return fail('czas', 'Napisz, w jakim czasie chcesz osiągnąć cel.');
  if (!RAPORT_ENUMS.doswiadczenie.includes(data.doswiadczenie)) return fail('doswiadczenie', 'Wybierz doświadczenie treningowe.');
  if (!RAPORT_ENUMS.miejsce.includes(data.miejsce)) return fail('miejsce', 'Wybierz, gdzie trenujesz.');
  if (data.dni === null) return fail('dni', 'Wybierz, ile dni w tygodniu realnie możesz trenować (1–6).');
  if (!RAPORT_ENUMS.inwestycja.includes(data.inwestycja)) return fail('inwestycja', 'Zaznacz odpowiedź Tak albo Nie.');
  // Bez zgody na przetwarzanie nic nie jest zapisywane.
  if (!data.zgoda_przetwarzanie) return fail('zgoda_przetwarzanie', 'Zaznacz zgodę na przetwarzanie danych w celu przygotowania raportu.');
  return { ok: true, data };
}

// Krótki, nieidentyfikujący opis urządzenia i przeglądarki, np. "iPhone / Instagram (aplikacja)".
export function userAgentShort(userAgent) {
  const ua = String(userAgent || '');
  const device = /iPhone/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows' : /Macintosh|Mac OS X/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'inne';
  const browser = /Instagram/i.test(ua) ? 'Instagram (aplikacja)'
    : /musical_ly|TikTok|BytedanceWebview/i.test(ua) ? 'TikTok (aplikacja)'
    : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'Facebook (aplikacja)'
    : /Edg\//i.test(ua) ? 'Edge' : /Firefox|FxiOS/i.test(ua) ? 'Firefox'
    : /Chrome|CriOS/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'inna';
  return `${device} / ${browser}`;
}
