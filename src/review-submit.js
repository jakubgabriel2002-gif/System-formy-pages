(() => {
  'use strict';
  const button = document.querySelector('.sf-add-review-button');
  const form = document.querySelector('#sf-review-form');
  const list = document.querySelector('#sf-reviews-list');
  const status = document.querySelector('#sf-review-submit-status');
  if (!button || !form) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function renderReviews(reviews) {
    if (!list) return;
    if (!reviews.length) {
      list.innerHTML = '<p class="sf-review-empty">Opinie klientów pojawią się tutaj po ich przesłaniu.</p>';
      return;
    }
    list.innerHTML = `
      <div class="sf-reviews-carousel">
        <button class="sf-reviews-arrow" type="button" data-review-prev aria-label="Poprzednia opinia">←</button>
        <div class="sf-reviews-stage" aria-live="polite">
          ${reviews.map((review, index) => `
            <article class="sf-review-card" data-review-slide ${index === 0 ? '' : 'hidden'}>
              ${review.status === 'pending' ? '<p class="sf-review-unverified">OPINIA NIEZWERYFIKOWANA</p>' : ''}
              <span class="sf-review-mark" aria-hidden="true">“</span>
              <p class="sf-review-text">${escapeHtml(review.review)}</p>
              <div class="sf-review-author"><b>${escapeHtml(review.author)}</b><span>${new Date(review.created_at).toLocaleDateString('pl-PL')}</span></div>
            </article>`).join('')}
        </div>
        <button class="sf-reviews-arrow" type="button" data-review-next aria-label="Następna opinia">→</button>
        <p class="sf-reviews-count" aria-live="polite">01 / ${String(reviews.length).padStart(2, '0')}</p>
      </div>`;
    const slides = Array.from(list.querySelectorAll('[data-review-slide]'));
    const prev = list.querySelector('[data-review-prev]');
    const next = list.querySelector('[data-review-next]');
    const count = list.querySelector('.sf-reviews-count');
    let active = 0;
    const show = (index) => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== active; });
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      prev.disabled = slides.length < 2;
      next.disabled = slides.length < 2;
    };
    prev.addEventListener('click', () => show(active - 1));
    next.addEventListener('click', () => show(active + 1));
    let touchX = null;
    list.querySelector('.sf-reviews-stage').addEventListener('touchstart', (event) => {
      touchX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    list.querySelector('.sf-reviews-stage').addEventListener('touchend', (event) => {
      if (touchX === null || slides.length < 2) return;
      const delta = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
      if (Math.abs(delta) > 45) show(active + (delta < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
    show(0);
  }

  async function loadReviews() {
    if (!list) return;
    try {
      const response = await fetch('/api/reviews', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nie udało się pobrać opinii.');
      renderReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch {
      list.innerHTML = '<p class="sf-review-empty">Nie udało się teraz pobrać opinii. Spróbuj ponownie później.</p>';
    }
  }

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    form.hidden = open;
    if (!open) form.querySelector('input[name="author"]')?.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const payload = {
      author: String(data.get('author') || '').trim(),
      review: String(data.get('review') || '').trim(),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') || '')
    };
    submit.disabled = true;
    if (status) status.textContent = 'Wysyłanie opinii…';
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać opinii.');
      form.reset();
      form.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (status) status.textContent = 'Dziękujemy! Opinia została dodana i jest widoczna na stronie jako niezweryfikowana.';
      await loadReviews();
    } catch (error) {
      if (status) status.textContent = error.message || 'Wystąpił błąd. Spróbuj ponownie.';
    } finally {
      submit.disabled = false;
    }
  });

  loadReviews();
})();
