import { CATALOG } from '../_shared/catalog.js';
import { json, retrieveCheckoutSession } from '../_shared/stripe.js';
import { isSameOrigin } from '../_shared/trainer-auth.js';

const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = {
  pdf: { contentType: 'application/pdf', label: 'PDF' },
  doc: { contentType: 'application/msword', label: 'DOC' },
  docx: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  odt: { contentType: 'application/vnd.oasis.opendocument.text', label: 'ODT' },
  txt: { contentType: 'text/plain; charset=utf-8', label: 'TXT' }
};

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  if (!env.DB || !env.STRIPE_SECRET_KEY || !env.PRODUCT_FILES) return json({ error: 'Przesyłanie załączników nie jest skonfigurowane.' }, 503);
  let form;
  try { form = await request.formData(); } catch { return json({ error: 'Nie udało się odczytać pliku.' }, 400); }
  const sessionId = String(form.get('session_id') || '');
  const file = form.get('file');
  if (!sessionId || !file || typeof file.arrayBuffer !== 'function') return json({ error: 'Wybierz plik do przesłania.' }, 400);
  if (file.size < 1 || file.size > MAX_BYTES) return json({ error: 'Plik musi mieć maksymalnie 10 MB.' }, 413);
  try {
    const session = await retrieveCheckoutSession(env, sessionId);
    if (session.payment_status !== 'paid') return json({ error: 'Załączniki są dostępne po potwierdzeniu płatności.' }, 402);
    const productKey = session.metadata?.product_key;
    const orderRef = session.metadata?.order_ref;
    const product = CATALOG[productKey];
    if (!product || !['elite','individual-basic','individual-monitor','individual-full'].includes(productKey) || !orderRef) {
      return json({ error: 'Załącznik nie jest dostępny w zakupionym produkcie.' }, 403);
    }
    const order = await env.DB.prepare(`SELECT payment_status FROM sf_orders WHERE order_ref = ? AND session_id = ?`).bind(orderRef, session.id).first();
    if (!order || order.payment_status !== 'paid') return json({ error: 'Nie znaleziono opłaconego zamówienia.' }, 403);
    const existingFiles = await env.DB.prepare('SELECT COUNT(*) AS total FROM sf_intake_files WHERE order_ref = ?').bind(orderRef).first();
    if (Number(existingFiles?.total || 0) >= 5) return json({ error: 'Do jednego zamówienia można dodać maksymalnie 5 plików.' }, 413);
    const suppliedName = String(file.name || 'zalacznik').split(/[\\/]/).pop().slice(0, 160);
    const extension = suppliedName.includes('.') ? suppliedName.split('.').pop().toLowerCase() : '';
    const type = FILE_TYPES[extension];
    if (!type) return json({ error: 'Dozwolone formaty: PDF, DOC, DOCX, ODT i TXT.' }, 415);
    const fileId = crypto.randomUUID();
    const safeName = suppliedName.normalize('NFKC').replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\s+/g, '_').slice(-140) || `zalacznik.${extension}`;
    const objectKey = `intake-files/${orderRef}/${fileId}`;
    const bytes = await file.arrayBuffer();
    await env.PRODUCT_FILES.put(objectKey, bytes, {
      httpMetadata: { contentType: type.contentType, cacheControl: 'private, no-store' },
      customMetadata: { orderRef, fileId, kind: 'training_plan' }
    });
    const uploadedAt = new Date().toISOString();
    try {
      await env.DB.prepare(`INSERT INTO sf_intake_files (file_id, order_ref, object_key, file_name, content_type, size_bytes, kind, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, 'training_plan', ?)`)
        .bind(fileId, orderRef, objectKey, safeName, type.contentType, file.size, uploadedAt).run();
    } catch (error) {
      await env.PRODUCT_FILES.delete(objectKey).catch(() => {});
      throw error;
    }
    return json({ ok: true, file: { file_id: fileId, file_name: safeName, content_type: type.contentType, size_bytes: file.size, kind: 'training_plan' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SESSION') return json({ error: 'Nieprawidłowa sesja płatności.' }, 400);
    console.error('Intake file upload failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Nie udało się zapisać załącznika. Spróbuj ponownie.' }, 502);
  }
}
