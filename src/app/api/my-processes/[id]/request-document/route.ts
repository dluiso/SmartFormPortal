/**
 * Creates a one-time, time-limited download token for a document stored in the LF repository.
 * The token expires in 15 minutes and can only be used once.
 */
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';

const TOKEN_TTL_MINUTES = 15;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instanceId } = await params;
    const headersList = await headers();
    const userId   = headersList.get('x-user-id') || '';
    const tenantId = headersList.get('x-tenant-id') || '';

    // Load instance with template and LF API connection
    const instance = await prisma.processInstance.findFirst({
      where: { id: instanceId, userId, tenantId },
      include: {
        processTemplate: {
          include: { lfApiConnection: true },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }
    if (instance.status !== ProcessStatus.APPROVED && instance.status !== ProcessStatus.REJECTED) {
      return NextResponse.json({ error: 'Document only available for completed processes' }, { status: 400 });
    }
    if (!instance.lfDocumentEntryId || instance.lfDocumentEntryId === '0') {
      return NextResponse.json({ error: 'No document available for this process' }, { status: 404 });
    }
    if (!instance.processTemplate.lfApiConnection) {
      return NextResponse.json({ error: 'LF API connection not configured for this process' }, { status: 400 });
    }
    if (!instance.processTemplate.lfApiConnection.isActive) {
      return NextResponse.json({ error: 'LF API connection is inactive' }, { status: 400 });
    }

    // Clean up any existing unused, expired tokens for this instance+user
    await prisma.documentDownloadToken.deleteMany({
      where: { instanceId, userId, usedAt: null, expiresAt: { lt: new Date() } },
    });

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    const token = await prisma.documentDownloadToken.create({
      data: {
        tenantId,
        userId,
        instanceId,
        lfEntryId: instance.lfDocumentEntryId,
        lfApiConnectionId: instance.processTemplate.lfApiConnection.id,
        expiresAt,
      },
    });

    return NextResponse.json({
      token: token.id,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    console.error('[REQUEST-DOCUMENT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
