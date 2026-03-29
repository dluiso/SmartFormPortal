import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken, sign2FAPendingToken } from '@/lib/auth/jwt';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/session';
import { generateToken } from '@/lib/auth/encryption';
import { SystemRole } from '@prisma/client';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional().default('default'),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? '0.0.0.0';
    const rl = await checkRateLimit(RateLimits.login(ip));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.resetAt - Math.floor(Date.now() / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const { email, password, tenantSlug } = loginSchema.parse(body);

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Find user — use parameterized query via Prisma (safe from SQL injection)
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: email.toLowerCase().trim() },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt !== null) {
      // Constant-time response to prevent user enumeration
      await fakePasswordCheck();
      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked', code: 'ACCOUNT_LOCKED' },
        { status: 403 }
      );
    }

    // Check account status
    if (user.status === 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'Please verify your email address before logging in', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      );
    }
    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Account is inactive', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      const failedCount = user.failedLoginCount + 1;
      const shouldLock = failedCount >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
        },
      });

      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'auth.login.failed',
          entityType: 'User',
          entityId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          severity: shouldLock ? 'WARNING' : 'INFO',
          details: { reason: 'invalid_password', attempt: failedCount },
        },
      });

      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Determine system role (highest priority role)
    const systemRole = getHighestRole(user.roles.map((ur) => ur.role.systemRole));

    // If 2FA is enabled, issue a short-lived pending token and prompt for TOTP code
    if (user.twoFactorEnabled) {
      const pendingToken = sign2FAPendingToken({
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        systemRole,
        publicId: user.publicId,
      });
      const response = NextResponse.json({ requires2FA: true });
      response.cookies.set('2fa_pending', pendingToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== 'false',
        sameSite: 'strict',
        maxAge: 5 * 60, // 5 minutes
        path: '/',
      });
      return response;
    }

    // Create session record
    const sessionToken = generateToken(48);
    const refreshToken = signRefreshToken({
      userId: user.id,
      sessionId: sessionToken,
    });

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: sessionToken,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Log successful login
    await prisma.activityLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        systemRole,
        action: 'auth.login.success',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        severity: 'INFO',
      },
    });

    // Sign JWT
    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      systemRole,
      publicId: user.publicId,
    });

    // Build response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        publicId: user.publicId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        systemRole,
        preferredLanguage: user.preferredLanguage,
        darkMode: user.darkMode,
      },
    });

    // Set HTTP-only cookies
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions());
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getHighestRole(roles: SystemRole[]): SystemRole {
  const priority: Record<SystemRole, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    STAFF: 2,
    CLIENT: 1,
  };
  return roles.reduce(
    (highest, role) => (priority[role] > priority[highest] ? role : highest),
    SystemRole.CLIENT
  );
}

// Constant-time fake check to prevent timing attacks on user enumeration
async function fakePasswordCheck() {
  await verifyPassword('fake_password', '$2a$12$fakehashforenumerationprotection000000000000000');
}
