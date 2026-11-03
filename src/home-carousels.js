(() => {
  'use strict';

  function initCarousel(carousel) {
    const slides = Array.from(carousel.querySelectorAll('[data-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-to]'));
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const count = carousel.querySelector('.sf-carousel-count');
    if (!slides.length) return;

    let active = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    const setActive = (index) => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const selected = i === active;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-hidden', String(!selected));
        if ('inert' in slide) slide.inert = !selected;
      });
      dots.forEach((dot, i) => {
        const selected = i === active;
        dot.classList.toggle('is-active', selected);
        dot.setAttribute('aria-pressed', String(selected));
      });
      if (count) count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      if (prev) prev.disabled = slides.length < 2;
      if (next) next.disabled = slides.length < 2;
    };

    if (prev) prev.addEventListener('click', () => setActive(active - 1));
    if (next) next.addEventListener('click', () => setActive(active + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => setActive(Number(dot.dataset.carouselTo))));

    let touchStartX = null;
    carousel.addEventListener('touchstart', (event) => {
      if (event.changedTouches.length) touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', (event) => {
      if (touchStartX === null || !event.changedTouches.length || slides.length < 2) return;
      const delta = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 45) setActive(active + (delta < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });
    setActive(active);
  }


  function initPricingCarousel(carousel) {
    const viewport = carousel.querySelector('.sf-pricing-viewport');
    const prev = carousel.querySelector('[data-pricing-prev]');
    const next = carousel.querySelector('[data-pricing-next]');
    if (!viewport || !prev || !next) return;
    const update = () => {
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      prev.disabled = viewport.scrollLeft <= 2;
      next.disabled = viewport.scrollLeft >= max - 2;
    };
    const move = (direction) => viewport.scrollBy({ left: direction * Math.max(viewport.clientWidth * 0.82, 220), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    viewport.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    viewport.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    update();
  }

  function init() {
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);
    document.querySelectorAll('[data-pricing-carousel]').forEach(initPricingCarousel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
