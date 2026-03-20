import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 1) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Derive a fixed 32-byte key via SHA-256 so any-length ENCRYPTION_KEY works safely
  return crypto.createHash('sha256').update(key, 'utf8').digest();
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns a base64 string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-CBC encrypted string produced by encrypt().
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Creates a SHA-256 hash (for non-sensitive identifiers).
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
