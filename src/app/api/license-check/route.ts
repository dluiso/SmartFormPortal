import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// Must run in Node.js (not Edge) to access Prisma
export const runtime = 'nodejs';

export async function GET() {
  try {
    const license = await prisma.tenantLicense.findFirst({
      select: { isActive: true, expiresAt: true },
    });

    const valid =
      !!license?.isActive &&
      (!license.expiresAt || license.expiresAt > new Date());

    return NextResponse.json({ valid });
  } catch {
    // On DB error, fail open (don't block users)
    return NextResponse.json({ valid: true });
  }
}
