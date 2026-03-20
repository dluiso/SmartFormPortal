import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '25'));
  const search = url.searchParams.get('search') ?? '';
  const severity = url.searchParams.get('severity') ?? '';
  const action = url.searchParams.get('action') ?? '';

  const where = {
    tenantId,
    ...(severity ? { severity: severity as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' } : {}),
    ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' as const } },
            { entityType: { contains: search, mode: 'insensitive' as const } },
            { entityId: { contains: search, mode: 'insensitive' as const } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
