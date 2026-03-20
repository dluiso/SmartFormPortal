import { cookies } from 'next/headers';
import { verifyAccessToken, JWTPayload } from './jwt';

export const ACCESS_TOKEN_COOKIE = 'sfp_access_token';
export const REFRESH_TOKEN_COOKIE = 'sfp_refresh_token';

/**
 * Gets the current authenticated session from cookies.
 * Returns null if not authenticated or token is invalid/expired.
 */
export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return null;
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Cookie options for access token.
 */
export function getAccessTokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  };
}

/**
 * Cookie options for refresh token.
 */
export function getRefreshTokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
