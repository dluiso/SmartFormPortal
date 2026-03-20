import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.headers.get('x-user-id') || '';

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
