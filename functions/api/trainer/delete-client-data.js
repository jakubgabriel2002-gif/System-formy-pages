import { json } from '../../_shared/stripe.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

export async function onRequestDelete({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  if (!env.PRODUCT_FILES) return json({ error: 'Magazyn plików nie jest skonfigurowany.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const orderRef = String(body?.order_ref || '').trim();
  const confirmation = String(body?.confirmation || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(orderRef)) return json({ error: 'Nieprawidłowy numer zamówienia.' }, 400);
  if (confirmation !== 'USUŃ DANE') return json({ error: 'Brak prawidłowego potwierdzenia usunięcia.' }, 400);

  try {
    // Zamówienie, e-mail płatnika, kwota, waluta i status płatności pozostają bez zmian.
    const order = await env.DB.prepare("SELECT order_ref FROM sf_orders WHERE order_ref = ? AND payment_status = 'paid' AND product_key <> 'start'").bind(orderRef).first();
    if (!order) return json({ error: 'Nie znaleziono opłaconego zamówienia klienta.' }, 404);

    const files = await env.DB.prepare('SELECT object_key FROM sf_intake_files WHERE order_ref = ?').bind(orderRef).all();
    const keys = (files.results || []).map(row => row.object_key).filter(key => typeof key === 'string' && key.startsWith(`intake-files/${orderRef}/`));

    // Najpierw usuń prywatne obiekty R2. Jeżeli operacja się nie powiedzie, rekordy D1 pozostają,
    // dzięki czemu można bezpiecznie ponowić próbę.
    if (keys.length) await env.PRODUCT_FILES.delete(keys);

    await env.DB.batch([
      env.DB.prepare('DELETE FROM sf_intake_submissions WHERE order_ref = ?').bind(orderRef),
      env.DB.prepare('DELETE FROM sf_intake_files WHERE order_ref = ?').bind(orderRef),
      env.DB.prepare('DELETE FROM sf_elite_goal_cards WHERE order_ref = ?').bind(orderRef),
      env.DB.prepare('DELETE FROM sf_trainer_meta WHERE order_ref = ?').bind(orderRef),
      env.DB.prepare('DELETE FROM sf_trainer_workflow_status WHERE order_ref = ?').bind(orderRef),
      env.DB.prepare('UPDATE sf_orders SET intake_json = NULL, intake_submitted_at = NULL, updated_at = ? WHERE order_ref = ?').bind(new Date().toISOString(), orderRef)
    ]);

    return json({ ok: true, deleted_files: keys.length, message: 'Dane treningowe i powiązane pliki zostały usunięte. Zamówienie i historia płatności pozostały.' });
  } catch (error) {
    console.error('Trainer client data deletion failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się w pełni usunąć danych. Sprawdź połączenie z D1 i R2, a następnie spróbuj ponownie.' }, 503);
  }
}
