/**
 * TOTP (Time-based One-Time Password) utilities using otplib.
 * Used for two-factor authentication.
 */

import { authenticator } from 'otplib';

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
  step: 30,  // 30-second window
};

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SmartFormPortal';

/**
 * Generate a new TOTP secret for a user.
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret(20); // 20 bytes = 160-bit key
}

/**
 * Build the otpauth URI for QR code generation.
 */
export function buildTotpUri(secret: string, email: string, issuer?: string): string {
  return authenticator.keyuri(email, issuer ?? APP_NAME, secret);
}

/**
 * Verify a TOTP code against a secret.
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
