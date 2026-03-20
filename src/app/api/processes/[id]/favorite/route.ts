import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: processTemplateId } = await params;

  // Verify the process exists and is accessible to this user's tenant
  const process = await prisma.processTemplate.findFirst({
    where: { id: processTemplateId, tenantId: session.tenantId, isPublic: true },
  });
  if (!process) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.processFavorite.upsert({
    where: { userId_processTemplateId: { userId: session.userId, processTemplateId } },
    create: { userId: session.userId, processTemplateId, tenantId: session.tenantId },
    update: {},
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: processTemplateId } = await params;

  await prisma.processFavorite.deleteMany({
    where: { userId: session.userId, processTemplateId },
  });

  return NextResponse.json({ success: true });
}
