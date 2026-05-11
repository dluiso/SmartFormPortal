import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { testLfConnection } from '@/lib/laserfiche/repositoryApi';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const userRole = headersList.get('x-user-role') || '';
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const conn = await prisma.lfApiConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const result = await testLfConnection(conn);
    await prisma.lfApiConnection.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestSuccess: result.success, lastTestError: result.error ?? null },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[LF-API-TEST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
