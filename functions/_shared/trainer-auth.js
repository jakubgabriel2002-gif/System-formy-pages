import { json } from './stripe.js';

const COOKIE_NAME = 'sf_trainer_session';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(password, usage) {
  // Jeden sekret konfiguracyjny: klucz sesji jest wyprowadzany z TRAINER_PASSWORD.
  // Zmiana hasła automatycznie unieważnia wszystkie wcześniej wystawione sesje.
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('SYSTEM-FORMY:TRAINER:PANEL:v1'),
      info: encoder.encode('session-cookie-signature')
    },
    material,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    usage
  );
}

async function sign(value, secret) {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function cookieValue(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return null;
}

export function trainerConfigReady(env) {
  return Boolean(env.DB && typeof env.TRAINER_PASSWORD === 'string' && env.TRAINER_PASSWORD.length >= 24);
}

export function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function createTrainerCookie(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sub: 'system-formy-trainer', iat: now, exp: now + SESSION_SECONDS })));
  const signature = await sign(payload, env.TRAINER_PASSWORD);
  return `${COOKIE_NAME}=${payload}.${signature}; Path=/api/trainer; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearTrainerCookie() {
  return `${COOKIE_NAME}=; Path=/api/trainer; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isTrainerAuthenticated(request, env) {
  if (!trainerConfigReady(env)) return false;
  const token = cookieValue(request);
  if (!token) return false;
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra !== undefined) return false;
  const suppliedBytes = fromBase64Url(suppliedSignature);
  if (!suppliedBytes) return false;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.TRAINER_PASSWORD, ['verify']), suppliedBytes, encoder.encode(payload));
  if (!valid) return false;
  const payloadBytes = fromBase64Url(payload);
  if (!payloadBytes) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(payloadBytes));
    const now = Math.floor(Date.now() / 1000);
    return data.sub === 'system-formy-trainer' && Number.isInteger(data.exp) && data.exp > now && data.iat <= now + 60;
  } catch {
    return false;
  }
}

export async function requireTrainer(context) {
  if (!trainerConfigReady(context.env)) return { ok: false, response: json({ error: 'Panel trenera nie jest skonfigurowany.' }, 503) };
  if (!(await isTrainerAuthenticated(context.request, context.env))) return { ok: false, response: json({ error: 'Sesja wygasła. Zaloguj się ponownie.' }, 401) };
  return { ok: true };
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function constantTimeStringMatch(a, b) {
  const left = encoder.encode(String(a));
  const right = encoder.encode(String(b));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}
