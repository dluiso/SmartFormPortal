/**
 * Validates a one-time download token and proxies the document from LF.
 * Marks the token as used on first access, preventing reuse.
 */
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { fetchLfDocument } from '@/lib/laserfiche/repositoryApi';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id') || '';

    const dlToken = await prisma.documentDownloadToken.findUnique({
      where: { id: token },
      include: { lfApiConnection: true },
    });

    if (!dlToken) {
      return NextResponse.json({ error: 'Download link not found or already used' }, { status: 404 });
    }
    if (dlToken.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (dlToken.usedAt) {
      return NextResponse.json({ error: 'This download link has already been used' }, { status: 410 });
    }
    if (dlToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This download link has expired. Please request a new one.' }, { status: 410 });
    }

    // Mark as used BEFORE fetching to prevent race conditions
    await prisma.documentDownloadToken.update({
      where: { id: token },
      data: { usedAt: new Date() },
    });

    // Fetch document from LF
    const lfResponse = await fetchLfDocument(dlToken.lfApiConnection, dlToken.lfEntryId);

    // Determine content type and filename from LF response
    const contentType = lfResponse.headers.get('Content-Type') || 'application/octet-stream';
    const contentDisposition = lfResponse.headers.get('Content-Disposition') || '';
    const filename = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '')
      || `document_${dlToken.instanceId.slice(0, 8)}.pdf`;

    // Log the download activity
    await prisma.activityLog.create({
      data: {
        tenantId: dlToken.tenantId,
        userId: dlToken.userId,
        action: 'document_downloaded',
        entityType: 'ProcessInstance',
        entityId: dlToken.instanceId,
        details: { lfEntryId: dlToken.lfEntryId, lfApiConnectionId: dlToken.lfApiConnectionId },
      },
    });

    const body = await lfResponse.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[DOCUMENT-DOWNLOAD]', error);
    return NextResponse.json({ error: 'Failed to retrieve document. Please try again.' }, { status: 500 });
  }
}
