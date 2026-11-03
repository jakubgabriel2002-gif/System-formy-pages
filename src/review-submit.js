(() => {
  'use strict';
  const button = document.querySelector('.sf-add-review-button');
  const form = document.querySelector('#sf-review-form');
  if (!button || !form) return;

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    form.hidden = isOpen;
    if (!isOpen) form.querySelector('input[name="author"]')?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const author = String(data.get('author') || '').trim();
    const review = String(data.get('review') || '').trim();
    if (!author || !review || !data.get('consent')) return;

    const subject = encodeURIComponent('Opinia o SYSTEM FORMY — zgłoszenie do weryfikacji');
    const body = encodeURIComponent(`Proszę o weryfikację mojej opinii przed ewentualną publikacją.\n\nPodpis: ${author}\n\nOpinia:\n${review}\n\nZgoda na przesłanie opinii do weryfikacji: TAK.\nZgoda na publikację nie jest udzielana tym formularzem i wymaga osobnego potwierdzenia.`);
    window.location.href = `mailto:pomoc@systemformy.com.pl?subject=${subject}&body=${body}`;
  });
})();
