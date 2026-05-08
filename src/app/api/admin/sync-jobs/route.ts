import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  dbConnectionId: z.string().min(1, 'DB connection required'),
  cronExpression: z.string().default('*/30 * * * *'),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';

  const syncJobs = await prisma.syncJob.findMany({
    where: { tenantId },
    include: {
      dbConnection: { select: { id: true, name: true, serverAddress: true, databaseName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(syncJobs);
}

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userId = headersList.get('x-user-id') || '';

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify dbConnection belongs to this tenant
  const conn = await prisma.dbConnection.findFirst({
    where: { id: parsed.data.dbConnectionId, tenantId },
  });
  if (!conn) {
    return NextResponse.json({ error: 'DB connection not found' }, { status: 404 });
  }

  const syncJob = await prisma.syncJob.create({
    data: { tenantId, ...parsed.data },
    include: {
      dbConnection: { select: { id: true, name: true, serverAddress: true, databaseName: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      tenantId,
      userId,
      action: 'sync_job_created',
      entityType: 'SyncJob',
      entityId: syncJob.id,
      details: { cronExpression: syncJob.cronExpression, dbConnection: conn.name },
    },
  });

  return NextResponse.json(syncJob, { status: 201 });
}
