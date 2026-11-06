(() => {
  'use strict';

  // Profile do przycisków "Obserwuj" na ekranie podziękowania.
  // Pusty adres = przycisk się nie wyświetla.
  const SOCIAL_LINKS = {
    instagram: 'https://www.instagram.com/system_formy_',
    tiktok: 'https://www.tiktok.com/@system_formy',
    youtube: 'https://www.youtube.com/@system_formy',
    facebook: 'https://www.facebook.com/share/1GqeoyNpNT/'
  };
  const SOCIAL_LABELS = { instagram: 'INSTAGRAM', tiktok: 'TIKTOK', youtube: 'YOUTUBE', facebook: 'FACEBOOK' };

  const form = document.querySelector('#raport-form');
  const success = document.querySelector('#raport-success');
  const status = document.querySelector('#raport-status');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!form) return;

  const PROFILE_RE = /^(https?:\/\/)?((www|m)\.)?(instagram\.com\/(?!(p|reel|reels|stories|explore|accounts)\/)[a-z0-9._]{1,30}|instagr\.am\/[a-z0-9._]{1,30}|tiktok\.com\/@[a-z0-9._]{2,24})\/?([?#].*)?$/i;
  const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;

  const messages = {
    imie: 'Podaj imię (min. 2 znaki).',
    email: 'Podaj poprawny adres e-mail.',
    profil_link: 'Wklej pełny link do profilu Instagram lub TikTok albo zostaw to pole puste.',
    zrodlo: 'Wybierz, skąd wiesz o System Formy.',
    cel: 'Wybierz główny cel.',
    czas: 'Napisz, w jakim czasie chcesz osiągnąć cel.',
    doswiadczenie: 'Wybierz doświadczenie treningowe.',
    miejsce: 'Wybierz, gdzie trenujesz.',
    dni: 'Wybierz, ile dni w tygodniu realnie możesz trenować.',
    inwestycja: 'Zaznacz odpowiedź Tak albo Nie.',
    zgoda_przetwarzanie: 'Zaznacz zgodę na przetwarzanie danych w celu przygotowania raportu.'
  };

  const errorEl = name => form.querySelector(`[data-error-for="${name}"]`);
  function setError(name, text) {
    const el = errorEl(name);
    if (el) el.textContent = text || '';
    form.querySelectorAll(`[name="${name}"]`).forEach(field => {
      if (text) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    });
  }
  function clearErrors() { Object.keys(messages).forEach(name => setError(name, '')); }

  const value = name => {
    const field = form.elements[name];
    if (!field) return '';
    if (field instanceof RadioNodeList) return field.value || '';
    if (field.type === 'checkbox') return field.checked;
    return String(field.value || '').trim();
  };

  function validate() {
    const errors = {};
    if (value('imie').length < 2) errors.imie = messages.imie;
    if (!EMAIL_RE.test(value('email'))) errors.email = messages.email;
    if (value('profil_link') && !PROFILE_RE.test(value('profil_link'))) errors.profil_link = messages.profil_link;
    for (const name of ['zrodlo', 'cel', 'doswiadczenie', 'miejsce', 'dni', 'inwestycja']) if (!value(name)) errors[name] = messages[name];
    if (value('czas').length < 2) errors.czas = messages.czas;
    if (!value('zgoda_przetwarzanie')) errors.zgoda_przetwarzanie = messages.zgoda_przetwarzanie;
    return errors;
  }

  // Błąd znika, gdy użytkownik poprawi pole.
  form.addEventListener('input', event => { if (event.target.name) setError(event.target.name, ''); });
  form.addEventListener('change', event => { if (event.target.name) setError(event.target.name, ''); });

  function focusField(name) {
    const field = form.elements[name];
    const target = field instanceof RadioNodeList ? field[0] : field;
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center' }); }
  }

  function renderFollow() {
    const box = document.querySelector('#raport-follow');
    if (!box) return;
    box.replaceChildren();
    for (const [key, url] of Object.entries(SOCIAL_LINKS)) {
      if (!url) continue;
      const link = document.createElement('a');
      link.className = 'button button-outline raport-follow-link';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `OBSERWUJ: ${SOCIAL_LABELS[key]}`;
      box.append(link);
    }
  }

  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return; // ochrona przed podwójnym kliknięciem
    clearErrors();
    status.textContent = '';
    status.classList.remove('is-error');

    const errors = validate();
    const names = Object.keys(errors);
    if (names.length) {
      names.forEach(name => setError(name, errors[name]));
      status.textContent = 'Popraw zaznaczone pola.';
      status.classList.add('is-error');
      focusField(names[0]);
      return;
    }

    const payload = {
      imie: value('imie'), email: value('email'), profil_link: value('profil_link'), zrodlo: value('zrodlo'),
      cel: value('cel'), cel_inne: value('cel_inne'), czas: value('czas'), doswiadczenie: value('doswiadczenie'),
      miejsce: value('miejsce'), sprzet: value('sprzet'), dni: Number(value('dni')), co_nie_dzialalo: value('co_nie_dzialalo'),
      inwestycja: value('inwestycja'), zgoda_przetwarzanie: value('zgoda_przetwarzanie') === true,
      zgoda_marketing: value('zgoda_marketing') === true, website: String(form.elements.website.value || '')
    };

    const submit = form.querySelector('button[type="submit"]');
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'WYSYŁANIE…';
    try {
      const response = await fetch('/api/raport-startowy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.field && messages[result.field]) { setError(result.field, result.error); focusField(result.field); }
        throw new Error(result.error || 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
      }
      form.reset();
      form.hidden = true;
      renderFollow();
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'start' });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.';
      status.classList.add('is-error');
    } finally {
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = 'WYŚLIJ ZGŁOSZENIE';
    }
  });
})();
