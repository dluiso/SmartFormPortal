/**
 * User-facing ProcessInstance management.
 * GET: fetch a single instance with full details.
 * DELETE: cancel a DRAFT instance (form was never submitted).
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const userId   = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';

  const instance = await prisma.processInstance.findFirst({
    where: { id, userId, tenantId },
    include: {
      processTemplate: {
        include: { category: true, department: true },
      },
    },
  });

  if (!instance) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(instance);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await headers();
  const userId   = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';

  // Only allow deleting DRAFT instances (not-yet-submitted forms)
  const instance = await prisma.processInstance.findFirst({
    where: { id, userId, tenantId, status: ProcessStatus.DRAFT },
  });

  if (!instance) {
    return NextResponse.json(
      { error: 'Draft not found or already submitted' },
      { status: 404 }
    );
  }

  await prisma.processInstance.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      tenantId,
      userId,
      action: 'process_draft_cancelled',
      entityType: 'ProcessInstance',
      entityId: id,
      details: {},
    },
  });

  return NextResponse.json({ success: true });
}
