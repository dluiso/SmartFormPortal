import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { ProcessStatus } from '@prisma/client';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;

  // Auth
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { userId: string; tenantId: string };
  try {
    payload = verifyAccessToken(token) as { userId: string; tenantId: string };
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, tenantId } = payload;

  // Load the process template
  const template = await prisma.processTemplate.findFirst({
    where: { id: templateId, tenantId, isActive: true },
    select: { id: true, publicUrl: true, name: true },
  });

  if (!template) {
    return NextResponse.json({ error: 'Process not found' }, { status: 404 });
  }

  // Load user's publicId (used as portal_user_id in LF)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Create the ProcessInstance (idempotent: reuse existing DRAFT/PENDING)
  let instance = await prisma.processInstance.findFirst({
    where: {
      userId,
      tenantId,
      processTemplateId: templateId,
      status: { in: [ProcessStatus.DRAFT, ProcessStatus.PENDING] },
    },
    select: { id: true },
  });

  if (!instance) {
    instance = await prisma.processInstance.create({
      data: {
        tenantId,
        userId,
        processTemplateId: templateId,
        status: ProcessStatus.PENDING,
      },
      select: { id: true },
    });

    // Log the application start
    await prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        action: 'process_applied',
        entityType: 'ProcessInstance',
        entityId: instance.id,
        details: { templateId, templateName: template.name },
      },
    });
  }

  // Build the Laserfiche URL with portal_user_id query param
  let lfUrl: string;
  try {
    const url = new URL(template.publicUrl);
    url.searchParams.set('portal_user_id', user.publicId);
    lfUrl = url.toString();
  } catch {
    // publicUrl may not be a full URL (relative or blank) — fall back as-is
    lfUrl = template.publicUrl;
  }

  return NextResponse.json({ instanceId: instance.id, url: lfUrl });
}
