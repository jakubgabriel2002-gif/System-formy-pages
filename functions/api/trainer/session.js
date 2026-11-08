import { json } from '../../_shared/http.js';
import { isTrainerAuthenticated, trainerConfigReady } from '../../_shared/trainer-auth.js';

export async function onRequestGet({ request, env }) {
  if (!trainerConfigReady(env)) return json({ configured: false, authenticated: false }, 503);
  return json({ configured: true, authenticated: await isTrainerAuthenticated(request, env) });
}
