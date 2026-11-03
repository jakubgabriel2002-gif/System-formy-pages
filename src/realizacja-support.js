(() => {
  'use strict';
  const root = document.querySelector('#realization-state');
  if (!root || !('MutationObserver' in window)) return;

  function addSupportContact() {
    const lockedPanel = root.querySelector('.realization-download-locked');
    if (!lockedPanel || lockedPanel.querySelector('.realization-support-note')) return;

    const note = document.createElement('p');
    note.className = 'realization-support-note';
    note.append('Masz problem z pobraniem materiałów? Zrób zrzut ekranu z widocznym komunikatem i wyślij go na adres ');

    const email = document.createElement('a');
    email.href = 'mailto:pomoc@systemformy.com.pl?subject=Problem%20z%20pobraniem%20SYSTEM%20START';
    email.textContent = 'pomoc@systemformy.com.pl';
    note.append(email, '. Pomożemy Ci rozwiązać problem.');
    lockedPanel.appendChild(note);
  }

  const observer = new MutationObserver(addSupportContact);
  observer.observe(root, { childList: true, subtree: true });
  addSupportContact();
})();
