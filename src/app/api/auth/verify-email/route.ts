import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { hash } from '@/lib/auth/encryption';

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = schema.parse(body);

    const tokenHash = hash(token);
    const record = await prisma.emailVerification.findUnique({ where: { token: tokenHash } });

    if (!record || record.usedAt) {
      return NextResponse.json({ error: 'Invalid or expired verification link', code: 'INVALID_TOKEN' }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Verification link has expired', code: 'TOKEN_EXPIRED' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      }),
      prisma.emailVerification.update({
        where: { token: tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, message: 'Email verified. You can now log in.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
