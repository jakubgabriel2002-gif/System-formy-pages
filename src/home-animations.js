(() => {
  'use strict';
  const onReady = () => {
    const cards = document.querySelectorAll('.hero-plan-option, .pricing-grid .price-card');
    if (!cards.length) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('sf-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    const groups = [
      document.querySelectorAll('.hero-plan-grid .hero-plan-option'),
      document.querySelectorAll('.pricing-grid .price-card')
    ];
    groups.forEach((group) => group.forEach((card, index) => {
      card.classList.add('sf-reveal');
      card.dataset.revealDirection = index % 2 === 0 ? 'left' : 'right';
      card.style.setProperty('--sf-reveal-delay', `${(index % 3) * 90}ms`);
      observer.observe(card);
    }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once: true });
  else onReady();
})();
