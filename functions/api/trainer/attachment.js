import { json } from '../../_shared/stripe.js';
import { requireTrainer } from '../../_shared/trainer-auth.js';

function encodedFilename(value) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(String(value || 'zalacznik'))}`;
}

export async function onRequestGet({ request, env }) {
  const auth = await requireTrainer({ request, env });
  if (!auth.ok) return auth.response;
  if (!env.PRODUCT_FILES) return json({ error: 'Magazyn załączników nie jest skonfigurowany.' }, 503);
  const url = new URL(request.url);
  const orderRef = url.searchParams.get('order_ref') || '';
  const fileId = url.searchParams.get('file_id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(orderRef) || !/^[0-9a-f-]{36}$/i.test(fileId)) return json({ error: 'Nieprawidłowy identyfikator pliku.' }, 400);
  try {
    const file = await env.DB.prepare(`SELECT f.object_key, f.file_name, f.content_type
      FROM sf_intake_files f JOIN sf_orders o ON o.order_ref = f.order_ref
      WHERE f.file_id = ? AND f.order_ref = ? AND o.payment_status = 'paid'`).bind(fileId, orderRef).first();
    if (!file) return json({ error: 'Nie znaleziono załącznika.' }, 404);
    const object = await env.PRODUCT_FILES.get(file.object_key);
    if (!object) return json({ error: 'Plik nie jest już dostępny.' }, 404);
    return new Response(object.body, { headers: {
      'Content-Type': file.content_type || 'application/octet-stream',
      'Content-Disposition': encodedFilename(file.file_name),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    } });
  } catch (error) {
    console.error('Trainer attachment download failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się pobrać załącznika.' }, 503);
  }
}
