/**
 * POST /api/auth/2fa/enable
 * Verifies the TOTP code and enables 2FA for the authenticated user.
 * Must be called after /api/auth/2fa/setup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/encryption';
import { verifyTotpCode } from '@/lib/auth/totp';

const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 409 });
    }
    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: 'Run /api/auth/2fa/setup first' }, { status: 400 });
    }

    const secret = decrypt(user.twoFactorSecret);
    if (!verifyTotpCode(parsed.data.code, secret)) {
      return NextResponse.json({ error: 'Invalid or expired code', code: 'INVALID_CODE' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({ ok: true, message: 'Two-factor authentication is now enabled.' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
