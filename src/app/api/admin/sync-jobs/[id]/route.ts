import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  cronExpression: z.string().optional(),
  isActive: z.boolean().optional(),
  circuitOpen: z.boolean().optional(),
  failureCount: z.number().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await prisma.syncJob.updateMany({
    where: { id, tenantId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.syncJob.findUnique({
    where: { id },
    include: {
      dbConnection: { select: { id: true, name: true, serverAddress: true, databaseName: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userId = headersList.get('x-user-id') || '';

  const job = await prisma.syncJob.findFirst({ where: { id, tenantId } });
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.syncJob.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      tenantId,
      userId,
      action: 'sync_job_deleted',
      entityType: 'SyncJob',
      entityId: id,
      details: {},
    },
  });

  return NextResponse.json({ success: true });
}
