import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || '';
  const tenantId = req.headers.get('x-tenant-id') || '';

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        readAt: true,
        actionUrl: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, tenantId, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
