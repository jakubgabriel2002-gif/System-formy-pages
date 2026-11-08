import { json } from '../../_shared/http.js';
import { clearTrainerCookie, isSameOrigin } from '../../_shared/trainer-auth.js';

export async function onRequestPost({ request }) {
  if (!isSameOrigin(request)) return json({ error: 'Żądanie odrzucone.' }, 403);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': clearTrainerCookie()
    }
  });
}
