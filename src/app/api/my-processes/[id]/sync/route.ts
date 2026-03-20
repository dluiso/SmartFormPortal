import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';

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

    // Queue a sync job via BullMQ — use stable jobId to prevent duplicate queuing
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
      // BullMQ/Redis not available — sync job not enqueued
    }

    // Return the latest instance data
    const updated = await prisma.processInstance.findUnique({
      where: { id },
      include: {
        processTemplate: { include: { category: true, department: true } },
      },
    });

    return NextResponse.json({ queued, instance: updated });
  } catch (error) {
    console.error('[SYNC] Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

// Map raw LF status strings to our enum
export function mapLaserficheStatus(lfStatus: string): ProcessStatus {
  const s = lfStatus.toLowerCase();
  if (s.includes('approv') || s.includes('complet') || s.includes('done')) return ProcessStatus.APPROVED;
  if (s.includes('reject') || s.includes('deni')) return ProcessStatus.REJECTED;
  if (s.includes('review') || s.includes('pending') || s.includes('wait')) return ProcessStatus.IN_REVIEW;
  if (s.includes('cancel')) return ProcessStatus.CANCELLED;
  return ProcessStatus.IN_REVIEW;
}
