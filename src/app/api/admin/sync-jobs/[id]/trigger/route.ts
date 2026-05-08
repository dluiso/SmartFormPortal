import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { syncTenantInstances } from '@/lib/laserfiche/syncEngine';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';

  const syncJob = await prisma.syncJob.findFirst({ where: { id, tenantId } });
  if (!syncJob) {
    return NextResponse.json({ error: 'Sync job not found' }, { status: 404 });
  }

  const result = await syncTenantInstances(tenantId);

  const success = result.errors === 0;
  await prisma.syncJob.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      lastRunSuccess: success,
      recordsProcessed: result.synced,
      ...(success
        ? { failureCount: 0, circuitOpen: false }
        : { failureCount: { increment: 1 } }),
    },
  });

  return NextResponse.json({
    success,
    total: result.total,
    synced: result.synced,
    errors: result.errors,
  });
}
