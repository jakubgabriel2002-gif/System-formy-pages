(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.main-nav');

  function closeMenu() {
    if (!menuButton || !navigation) return;
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Otwórz menu');
    document.body.classList.remove('menu-open');
  }

  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Otwórz menu' : 'Zamknij menu');
    navigation?.classList.toggle('open', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  });

  navigation?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Zapewnia dostęp do dokumentów prawnych również w stopce planu indywidualnego.
  document.querySelectorAll('.site-footer').forEach((footer) => {
    if (footer.querySelector('a[href="/regulamin.html"]') || footer.querySelector('.footer-legal-links')) return;
    const legalNav = document.createElement('nav');
    legalNav.className = 'footer-legal-links';
    legalNav.setAttribute('aria-label', 'Dokumenty prawne');
    legalNav.innerHTML = '<a href="/regulamin.html">REGULAMIN</a><a href="/polityka-prywatnosci.html">POLITYKA PRYWATNOŚCI</a><a href="/cookies.html">COOKIES</a>';
    footer.appendChild(legalNav);
  });

  // Animacje korzystają z istniejących reguł .motion-enabled [data-reveal]
  // w src/styles.css. Przy ograniczonym ruchu treść pozostaje widoczna.
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  const revealSelector = [
    '.hero-copy',
    '.hero-plan-select',
    '.ticker',
    '.section-heading',
    '.price-card',
    '.offer-footnote',
    '.table-wrap',
    '.steps-list > li',
    '.delivery-card',
    '.metamorphosis-board',
    '.faq-list details',
    '.final-cta-inner',
    '.final-cta-mark'
  ].join(',');

  const revealTargets = Array.from(document.querySelectorAll(revealSelector));
  if (!revealTargets.length) return;

  // Atrybuty dodajemy dopiero, gdy wiemy, że przeglądarka obsłuży animacje.
  revealTargets.forEach((element) => element.setAttribute('data-reveal', ''));
  document.documentElement.classList.add('motion-enabled');

  let observer;
  try {
    observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -36px 0px'
    });
  } catch (_) {
    return;
  }

  revealTargets.forEach((element) => {
    // Delikatne, krótkie opóźnienie kart, kolejnych kroków i pytań FAQ.
    if (element.matches('.price-card, .faq-list details, .steps-list > li')) {
      const siblings = Array.from(element.parentElement?.children ?? []);
      const siblingIndex = siblings.indexOf(element);
      if (siblingIndex >= 0 && siblingIndex < 5) {
        element.style.setProperty('--reveal-delay', `${siblingIndex * 85}ms`);
      }
    }

    // Elementy już widoczne nie czekają na pierwsze wywołanie obserwatora.
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
      element.classList.add('is-visible');
    } else {
      observer.observe(element);
    }
  });
})();
