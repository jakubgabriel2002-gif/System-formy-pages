(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const loginView = $('#login-view');
  const dashboardView = $('#dashboard-view');
  const fatalView = $('#fatal-view');
  const clientList = $('#client-list');
  const detailPanel = $('#detail-panel');
  const state = { orders: [], selectedOrderRef: null, debounce: null };

  const labels = {
    name: 'Imię i nazwisko', email: 'E-mail', age: 'Wiek', gender: 'Płeć', bodyWeightKg: 'Masa ciała (kg)',
    goal: 'Główny cel', measurableGoal: 'Cel mierzalny', experience: 'Doświadczenie', trainingLocation: 'Miejsce treningu',
    equipment: 'Sprzęt', equipmentItems: 'Wybrany sprzęt', equipmentOther: 'Inny sprzęt', pushUps: 'Pompki', squats: 'Przysiady',
    sitUps: 'Brzuszki', jumpingJacks: 'Pajacyki', benchPress: 'Wyciskanie', squat: 'Przysiad ze sztangą', weightKg: 'Ciężar (kg)',
    reps: 'Powtórzenia', pullUps: 'Podciąganie', daysPerWeek: 'Treningi w tygodniu', sessionMinutes: 'Czas treningu (min)',
    currentPlan: 'Obecny plan', difficulty: 'Poziom trudności', startDate: 'Planowany start', height: 'Wzrost',
    trainingHistory: 'Historia treningowa', preferredExercises: 'Preferowane ćwiczenia', progressFocus: 'Obszar monitorowania',
    reportDay: 'Dzień raportowania', techniqueExercises: 'Ćwiczenia do kontroli techniki', weeklySchedule: 'Plan tygodnia',
    nutrition: 'Odżywianie', sleep: 'Sen', dailyActivity: 'Aktywność w ciągu dnia', barriers: 'Trudności / bariery',
    supportNeeds: 'Oczekiwane wsparcie', goalMetric: 'Wskaźnik celu ELITE', baselineValue: 'Wartość początkowa',
    targetValue: 'Wartość docelowa', measurementMethod: 'Metoda pomiaru', health: 'Informacje zdrowotne',
    consent: 'Zgoda na przetwarzanie informacji zdrowotnych', pain: 'Ból lub uraz', restriction: 'Zalecenia ograniczenia aktywności',
    notes: 'Opis ograniczeń', submitted_at: 'Data wysłania ankiety'
  };
  const equipmentLabels = {
    dumbbells: 'Hantle', barbell: 'Sztanga', bench: 'Ławka', rack: 'Stojaki / klatka', pullup_bar: 'Drążek', bands: 'Gumy oporowe',
    kettlebell: 'Kettlebell', mat: 'Mata', treadmill: 'Bieżnia', stationary_bike: 'Rower stacjonarny', elliptical: 'Orbitrek',
    jump_rope: 'Skakanka', trx: 'TRX', cable_machine: 'Wyciąg', none: 'Brak sprzętu', other: 'Inny sprzęt'
  };
  const statusLabels = { new: 'Nowy', in_progress: 'W trakcie', waiting_client: 'Oczekuje na klienta', ready: 'Gotowy', completed: 'Zakończony' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function formatMoney(amount, currency = 'pln') {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: String(currency || 'pln').toUpperCase() }).format((Number(amount) || 0) / 100);
  }
  function showOnly(view) {
    [loginView, dashboardView, fatalView].forEach(item => { item.hidden = item !== view; });
  }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      state.selectedOrderRef = null;
      showOnly(loginView);
      throw new Error(data.error || 'Sesja wygasła. Zaloguj się ponownie.');
    }
    if (!response.ok) throw new Error(data.error || 'Wystąpił błąd. Spróbuj ponownie.');
    return data;
  }

  function renderStats() {
    const orders = state.orders;
    $('#stat-total').textContent = String(orders.length);
    $('#stat-new').textContent = String(orders.filter(order => order.work_status === 'new').length);
    $('#stat-progress').textContent = String(orders.filter(order => order.work_status === 'in_progress').length);
    $('#stat-missing').textContent = String(orders.filter(order => !order.intake_submitted_at).length);
    $('#loaded-count').textContent = String(orders.length);
    $('#results-count').textContent = orders.length ? 'Opłacone zamówienia PRO / ELITE / planów indywidualnych' : 'Brak pasujących klientów';
  }

  function renderOrders() {
    renderStats();
    if (!state.orders.length) {
      clientList.innerHTML = '<div class="empty-state">Nie znaleziono klientów dla wybranych filtrów.<br>Usuń filtr lub zmień wyszukiwaną frazę.</div>';
      return;
    }
    clientList.innerHTML = state.orders.map(order => {
      const ref = escapeHtml(order.order_ref);
      const name = order.customer_name || order.customer_email || 'Klient bez danych';
      const submitted = Boolean(order.intake_submitted_at);
      return `<button class="client-row${state.selectedOrderRef === order.order_ref ? ' active' : ''}" type="button" data-order-ref="${ref}">
        <span class="client-row-top"><span class="client-name">${escapeHtml(name)}</span><span class="badge badge-status">${escapeHtml(statusLabels[order.work_status] || 'Nowy')}</span></span>
        <span class="client-product">${escapeHtml(order.product_name || order.product_key)} · ${escapeHtml(formatMoney(order.amount_minor, order.currency))}</span>
        <span class="client-email">${escapeHtml(order.customer_email || 'Brak e-maila')}</span>
        <span class="client-row-bottom"><span class="badge ${submitted ? 'badge-ok' : 'badge-missing'}">${submitted ? 'Ankieta wypełniona' : 'Brak ankiety'}</span><span class="row-date">${escapeHtml(formatDate(order.intake_submitted_at || order.paid_at || order.created_at))}</span></span>
      </button>`;
    }).join('');
  }

  function valueForDisplay(value) {
    if (value === null || value === undefined || value === '') return '<span class="data-empty">Nie podano</span>';
    if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
    if (Array.isArray(value)) return escapeHtml(value.map(item => equipmentLabels[item] || item).join(', '));
    if (typeof value === 'object') return renderObject(value);
    return escapeHtml(value);
  }
  function renderObject(object) {
    const entries = Object.entries(object || {}).filter(([, value]) => value !== null && value !== undefined && value !== '');
    if (!entries.length) return '<span class="data-empty">Nie podano</span>';
    return `<div class="data-object">${entries.map(([key, value]) => `<div class="data-object-row"><div>${escapeHtml(labels[key] || key)}</div><div>${valueForDisplay(value)}</div></div>`).join('')}</div>`;
  }
  function cell(label, value, wide = false) {
    return `<div class="data-cell${wide ? ' wide' : ''}"><span class="data-label">${escapeHtml(label)}</span><div class="data-value">${valueForDisplay(value)}</div></div>`;
  }
  function section(title, content) {
    return `<section class="detail-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
  }
  function renderDetail(data) {
    const order = data.order || {};
    const intake = data.intake || {};
    const profile = intake.profile || {};
    const health = intake.health || null;
    const tests = intake.maxTests || {};
    const details = intake.details || {};
    const equipment = Array.isArray(intake.equipmentItems) ? intake.equipmentItems : [];
    const profileHtml = `<div class="data-grid">${cell('Imię i nazwisko', profile.name || intake.name)}${cell('E-mail', profile.email || intake.email || order.customer_email)}${cell('Wiek', profile.age ?? intake.age)}${cell('Płeć', profile.gender || intake.gender)}${cell('Masa ciała (kg)', profile.bodyWeightKg ?? intake.bodyWeightKg)}${cell('Miejsce treningu', intake.trainingLocation)}${cell('Doświadczenie', intake.experience)}${cell('Treningi w tygodniu', intake.daysPerWeek)}${cell('Czas treningu (min)', intake.sessionMinutes)}</div>`;
    const generalHtml = `<div class="data-grid">${cell('Główny cel', intake.goal, true)}${cell('Cel mierzalny', intake.measurableGoal, true)}${cell('Obecny plan', intake.currentPlan, true)}${cell('Preferowany sprzęt', [...equipment.map(item => equipmentLabels[item] || item), intake.equipmentOther ? `Inny: ${intake.equipmentOther}` : ''].filter(Boolean).join(', ') || intake.equipment, true)}${cell('Pozostałe informacje', intake.difficulty, true)}</div>`;
    const testParts = [];
    if (tests.home) testParts.push(cell('Testy domowe', tests.home, true));
    if (tests.gym) testParts.push(cell('Testy siłowniane', tests.gym, true));
    const testsHtml = `<div class="data-grid">${testParts.length ? testParts.join('') : cell('Wyniki testów', null, true)}</div>`;
    const healthHtml = health ? `<div class="data-grid">${cell('Zgoda', health.consent)}${cell('Ból / uraz', health.pain)}${cell('Ograniczenie aktywności', health.restriction)}${cell('Opis ograniczeń', health.notes, true)}</div>` : '<div class="data-grid">' + cell('Informacje zdrowotne', 'Nie przekazano informacji w tej sekcji.', true) + '</div>';
    const detailsHtml = `<div class="data-grid">${Object.entries(details).map(([key, value]) => cell(labels[key] || key, value, true)).join('') || cell('Dodatkowe pytania', null, true)}</div>`;
    detailPanel.innerHTML = `
      <div class="detail-header"><div class="detail-title"><h2>${escapeHtml(profile.name || intake.name || order.customer_email || 'Karta klienta')}</h2><p>${escapeHtml(order.customer_email || intake.email || 'Brak adresu e-mail')}</p><div class="detail-order-meta"><span class="meta-chip">${escapeHtml(order.product_name || order.product_key)}</span><span class="meta-chip">Zamówienie ${escapeHtml(order.order_ref || '')}</span><span class="meta-chip">Opłacono: ${escapeHtml(formatDate(order.paid_at))}</span></div></div><div class="detail-price">${escapeHtml(formatMoney(order.amount_minor, order.currency))}</div></div>
      ${section('Profil klienta', profileHtml)}
      ${section('Cel i organizacja treningu', generalHtml)}
      ${section('Testy sprawnościowe', testsHtml)}
      ${section('Szczegóły pakietu', detailsHtml)}
      ${section('Informacje o ograniczeniach zdrowotnych', healthHtml)}
      <div class="detail-section"><div class="data-grid">${cell('Ankieta wysłana', formatDate(order.intake_submitted_at))}${cell('Utworzono zamówienie', formatDate(order.created_at))}${cell('Termin retencji danych', formatDate(order.retention_due_at))}</div></div>
      <form class="detail-form" id="trainer-edit-form">
        <h3>Wewnętrzna obsługa klienta</h3>
        <div><label for="work-status">Status współpracy</label><select id="work-status" name="work_status"><option value="new">Nowy</option><option value="in_progress">W trakcie</option><option value="waiting_client">Oczekuje na klienta</option><option value="ready">Gotowy</option><option value="completed">Zakończony</option></select></div>
        <div><label for="trainer-notes">Notatki trenera (prywatne)</label><textarea id="trainer-notes" name="trainer_notes" maxlength="5000" placeholder="Wpisz ustalenia, uwagi do planu lub kolejne kroki…"></textarea></div>
        <div class="detail-form-footer"><span class="save-state" id="save-state" role="status"></span><button class="button button-primary" type="submit">Zapisz zmiany</button></div>
      </form>`;
    $('#work-status').value = data.trainer?.work_status || 'new';
    $('#trainer-notes').value = data.trainer?.trainer_notes || '';
    $('#trainer-edit-form').addEventListener('submit', saveTrainerMeta);
  }

  async function loadOrders() {
    const params = new URLSearchParams();
    const query = $('#search-input').value.trim();
    const intake = $('#intake-filter').value;
    const workStatus = $('#status-filter').value;
    if (query) params.set('q', query);
    if (intake) params.set('intake', intake);
    if (workStatus) params.set('work_status', workStatus);
    clientList.classList.add('loading');
    try {
      const data = await api(`/api/trainer/orders?${params.toString()}`);
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      renderOrders();
      if (state.selectedOrderRef && state.orders.some(order => order.order_ref === state.selectedOrderRef)) {
        await openOrder(state.selectedOrderRef, false);
      } else if (state.selectedOrderRef) {
        state.selectedOrderRef = null;
        detailPanel.innerHTML = '<div class="detail-placeholder"><div class="placeholder-icon">SF</div><h2>Wybierz klienta</h2><p class="muted">Wybierz osobę z listy, aby otworzyć jej kartę.</p></div>';
      }
    } catch (error) {
      clientList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    } finally {
      clientList.classList.remove('loading');
    }
  }

  async function openOrder(orderRef, refreshList = true) {
    state.selectedOrderRef = orderRef;
    if (refreshList) renderOrders();
    detailPanel.classList.add('loading');
    detailPanel.innerHTML = '<div class="empty-state">Otwieranie karty klienta…</div>';
    try {
      const data = await api(`/api/trainer/order?order_ref=${encodeURIComponent(orderRef)}`);
      renderDetail(data);
      if (window.matchMedia('(max-width: 760px)').matches) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      detailPanel.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    } finally {
      detailPanel.classList.remove('loading');
    }
  }

  async function saveTrainerMeta(event) {
    event.preventDefault();
    const button = $('#trainer-edit-form button[type="submit"]');
    const status = $('#save-state');
    button.disabled = true;
    status.className = 'save-state';
    status.textContent = 'Zapisywanie…';
    try {
      await api('/api/trainer/order', {
        method: 'PATCH',
        body: JSON.stringify({
          order_ref: state.selectedOrderRef,
          work_status: $('#work-status').value,
          trainer_notes: $('#trainer-notes').value
        })
      });
      status.className = 'save-state success';
      status.textContent = 'Zapisano zmiany.';
      await loadOrders();
    } catch (error) {
      status.className = 'save-state error';
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function startDashboard() {
    showOnly(dashboardView);
    detailPanel.innerHTML = '<div class="detail-placeholder"><div class="placeholder-icon">SF</div><h2>Wybierz klienta</h2><p class="muted">Kliknij osobę z listy, aby otworzyć jej kartę.</p></div>';
    await loadOrders();
  }

  async function boot() {
    try {
      const response = await fetch('/api/trainer/session', { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 503) {
        $('#fatal-message').textContent = 'Brakuje konfiguracji panelu lub wymaganej migracji bazy. Ustaw sekrety i wykonaj plik SQL z aktualizacji.';
        showOnly(fatalView);
        return;
      }
      const data = await response.json();
      if (data.authenticated) await startDashboard();
      else showOnly(loginView);
    } catch {
      $('#fatal-message').textContent = 'Nie udało się połączyć z API panelu. Sprawdź deployment Cloudflare Pages.';
      showOnly(fatalView);
    }
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('#login-form button[type="submit"]');
    const error = $('#login-error');
    button.disabled = true;
    button.textContent = 'Sprawdzanie…';
    error.textContent = '';
    try {
      await api('/api/trainer/login', { method: 'POST', body: JSON.stringify({ password: $('#trainer-password').value }) });
      $('#trainer-password').value = '';
      await startDashboard();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Zaloguj się';
    }
  });
  $('#logout-button').addEventListener('click', async () => {
    try { await fetch('/api/trainer/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' }); } catch {}
    state.orders = [];
    state.selectedOrderRef = null;
    showOnly(loginView);
  });
  $('#refresh-button').addEventListener('click', loadOrders);
  $('#client-list').addEventListener('click', event => {
    const button = event.target.closest('[data-order-ref]');
    if (button) openOrder(button.dataset.orderRef);
  });
  $('#search-input').addEventListener('input', () => {
    clearTimeout(state.debounce);
    state.debounce = setTimeout(loadOrders, 250);
  });
  $('#intake-filter').addEventListener('change', loadOrders);
  $('#status-filter').addEventListener('change', loadOrders);
  boot();
})();
