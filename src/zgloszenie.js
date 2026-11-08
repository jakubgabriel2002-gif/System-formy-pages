(() => {
  'use strict';

  // Bezpłatna ankieta zgłoszeniowa (/ankieta.html) → POST /api/zgloszenie.
  const form = document.querySelector('#lead-form');
  const success = document.querySelector('#lead-success');
  const status = document.querySelector('#lead-status');
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!form) return;

  const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,24}$/i;
  const messages = {
    imie: 'Podaj imię (min. 2 znaki).',
    email: 'Podaj poprawny adres e-mail.',
    wiek: 'Podaj wiek (16–90 lat).',
    wzrost_cm: 'Podaj wzrost w centymetrach (120–230).',
    waga_kg: 'Podaj wagę w kilogramach (35–300).',
    cel: 'Wybierz główny cel.',
    cel_opis: '',
    doswiadczenie: 'Wybierz doświadczenie treningowe.',
    miejsce: 'Wybierz, gdzie trenujesz.',
    dni: 'Wybierz, ile dni w tygodniu możesz trenować.',
    inwestycja: 'Zaznacz odpowiedź Tak albo Nie.',
    zgoda_przetwarzanie: 'Zaznacz wymaganą zgodę na przetwarzanie danych.'
  };

  // Zakres nie jest pytaniem w ankiecie. Zapisujemy tylko, z którego przycisku przyszła osoba
  // (np. /ankieta.html?zakres=elite). Bez parametru: „niewiem” = ankieta ogólna.
  const presetMap = { pro: 'pro', elite: 'elite', plan: 'plan', plany: 'plan' };
  const zakres = presetMap[new URLSearchParams(location.search).get('zakres')] || 'niewiem';

  const errorEl = name => form.querySelector(`[data-error-for="${name}"]`);
  function setError(name, text) {
    const el = errorEl(name);
    if (el) el.textContent = text || '';
    form.querySelectorAll(`[name="${name}"]`).forEach(field => {
      if (text) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    });
  }
  const clearErrors = () => Object.keys(messages).forEach(name => setError(name, ''));
  const value = name => {
    const field = form.elements[name];
    if (!field) return '';
    if (field instanceof RadioNodeList) return field.value || '';
    if (field.type === 'checkbox') return field.checked;
    return String(field.value || '').trim();
  };
  const intIn = (raw, min, max) => { const n = Number(raw); return raw !== '' && Number.isInteger(n) && n >= min && n <= max; };
  const weight = () => Number(String(value('waga_kg')).replace(',', '.'));

  function validate() {
    const errors = {};
    if (value('imie').length < 2) errors.imie = messages.imie;
    if (!EMAIL_RE.test(value('email'))) errors.email = messages.email;
    if (!intIn(value('wiek'), 16, 90)) errors.wiek = messages.wiek;
    if (!intIn(value('wzrost_cm'), 120, 230)) errors.wzrost_cm = messages.wzrost_cm;
    const w = weight();
    if (!value('waga_kg') || !Number.isFinite(w) || w < 35 || w > 300) errors.waga_kg = messages.waga_kg;
    for (const name of ['cel', 'doswiadczenie', 'miejsce', 'dni', 'inwestycja']) if (!value(name)) errors[name] = messages[name];
    if (!value('zgoda_przetwarzanie')) errors.zgoda_przetwarzanie = messages.zgoda_przetwarzanie;
    return errors;
  }

  form.addEventListener('input', event => { if (event.target.name) setError(event.target.name, ''); });
  form.addEventListener('change', event => { if (event.target.name) setError(event.target.name, ''); });

  function focusField(name) {
    const field = form.elements[name];
    const target = field instanceof RadioNodeList ? field[0] : field;
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center' }); }
  }

  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
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
      imie: value('imie'), email: value('email'), wiek: Number(value('wiek')), wzrost_cm: Number(value('wzrost_cm')),
      waga_kg: weight(), zakres, cel: value('cel'), cel_opis: value('cel_opis'),
      doswiadczenie: value('doswiadczenie'), miejsce: value('miejsce'), dni: Number(value('dni')),
      inwestycja: value('inwestycja'), zgoda_przetwarzanie: value('zgoda_przetwarzanie') === true,
      zgoda_marketing: value('zgoda_marketing') === true, website: String(form.elements.website.value || '')
    };

    const submit = form.querySelector('button[type="submit"]');
    const label = submit.textContent;
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'WYSYŁANIE…';
    try {
      const response = await fetch('/api/zgloszenie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.field && result.field in messages) { setError(result.field, result.error); focusField(result.field); }
        throw new Error(result.error || 'Nie udało się wysłać ankiety. Spróbuj ponownie.');
      }
      form.reset();
      form.hidden = true;
      document.querySelector('.raport-intro')?.setAttribute('hidden', '');
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'start' });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Nie udało się wysłać ankiety. Spróbuj ponownie.';
      status.classList.add('is-error');
    } finally {
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });
})();
