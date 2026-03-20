/**
 * POST /api/auth/2fa/verify
 * Verifies the TOTP code during the login 2FA challenge.
 * Reads the `2fa_pending` cookie to get the pending user context.
 * On success, issues the full access + refresh tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verify2FAPendingToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { getAccessTokenCookieOptions, getRefreshTokenCookieOptions, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/session';
import { decrypt } from '@/lib/auth/encryption';
import { verifyTotpCode } from '@/lib/auth/totp';
import { generateToken } from '@/lib/auth/encryption';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';

const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit 2FA attempts by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
    const rl = await checkRateLimit(RateLimits.login(ip));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const pendingRaw = cookieStore.get('2fa_pending')?.value ?? '';

    if (!pendingRaw) {
      return NextResponse.json({ error: 'No pending 2FA session', code: 'NO_PENDING_SESSION' }, { status: 401 });
    }

    let pending;
    try {
      pending = verify2FAPendingToken(pendingRaw);
    } catch {
      return NextResponse.json({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: pending.userId },
      select: {
        id: true,
        publicId: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        darkMode: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        status: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is not active', code: 'ACCOUNT_INACTIVE' }, { status: 403 });
    }

    const secret = decrypt(user.twoFactorSecret);
    if (!verifyTotpCode(parsed.data.code, secret)) {
      return NextResponse.json({ error: 'Invalid or expired code', code: 'INVALID_CODE' }, { status: 401 });
    }

    // TOTP verified — issue full tokens
    const sessionToken = generateToken(48);
    const refreshToken = signRefreshToken({ userId: user.id, sessionId: sessionToken });

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: sessionToken,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0 },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: pending.tenantId,
      email: user.email,
      systemRole: pending.systemRole,
      publicId: user.publicId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        publicId: user.publicId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        systemRole: pending.systemRole,
        preferredLanguage: user.preferredLanguage,
        darkMode: user.darkMode,
      },
    });

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions());
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions());
    // Clear the pending 2FA cookie
    response.cookies.set('2fa_pending', '', { httpOnly: true, maxAge: 0, path: '/' });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
