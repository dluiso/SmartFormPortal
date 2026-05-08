import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { syncInstance } from '@/lib/laserfiche/syncEngine';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id') || '';
    const tenantId = headersList.get('x-tenant-id') || '';

    const instance = await prisma.processInstance.findFirst({
      where: { id, userId, tenantId },
      include: {
        processTemplate: {
          include: { dbConnection: true },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // If no DB connection configured, nothing to sync
    if (!instance.processTemplate.dbConnection) {
      return NextResponse.json({ synced: false, message: 'No sync source configured' });
    }

    // Run sync immediately (synchronous) so status is up-to-date before we respond
    const syncResult = await syncInstance(id, tenantId);

    // Also queue a BullMQ job for any follow-up background processing
    let queued = false;
    try {
      const { getSyncQueue } = await import('@/lib/queues/syncQueue');
      const queue = getSyncQueue();
      await queue.add(
        'sync-instance',
        { instanceId: id, tenantId, userId },
        { jobId: `sync-${id}`, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
      queued = true;
    } catch {
      // BullMQ/Redis not available — that's OK, sync already ran synchronously above
    }

    // Return the freshly-synced instance data
    const updated = await prisma.processInstance.findUnique({
      where: { id },
      include: {
        processTemplate: { include: { category: true, department: true } },
      },
    });

    return NextResponse.json({ queued, synced: syncResult.synced, instance: updated });
  } catch (error) {
    console.error('[SYNC] Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

