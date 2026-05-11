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

    // Debug: log exactly what entry ID we're using
    console.log('[DOCUMENT-DOWNLOAD] lfEntryId value:', JSON.stringify(dlToken.lfEntryId), 'type:', typeof dlToken.lfEntryId);

    // Fetch document from LF FIRST so the token is not consumed on a failed download
    const lfResponse = await fetchLfDocument(dlToken.lfApiConnection, dlToken.lfEntryId);

    // Guard: if LF somehow returned JSON (error body with 200), surface it as an error
    const contentType = lfResponse.headers.get('Content-Type') || 'application/octet-stream';
    if (contentType.toLowerCase().includes('application/json')) {
      const body = await lfResponse.text().catch(() => '');
      throw new Error(`LF returned JSON instead of a document file: ${body.slice(0, 300)}`);
    }

    // Determine filename from LF Content-Disposition header
    const contentDisposition = lfResponse.headers.get('Content-Disposition') || '';
    const filename = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '')
      || `document_${dlToken.instanceId.slice(0, 8)}.pdf`;

    // Mark token as used only after we know the document is valid
    await prisma.documentDownloadToken.update({
      where: { id: token },
      data: { usedAt: new Date() },
    });

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
