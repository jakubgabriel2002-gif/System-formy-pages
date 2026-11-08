import { json } from '../../_shared/http.js';
import { isSameOrigin, requireTrainer } from '../../_shared/trainer-auth.js';

export async function onRequestDelete({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Nieprawidłowe żądanie.' }, 400); }
  const orderRef = String(body?.order_ref || '').trim();
  // Porównanie odporne na brak polskich znaków i wielkość liter (np. "usun dane" z klawiatury telefonu).
  const confirmation = String(body?.confirmation || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(orderRef)) return json({ error: 'Nieprawidłowy numer zamówienia.' }, 400);
  if (confirmation !== 'USUN DANE') return json({ error: 'Brak prawidłowego potwierdzenia usunięcia.' }, 400);

  try {
    // Zamówienie, e-mail płatnika, kwota, waluta i status płatności pozostają bez zmian.
    const order = await env.DB.prepare("SELECT order_ref FROM sf_orders WHERE order_ref = ? AND payment_status IN ('paid','unverified') AND product_key <> 'start'").bind(orderRef).first();
    if (!order) return json({ error: 'Nie znaleziono opłaconego zamówienia klienta.' }, 404);

    const files = await env.DB.prepare('SELECT object_key FROM sf_intake_files WHERE order_ref = ?').bind(orderRef).all();
    const keys = (files.results || []).map(row => row.object_key).filter(key => typeof key === 'string' && key.startsWith(`intake-files/${orderRef}/`));

    // Najpierw usuń prywatne obiekty R2. Jeżeli operacja się nie powiedzie, rekordy D1 pozostają,
    // dzięki czemu można bezpiecznie ponowić próbę.
    // Magazyn R2 jest potrzebny tylko wtedy, gdy klient ma załączniki.
    if (keys.length) {
      if (!env.PRODUCT_FILES) return json({ error: 'Klient ma załączniki, a magazyn plików R2 nie jest podłączony (binding PRODUCT_FILES). Dane nie zostały usunięte.' }, 503);
      try { await env.PRODUCT_FILES.delete(keys); }
      catch (error) {
        console.error('Trainer client data deletion failed (R2)', error instanceof Error ? error.name : 'unknown');
        return json({ error: 'Nie udało się usunąć załączników z magazynu plików. Dane nie zostały usunięte — spróbuj ponownie.' }, 503);
      }
    }

    const now = new Date().toISOString();
    try {
      // Najpierw tabele zależne, na końcu ankieta; klucze obce sprawdzane na końcu transakcji.
      await env.DB.batch([
        env.DB.prepare('PRAGMA defer_foreign_keys = on'),
        env.DB.prepare('DELETE FROM sf_intake_files WHERE order_ref = ?').bind(orderRef),
        env.DB.prepare('DELETE FROM sf_elite_goal_cards WHERE order_ref = ?').bind(orderRef),
        env.DB.prepare('DELETE FROM sf_trainer_meta WHERE order_ref = ?').bind(orderRef),
        env.DB.prepare('DELETE FROM sf_trainer_workflow_status WHERE order_ref = ?').bind(orderRef),
        env.DB.prepare('DELETE FROM sf_intake_submissions WHERE order_ref = ?').bind(orderRef),
        env.DB.prepare('UPDATE sf_orders SET intake_json = NULL, intake_submitted_at = NULL, updated_at = ? WHERE order_ref = ?').bind(now, orderRef)
      ]);
    } catch (error) {
      console.error('Trainer client data deletion failed (D1)', error instanceof Error ? error.message : 'unknown');
      return json({ error: 'Załączniki usunięto, ale nie udało się usunąć danych z bazy. Spróbuj ponownie.' }, 503);
    }

    // Ukrycie zamówienia na liście panelu (zamówienie i płatność zostają w bazie).
    // Wymaga kolumny trainer_hidden_at — bez niej usuwanie działa, a rekord po prostu zostaje na liście.
    let hidden = false;
    try {
      const result = await env.DB.prepare('UPDATE sf_orders SET trainer_hidden_at = ? WHERE order_ref = ?').bind(now, orderRef).run();
      hidden = Number(result.meta?.changes || 0) === 1;
    } catch (error) {
      console.error('Trainer order hide skipped', error instanceof Error ? error.name : 'unknown');
    }

    return json({ ok: true, hidden, deleted_files: keys.length, message: 'Dane treningowe i powiązane pliki zostały usunięte. Zamówienie i historia płatności pozostały.' });
  } catch (error) {
    console.error('Trainer client data deletion failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się usunąć danych. Spróbuj ponownie.' }, 503);
  }
}
