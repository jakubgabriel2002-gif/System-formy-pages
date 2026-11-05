(() => {
  'use strict';
  const section = document.querySelector('#aplikuj');
  const form = document.querySelector('#elite-apply-form');
  const success = document.querySelector('#elite-apply-success');
  const status = document.querySelector('#elite-form-status');
  if (!section || !form) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('z') === 'pro') form.elements.source.value = 'pro';

  // Treść oferty renderuje się skryptem, więc po załadowaniu przewijamy do formularza ręcznie.
  if (window.location.hash === '#aplikuj' && !section.hidden) {
    requestAnimationFrame(() => section.scrollIntoView({ block: 'start' }));
  }

  const health = form.elements.health_limitations;
  const healthConsent = form.elements.consent_health;
  const syncHealthConsent = () => {
    const needed = health.value.trim().length > 0;
    healthConsent.required = needed;
    healthConsent.closest('.elite-consent')?.classList.toggle('is-required', needed);
  };
  health.addEventListener('input', syncHealthConsent);

  // Kontakt: e-mail zawsze wymagany, link do profilu Instagram/TikTok opcjonalny.
  const social = form.elements.social;
  const PROFILE_RE = /^(https?:\/\/)?((www|m)\.)?(instagram\.com\/(?!(p|reel|reels|stories|explore|accounts)\/)[a-z0-9._]{1,30}|instagr\.am\/[a-z0-9._]{1,30}|tiktok\.com\/@[a-z0-9._]{2,24})\/?([?#].*)?$/i;
  const profilePlatform = value => /tiktok\.com/i.test(value) ? 'TikToku' : 'Instagramie';
  const syncContact = () => {
    const link = social.value.trim();
    social.setCustomValidity(link && !PROFILE_RE.test(link) ? 'invalid' : '');
  };
  social.addEventListener('input', syncContact);
  syncContact();
  form.addEventListener('change', () => { if (status.classList.contains('is-error')) { status.textContent = ''; status.classList.remove('is-error'); } });
  syncHealthConsent();

  const messages = {
    name: 'Podaj imię (min. 2 znaki).',
    social: 'Wklej pełny link do profilu Instagram lub TikTok, np. https://www.instagram.com/twoj_profil',
    email: 'Podaj poprawny adres e-mail — bez niego nie mogę przyjąć zgłoszenia.',
    age: 'Podaj wiek (16–90 lat).',
    gender: 'Wybierz płeć.',
    height_cm: 'Podaj wzrost w centymetrach (120–230).',
    weight_kg: 'Podaj wagę w kilogramach (35–300).',
    goal: 'Wybierz główny cel.',
    experience: 'Wybierz doświadczenie treningowe.',
    goal_details: 'Opisz cel w liczbach i w jakim czasie chcesz go osiągnąć.',
    location: 'Wybierz miejsce treningu.',
    days_per_week: 'Wybierz liczbę dni treningowych.',
    readiness: 'Wybierz, kiedy chcesz zacząć.',
    budget: 'Zaznacz, czy jesteś w stanie zainwestować w zmianę sylwetki.',
    consent_health: 'Zaznacz zgodę na dane o zdrowiu albo wyczyść pole o kontuzjach.',
    consent_privacy: 'Zaznacz zgodę na przetwarzanie danych zgłoszenia.'
  };

  function firstInvalid() {
    for (const field of Array.from(form.elements)) {
      if (!field.name || field.name === 'website' || typeof field.checkValidity !== 'function') continue;
      if (field.type === 'email') field.value = field.value.trim();
      if (!field.checkValidity()) return field;
    }
    return null;
  }

  function channelText(payload) {
    return payload.social
      ? `Odpowiedź wyślę w wiadomości prywatnej na ${profilePlatform(payload.social)}. Jeśli jej nie widzisz, sprawdź „Prośby o wiadomość”.`
      : 'Odpowiedź przyjdzie na podany adres e-mail. Sprawdź też folder spam.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    syncHealthConsent();
    syncContact();
    status.classList.remove('is-error');
    const invalid = firstInvalid();
    if (invalid) {
      status.textContent = messages[invalid.name] || 'Uzupełnij wymagane pola.';
      status.classList.add('is-error');
      invalid.focus();
      return;
    }
    const data = new FormData(form);
    const text = name => String(data.get(name) || '').trim();
    const payload = {
      source: text('source'), name: text('name'), email: text('email'), social: text('social'),
      age: Number(text('age')), gender: text('gender'), height_cm: Number(text('height_cm')),
      weight_kg: Number(text('weight_kg').replace(',', '.')), goal: text('goal'), goal_details: text('goal_details'),
      experience: text('experience'), location: text('location'), equipment: text('equipment'),
      days_per_week: Number(text('days_per_week')), health_limitations: text('health_limitations'),
      what_failed: text('what_failed'), readiness: text('readiness'), budget: text('budget'),
      consent_privacy: data.get('consent_privacy') === 'on', consent_health: data.get('consent_health') === 'on',
      website: String(data.get('website') || '')
    };
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'WYSYŁANIE…';
    status.textContent = '';
    try {
      const response = await fetch('/api/elite-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
      const channel = channelText(payload);
      form.reset();
      syncContact();
      document.querySelector('#elite-success-channel').textContent = channel;
      form.hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'center' });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.';
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'WYŚLIJ ZGŁOSZENIE';
    }
  });
})();
