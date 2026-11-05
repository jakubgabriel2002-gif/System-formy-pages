// Wspólne słowniki i walidacja zgłoszeń "Aplikuj do SYSTEM ELITE".
// Używane przez publiczny endpoint i panel trenera.

export const ELITE_STATUSES = ['new', 'in_review', 'proposal_sent', 'client', 'rejected'];

export const ELITE_ENUMS = {
  source: ['elite', 'pro'],
  gender: ['mezczyzna', 'kobieta', 'inna', 'brak'],
  goal: ['redukcja', 'masa', 'sila', 'kondycja', 'inny'],
  experience: ['poczatkujacy', 'do1roku', '1do3lat', 'powyzej3lat', 'powrot'],
  location: ['dom', 'silownia', 'oba'],
  readiness: ['teraz', 'miesiac', 'pozniej'],
  budget: ['tak', 'nie']
};

// Link do profilu: tylko Instagram lub TikTok, zapisywany w jednolitej postaci https://...
// Zwraca { url, platform } albo null, gdy link jest niepoprawny.
export function normalizeProfileUrl(value) {
  let raw = String(value ?? '').trim();
  if (!raw) return { url: '', platform: '' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let parsed;
  try { parsed = new URL(raw); } catch { return null; }
  const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (host === 'instagram.com' || host === 'instagr.am') {
    const handle = parts[0] || '';
    if (!/^[a-z0-9._]{1,30}$/i.test(handle) || ['p', 'reel', 'reels', 'stories', 'explore', 'accounts'].includes(handle.toLowerCase())) return null;
    return { url: `https://www.instagram.com/${handle}/`, platform: 'instagram' };
  }
  if (host === 'tiktok.com') {
    const handle = (parts[0] || '').replace(/^@/, '');
    if (!parts[0]?.startsWith('@') || !/^[a-z0-9._]{2,24}$/i.test(handle)) return null;
    return { url: `https://www.tiktok.com/@${handle}`, platform: 'tiktok' };
  }
  return null;
}

const clean = (value, max) => String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;

function intInRange(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function numberInRange(value, min, max) {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max ? Math.round(number * 10) / 10 : null;
}

// Zwraca { ok: true, data } albo { ok: false, error } z komunikatem dla użytkownika.
export function validateEliteApplication(body) {
  const data = {
    source: clean(body?.source, 10),
    name: clean(body?.name, 80),
    email: clean(body?.email, 254).toLowerCase(),
    social: clean(body?.social, 200),
    age: intInRange(body?.age, 16, 90),
    gender: clean(body?.gender, 20),
    height_cm: intInRange(body?.height_cm, 120, 230),
    weight_kg: numberInRange(body?.weight_kg, 35, 300),
    goal: clean(body?.goal, 20),
    goal_details: clean(body?.goal_details, 1000),
    experience: clean(body?.experience, 20),
    location: clean(body?.location, 20),
    equipment: clean(body?.equipment, 1000),
    days_per_week: intInRange(body?.days_per_week, 1, 7),
    health_limitations: clean(body?.health_limitations, 1500),
    what_failed: clean(body?.what_failed, 1500),
    readiness: clean(body?.readiness, 20),
    budget: clean(body?.budget, 20),
    consent_privacy: body?.consent_privacy === true,
    consent_health: body?.consent_health === true
  };

  if (!ELITE_ENUMS.source.includes(data.source)) data.source = 'elite';
  if (data.name.length < 2) return { ok: false, error: 'Podaj imię (min. 2 znaki).' };
  const profile = normalizeProfileUrl(data.social);
  if (!profile) return { ok: false, error: 'Wklej pełny link do profilu Instagram lub TikTok, np. https://www.instagram.com/twoj_profil' };
  data.social = profile.url;
  if (!EMAIL_RE.test(data.email)) return { ok: false, error: 'Podaj poprawny adres e-mail.' };
  if (data.age === null) return { ok: false, error: 'Podaj wiek (16–90 lat).' };
  if (!ELITE_ENUMS.gender.includes(data.gender)) return { ok: false, error: 'Wybierz płeć.' };
  if (data.height_cm === null) return { ok: false, error: 'Podaj wzrost w centymetrach (120–230).' };
  if (data.weight_kg === null) return { ok: false, error: 'Podaj aktualną wagę w kilogramach (35–300).' };
  if (!ELITE_ENUMS.goal.includes(data.goal)) return { ok: false, error: 'Wybierz główny cel.' };
  if (data.goal_details.length < 5) return { ok: false, error: 'Opisz cel w liczbach i w jakim czasie chcesz go osiągnąć.' };
  if (!ELITE_ENUMS.experience.includes(data.experience)) return { ok: false, error: 'Wybierz doświadczenie treningowe.' };
  if (!ELITE_ENUMS.location.includes(data.location)) return { ok: false, error: 'Wybierz miejsce treningu.' };
  if (data.days_per_week === null) return { ok: false, error: 'Podaj, ile dni w tygodniu możesz trenować (1–7).' };
  if (!ELITE_ENUMS.readiness.includes(data.readiness)) return { ok: false, error: 'Wybierz, kiedy chcesz zacząć.' };
  if (!ELITE_ENUMS.budget.includes(data.budget)) return { ok: false, error: 'Zaznacz, czy jesteś w stanie zainwestować w zmianę sylwetki.' };
  if (!data.consent_privacy) return { ok: false, error: 'Zaznacz zgodę na przetwarzanie danych zgłoszenia.' };
  // Dane o zdrowiu zapisujemy wyłącznie przy osobnej, wyraźnej zgodzie (art. 9 RODO).
  if (data.health_limitations && !data.consent_health) {
    return { ok: false, error: 'Aby przekazać informacje o kontuzjach i ograniczeniach zdrowotnych, zaznacz zgodę na przetwarzanie danych o zdrowiu albo zostaw to pole puste.' };
  }
  if (!data.health_limitations) data.consent_health = false;
  return { ok: true, data };
}
