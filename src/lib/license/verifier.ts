/**
 * RSA-SHA256 signature verification for license payloads.
 * Runs in Node.js runtime (API routes, validator).
 * Uses the built-in `crypto` module — no extra dependencies.
 */

import crypto from 'crypto';

/**
 * Verifies a license payload's RSA-SHA256 signature.
 * @param payload  - The exact JS object that was signed (JSON.stringify is used internally)
 * @param signatureB64 - Base64-encoded RSA-SHA256 signature (node-forge format)
 * @param publicKeyPem - PEM-encoded RSA public key
 */
export function verifyLicenseSignature(
  payload: object,
  signatureB64: string,
  publicKeyPem: string
): boolean {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(payload));
    return verify.verify(publicKeyPem, signatureB64, 'base64');
  } catch {
    return false;
  }
}

/** Returns the configured RSA public key PEM, or null if not set. */
export function getLicensePublicKey(): string | null {
  const b64 = process.env.SMFP_LICENSE_PUBLIC_KEY_B64;
  if (!b64) return null;
  try {
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}
