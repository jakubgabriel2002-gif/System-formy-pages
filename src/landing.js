(() => {
  'use strict';
  // Przyklejony przycisk „Odbierz darmowe wskazówki” na telefonie:
  // pokazuje się po przewinięciu hero, chowa się przy sekcji ebooka i końcowym CTA (tam przycisk już jest).
  const cta = document.querySelector('#sf-sticky-cta');
  if (!cta || !('IntersectionObserver' in window)) return;
  const watched = ['#start', '#ebook', '.final-cta'].map(sel => document.querySelector(sel)).filter(Boolean);
  const visible = new Set();
  const update = () => {
    const show = visible.size === 0 && window.scrollY > 200;
    cta.classList.toggle('is-visible', show);
    cta.setAttribute('aria-hidden', show ? 'false' : 'true');
    cta.tabIndex = show ? 0 : -1;
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
    update();
  }, { threshold: 0.15 });
  watched.forEach(el => observer.observe(el));
  window.addEventListener('scroll', update, { passive: true });
})();
