import jwt from 'jsonwebtoken';
import { SystemRole } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  systemRole: SystemRole;
  publicId: string;
}

export interface RefreshPayload {
  userId: string;
  sessionId: string;
}

/** Short-lived payload issued after password check when 2FA is required */
export interface TwoFAPendingPayload {
  userId: string;
  tenantId: string;
  email: string;
  systemRole: SystemRole;
  publicId: string;
  twoFAPending: true;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return secret;
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '8h',
    issuer: 'smartformportal',
    audience: payload.tenantId,
  });
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d',
    issuer: 'smartformportal',
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, getSecret(), {
    issuer: 'smartformportal',
  });
  return decoded as JWTPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, getSecret(), {
    issuer: 'smartformportal',
  });
  return decoded as RefreshPayload;
}

export function sign2FAPendingToken(payload: Omit<TwoFAPendingPayload, 'twoFAPending'>): string {
  return jwt.sign(
    { ...payload, twoFAPending: true },
    getSecret(),
    { expiresIn: '5m', issuer: 'smartformportal' }
  );
}

export function verify2FAPendingToken(token: string): TwoFAPendingPayload {
  const decoded = jwt.verify(token, getSecret(), { issuer: 'smartformportal' }) as TwoFAPendingPayload;
  if (!decoded.twoFAPending) throw new Error('Not a 2FA pending token');
  return decoded;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
