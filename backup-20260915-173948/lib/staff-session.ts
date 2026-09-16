/**
 * Staff session cookie for /kitchen.
 *
 * A signed, expiring token — not a password stored in the browser. The PIN is
 * checked once on the server; after that the cookie carries only an expiry and
 * an HMAC over it, so a tampered cookie fails verification rather than
 * extending its own life.
 *
 * Uses Web Crypto (not node:crypto) so the same module runs in edge middleware
 * and in node route handlers.
 */

const enc = new TextEncoder()
export const STAFF_COOKIE = 'ji_staff'

/** How long a kitchen iPad stays signed in. Long, because re-entering a PIN
 *  mid-service is exactly when staff prop the door open instead. */
export const SESSION_DAYS = 30

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
}

function secret(): string | null {
  const s = process.env.STAFF_SESSION_SECRET
  // A short secret is worse than an obvious failure, because it looks like it works.
  if (!s || s.length < 32) return null
  return s
}

/** Creates `<expiryMs>.<signature>`. */
export async function signSession(ttlMs = SESSION_DAYS * 86_400_000): Promise<string | null> {
  const s = secret()
  if (!s) return null
  const exp = String(Date.now() + ttlMs)
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(s), enc.encode(exp))
  return `${exp}.${b64url(sig)}`
}

/** Constant-time-ish compare. Avoids leaking the signature byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const s = secret()
  if (!s || !token) return false

  const [exp, sig] = token.split('.')
  if (!exp || !sig) return false
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false

  const expected = b64url(await crypto.subtle.sign('HMAC', await hmacKey(s), enc.encode(exp)))
  return safeEqual(sig, expected)
}

/** Is staff auth configured at all? Used to fail closed, loudly, rather than open. */
export function staffAuthConfigured(): boolean {
  // Five digits minimum. Four is 10,000 combinations; a rate limit is then
  // the only thing between an attacker and the kitchen screen.
  return Boolean(secret() && process.env.STAFF_PIN && String(process.env.STAFF_PIN).length >= 5)
}
