import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';
import { hash } from '@/lib/auth/encryption';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    const rl = await checkRateLimit(RateLimits.resetPassword(token));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new reset link.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(rl.resetAt - Math.floor(Date.now() / 1000)) } }
      );
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const tokenHash = hash(token);
    const resetRecord = await prisma.passwordReset.findUnique({ where: { token: tokenHash } });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This link is invalid or has expired.', code: 'TOKEN_INVALID' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
      }),
      prisma.passwordReset.update({
        where: { token: tokenHash },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      prisma.userSession.deleteMany({ where: { userId: resetRecord.userId } }),
    ]);

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
