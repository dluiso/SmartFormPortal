/**
 * HMAC-signed license status cookie (Edge Runtime compatible).
 * Format: base64(JSON.stringify({ok, exp})).hmacSig
 * Prevents client-side forgery — requires JWT_SECRET to sign/verify.
 */

const TTL_SECONDS = 3600; // 1 hour

interface LicenseCachePayload {
  ok: boolean;
  exp: number; // Unix timestamp
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, sig: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

export const LICENSE_COOKIE_NAME = 'sfp_license';

export async function makeLicenseCookieValue(valid: boolean, secret: string): Promise<string> {
  const payload: LicenseCachePayload = {
    ok: valid,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const b64 = btoa(JSON.stringify(payload));
  const sig = await hmacSign(b64, secret);
  return `${b64}.${sig}`;
}

/**
 * Returns:
 *  true  — license valid (signed, not expired, ok=true)
 *  false — license explicitly invalid (signed, not expired, ok=false)
 *  null  — cookie absent/tampered/expired → caller must re-check DB
 */
export async function readLicenseCookie(value: string, secret: string): Promise<boolean | null> {
  try {
    const dotIdx = value.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const b64 = value.slice(0, dotIdx);
    const sig = value.slice(dotIdx + 1);
    if (!(await hmacVerify(b64, sig, secret))) return null;
    const { ok, exp } = JSON.parse(atob(b64)) as LicenseCachePayload;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return ok;
  } catch {
    return null;
  }
}
